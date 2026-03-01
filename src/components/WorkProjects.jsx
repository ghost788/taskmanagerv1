import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, SectionLabel, ProgressBar, Spinner } from './UI'

const RAG = {
  g: { label: 'On Track', color: 'var(--accent)', next: 'a' },
  a: { label: 'At Risk',  color: 'var(--amber)',  next: 'r' },
  r: { label: 'Blocker',  color: 'var(--red)',    next: 'g' },
}

const DEFAULT_PROJECTS = [
  {
    name: 'Shipping Charges Solution',
    meta: 'Target: Q2 2025',
    rag: 'g',
    milestones: [
      { text: 'Requirements & stakeholder alignment', phase: 'Discovery', done: true },
      { text: 'Source system mapping & data audit', phase: 'Discovery', done: true },
      { text: 'ETL pipeline design & dev', phase: 'Build', done: false },
      { text: 'Shipping charges calculation logic', phase: 'Build', done: false },
      { text: 'Finance UAT & sign-off', phase: 'Test', done: false },
      { text: 'Prod deployment & runbook', phase: 'Ship', done: false },
    ]
  },
  {
    name: 'Electronic Remittance BRD & Delivery',
    meta: 'Target: Q2 2025',
    rag: 'a',
    milestones: [
      { text: 'BRD drafted with business stakeholders', phase: 'Discovery', done: true },
      { text: 'Technical feasibility review', phase: 'Discovery', done: false },
      { text: 'Remittance format standardization (820/835)', phase: 'Build', done: false },
      { text: 'AP/AR system integration', phase: 'Build', done: false },
      { text: 'Pilot with 3 vendors', phase: 'Test', done: false },
      { text: 'Full rollout', phase: 'Ship', done: false },
    ]
  },
  {
    name: 'PO Snapshot & E2E Reconciliation Dashboard',
    meta: 'Target: Q3 2025',
    rag: 'a',
    milestones: [
      { text: 'PO data model & source systems audit', phase: 'Discovery', done: true },
      { text: 'Dashboard wireframes approved', phase: 'Discovery', done: false },
      { text: 'Real-time PO snapshot data pipeline', phase: 'Build', done: false },
      { text: '3-way match reconciliation logic', phase: 'Build', done: false },
      { text: 'Exception workflow & alerts', phase: 'Build', done: false },
      { text: 'Finance ops launch & training', phase: 'Ship', done: false },
    ]
  },
  {
    name: 'Inbound Agentic AI — Amazon Business',
    meta: 'Target: Q3 2025',
    rag: 'r',
    milestones: [
      { text: 'Use case definition & scope lock', phase: 'Discovery', done: false },
      { text: 'Amazon Business API access & auth setup', phase: 'Discovery', done: false },
      { text: 'Agent architecture (Amazon Bedrock)', phase: 'Build', done: false },
      { text: 'Inbound order handling & routing logic', phase: 'Build', done: false },
      { text: 'Human-in-the-loop review workflow', phase: 'Build', done: false },
      { text: 'Pilot run & feedback loop', phase: 'Test', done: false },
      { text: 'Production rollout', phase: 'Ship', done: false },
    ]
  },
]

export default function WorkProjects({ userId }) {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [openIds, setOpenIds] = useState(new Set())
  const [seeded, setSeeded] = useState(false)

  useEffect(() => { loadProjects() }, [userId])

  async function loadProjects() {
    setLoading(true)
    const { data: projectRows } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at')

    if (projectRows && projectRows.length > 0) {
      const { data: milestoneRows } = await supabase
        .from('milestones')
        .select('*')
        .eq('user_id', userId)
        .order('position')

      const merged = projectRows.map(p => ({
        ...p,
        milestones: milestoneRows?.filter(m => m.project_id === p.id) || []
      }))
      setProjects(merged)
      setOpenIds(new Set([merged[0]?.id]))
    } else if (!seeded) {
      await seedDefaults()
    }
    setLoading(false)
  }

  async function seedDefaults() {
    setSeeded(true)
    for (const [i, p] of DEFAULT_PROJECTS.entries()) {
      const { data: proj } = await supabase
        .from('projects')
        .insert({ user_id: userId, name: p.name, meta: p.meta, rag: p.rag })
        .select().single()
      if (!proj) continue
      const ms = p.milestones.map((m, j) => ({
        project_id: proj.id,
        user_id: userId,
        text: m.text,
        phase: m.phase,
        done: m.done,
        position: j,
      }))
      await supabase.from('milestones').insert(ms)
    }
    await loadProjects()
  }

  async function toggleMilestone(milestone) {
    const newDone = !milestone.done
    setProjects(prev => prev.map(p => ({
      ...p,
      milestones: p.milestones.map(m => m.id === milestone.id ? { ...m, done: newDone } : m)
    })))
    await supabase.from('milestones').update({ done: newDone }).eq('id', milestone.id)
  }

  async function cycleRag(project) {
    const newRag = RAG[project.rag].next
    setProjects(prev => prev.map(p => p.id === project.id ? { ...p, rag: newRag } : p))
    await supabase.from('projects').update({ rag: newRag }).eq('id', project.id)
  }

  async function saveNote(projectId, note) {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, note } : p))
    await supabase.from('projects').update({ note }).eq('id', projectId)
  }

  function toggleOpen(id) {
    setOpenIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return <Spinner />

  return (
    <div style={{ padding: '28px 32px' }}>
      <SectionLabel>WORK PROJECTS — P0</SectionLabel>
      {projects.map(project => {
        const isOpen = openIds.has(project.id)
        const done = project.milestones.filter(m => m.done).length
        const total = project.milestones.length
        const pct = total ? Math.round((done / total) * 100) : 0
        const rag = RAG[project.rag]

        return (
          <div key={project.id} style={styles.block} className="animate-in">
            {/* Header row */}
            <div style={styles.headerRow} onClick={() => toggleOpen(project.id)}>
              <div style={{ flex: 1 }}>
                <div style={styles.projectName}>{project.name}</div>
                <div style={styles.projectMeta}>{project.meta} &nbsp;·&nbsp; {done}/{total} milestones</div>
              </div>
              <button
                style={{ ...styles.ragBtn, color: rag.color }}
                onClick={e => { e.stopPropagation(); cycleRag(project) }}
              >
                <div style={{ ...styles.ragDot, background: rag.color }} />
                {rag.label}
              </button>
              <span style={{ ...styles.chevron, transform: isOpen ? 'rotate(90deg)' : 'none' }}>▶</span>
            </div>

            {/* Milestone panel */}
            {isOpen && (
              <div>
                {project.milestones.map(ms => (
                  <div key={ms.id} style={styles.msRow} onClick={() => toggleMilestone(ms)}>
                    <div style={{ ...styles.msBox, ...(ms.done ? styles.msBoxDone : {}) }}>
                      {ms.done && <span style={styles.msCheck}>✓</span>}
                    </div>
                    <span style={{ ...styles.msText, ...(ms.done ? styles.msTextDone : {}) }}>
                      {ms.text}
                    </span>
                    <span style={styles.msPhase}>{ms.phase}</span>
                  </div>
                ))}

                {/* Progress + notes */}
                <div style={styles.progressRow}>
                  <ProgressBar pct={pct} style={{ flex: 1 }} />
                  <span style={styles.pct}>{pct}%</span>
                </div>
                <div style={styles.notesRow}>
                  <input
                    style={styles.notesInput}
                    placeholder="Add note or blocker…"
                    defaultValue={project.note || ''}
                    onBlur={e => saveNote(project.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const styles = {
  block: {
    background: 'var(--s1)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    marginBottom: '10px',
    overflow: 'hidden',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    padding: '14px 18px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  projectName: { fontSize: '14px', fontWeight: '500' },
  projectMeta: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', marginTop: '2px' },
  ragBtn: {
    display: 'flex', alignItems: 'center', gap: '6px',
    background: 'none', border: 'none',
    fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.05em',
    padding: '4px 8px', borderRadius: '3px',
    transition: 'background 0.15s',
  },
  ragDot: { width: '7px', height: '7px', borderRadius: '50%' },
  chevron: { fontSize: '9px', color: 'var(--dim)', transition: 'transform 0.2s' },
  msRow: {
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '10px 18px',
    borderTop: '1px solid var(--border)',
    cursor: 'pointer',
    transition: 'background 0.1s',
  },
  msBox: {
    width: '15px', height: '15px',
    border: '1.5px solid var(--border2)',
    borderRadius: '2px',
    flexShrink: 0, marginTop: '1px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  msBoxDone: { background: 'var(--accent)', borderColor: 'var(--accent)' },
  msCheck: { fontSize: '9px', color: '#fff', fontWeight: '700', lineHeight: 1 },
  msText: { flex: 1, fontSize: '13px', lineHeight: 1.4 },
  msTextDone: { color: 'var(--dim)', textDecoration: 'line-through' },
  msPhase: {
    fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--dim)',
    padding: '2px 7px', background: 'var(--s2)', borderRadius: '2px',
    whiteSpace: 'nowrap', alignSelf: 'flex-start', marginTop: '1px',
  },
  progressRow: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '10px 18px', borderTop: '1px solid var(--border)',
    background: 'var(--s1)',
  },
  pct: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--mid)', whiteSpace: 'nowrap' },
  notesRow: {
    padding: '10px 18px', borderTop: '1px solid var(--border)',
    background: 'var(--s1)',
  },
  notesInput: {
    width: '100%', background: 'var(--s2)', border: '1px solid var(--border)',
    borderRadius: '3px', padding: '7px 11px',
    fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--text)',
    outline: 'none',
  },
}
