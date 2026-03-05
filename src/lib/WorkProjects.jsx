import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, Input, SectionLabel, ProgressBar, Spinner } from './UI'

// ─── Constants ───────────────────────────────────────
const RAG = {
  g: { label: 'On Track', color: 'var(--accent)', next: 'a' },
  a: { label: 'At Risk',  color: 'var(--amber)',  next: 'r' },
  r: { label: 'Blocker',  color: 'var(--red)',    next: 'g' },
}
const PHASES = ['Discovery', 'Build', 'Test', 'Ship']

const DEFAULT_PROJECTS = [
  {
    name: 'Shipping Charges Solution', meta: 'Target: Q2 2025', rag: 'g',
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
    name: 'Electronic Remittance BRD & Delivery', meta: 'Target: Q2 2025', rag: 'a',
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
    name: 'PO Snapshot & E2E Reconciliation Dashboard', meta: 'Target: Q3 2025', rag: 'a',
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
    name: 'Inbound Agentic AI — Amazon Business', meta: 'Target: Q3 2025', rag: 'r',
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

// ─── Inline editable text ────────────────────────────
function Editable({ value, onSave, style = {}, placeholder = 'Untitled' }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef()

  useEffect(() => { if (editing && ref.current) ref.current.focus() }, [editing])

  function commit() {
    setEditing(false)
    if (draft.trim() && draft.trim() !== value) onSave(draft.trim())
    else setDraft(value)
  }

  if (!editing) return (
    <span
      style={{ ...style, cursor: 'text', borderBottom: '1px dashed transparent', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
      onClick={e => { e.stopPropagation(); setDraft(value); setEditing(true) }}
      title="Click to edit"
    >{value || <span style={{ color: 'var(--dim)' }}>{placeholder}</span>}</span>
  )

  return (
    <input
      ref={ref}
      value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onClick={e => e.stopPropagation()}
      onKeyDown={e => {
        if (e.key === 'Enter') { e.preventDefault(); commit() }
        if (e.key === 'Escape') { setEditing(false); setDraft(value) }
      }}
      style={{
        background: 'var(--s2)', border: '1px solid var(--accent)',
        borderRadius: '3px', padding: '2px 6px',
        fontFamily: 'inherit', fontSize: 'inherit',
        color: 'var(--text)', outline: 'none', width: '100%',
        ...style,
      }}
    />
  )
}

// ─── Confirm delete ───────────────────────────────────
function DeleteBtn({ onConfirm }) {
  const [confirm, setConfirm] = useState(false)
  if (confirm) return (
    <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      <span style={S.dimText}>Sure?</span>
      <button style={{ ...S.iconBtn, color: 'var(--red)' }} onClick={e => { e.stopPropagation(); onConfirm() }}>Yes</button>
      <button style={S.iconBtn} onClick={e => { e.stopPropagation(); setConfirm(false) }}>No</button>
    </span>
  )
  return (
    <button
      style={{ ...S.iconBtn, color: 'var(--dim)', opacity: 0.4 }}
      onMouseEnter={e => e.currentTarget.style.opacity = 1}
      onMouseLeave={e => e.currentTarget.style.opacity = 0.4}
      onClick={e => { e.stopPropagation(); setConfirm(true) }}
      title="Delete"
    >✕</button>
  )
}

// ─── Action row ───────────────────────────────────────
function ActionRow({ action, onToggle, onUpdate, onDelete }) {
  return (
    <div style={S.actionRow}>
      <div style={{ ...S.checkBox, ...(action.done ? S.checkBoxDone : {}) }} onClick={() => onToggle(action)}>
        {action.done && <span style={S.checkMark}>✓</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Editable
          value={action.text}
          onSave={text => onUpdate(action, { text })}
          style={{
            fontSize: '12px',
            color: action.done ? 'var(--dim)' : 'var(--text)',
            textDecoration: action.done ? 'line-through' : 'none',
          }}
        />
        {action.due_date && (
          <div style={{ ...S.dimText, marginTop: '1px' }}>Due: {action.due_date}</div>
        )}
      </div>
      <DeleteBtn onConfirm={() => onDelete(action)} />
    </div>
  )
}

// ─── Add action form ──────────────────────────────────
function AddActionForm({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [due, setDue] = useState('')

  async function submit() {
    if (!text.trim()) return
    await onAdd(text.trim(), due || null)
    setText(''); setDue(''); setOpen(false)
  }

  if (!open) return (
    <button style={S.addLineBtn} onClick={() => setOpen(true)}>+ Add action</button>
  )
  return (
    <div style={S.inlineForm}>
      <input autoFocus style={{ ...S.inlineInput, flex: 1 }} placeholder="Action text…" value={text}
        onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
      <input type="date" style={{ ...S.inlineInput, width: '130px' }} value={due} onChange={e => setDue(e.target.value)} />
      <Btn onClick={submit} style={{ padding: '5px 12px', fontSize: '11px' }}>Add</Btn>
      <button style={S.iconBtn} onClick={() => setOpen(false)}>✕</button>
    </div>
  )
}

// ─── Milestone row ────────────────────────────────────
function MilestoneRow({ ms, actions, onToggle, onUpdate, onDelete, onAddAction, onToggleAction, onUpdateAction, onDeleteAction }) {
  const [showActions, setShowActions] = useState(false)
  const msActions = actions.filter(a => a.milestone_id === ms.id)

  return (
    <div style={S.msBlock}>
      <div style={S.msRow}>
        <div style={{ ...S.checkBox, ...(ms.done ? S.checkBoxDone : {}) }} onClick={() => onToggle(ms)}>
          {ms.done && <span style={S.checkMark}>✓</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Editable
            value={ms.text}
            onSave={text => onUpdate(ms, { text })}
            style={{
              fontSize: '13px',
              color: ms.done ? 'var(--dim)' : 'var(--text)',
              textDecoration: ms.done ? 'line-through' : 'none',
            }}
          />
        </div>
        <select value={ms.phase} onChange={e => onUpdate(ms, { phase: e.target.value })}
          onClick={e => e.stopPropagation()} style={S.phaseSelect}>
          {PHASES.map(p => <option key={p}>{p}</option>)}
        </select>
        <button
          style={{ ...S.iconBtn, color: msActions.length > 0 ? 'var(--accent)' : 'var(--dim)', fontSize: '11px' }}
          onClick={e => { e.stopPropagation(); setShowActions(x => !x) }}
          title={`${msActions.length} actions`}
        >
          ▸ {msActions.length > 0 ? msActions.length : ''}
        </button>
        <DeleteBtn onConfirm={() => onDelete(ms)} />
      </div>

      {showActions && (
        <div style={S.actionsNest}>
          {msActions.length === 0 && <div style={{ ...S.dimText, padding: '4px 0 2px' }}>No actions yet</div>}
          {msActions.map(a => (
            <ActionRow key={a.id} action={a} onToggle={onToggleAction} onUpdate={onUpdateAction} onDelete={onDeleteAction} />
          ))}
          <AddActionForm onAdd={(text, due) => onAddAction(text, due, ms.id)} />
        </div>
      )}
    </div>
  )
}

// ─── Add milestone form ───────────────────────────────
function AddMilestoneForm({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [phase, setPhase] = useState('Discovery')

  async function submit() {
    if (!text.trim()) return
    await onAdd(text.trim(), phase)
    setText(''); setOpen(false)
  }

  if (!open) return (
    <button style={S.addLineBtn} onClick={() => setOpen(true)}>+ Add milestone</button>
  )
  return (
    <div style={S.inlineForm}>
      <input autoFocus style={{ ...S.inlineInput, flex: 1 }} placeholder="Milestone text…" value={text}
        onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
      <select value={phase} onChange={e => setPhase(e.target.value)} style={S.phaseSelect}>
        {PHASES.map(p => <option key={p}>{p}</option>)}
      </select>
      <Btn onClick={submit} style={{ padding: '5px 12px', fontSize: '11px' }}>Add</Btn>
      <button style={S.iconBtn} onClick={() => setOpen(false)}>✕</button>
    </div>
  )
}

// ─── Notes field ─────────────────────────────────────
function NoteField({ project, onSave }) {
  const [val, setVal] = useState(project.note || '')
  const [saved, setSaved] = useState(false)
  function save() { onSave(val); setSaved(true); setTimeout(() => setSaved(false), 1500) }
  return (
    <div>
      <textarea style={S.noteArea} value={val} onChange={e => setVal(e.target.value)}
        placeholder="Notes, blockers, decisions, links…" rows={4} />
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '8px' }}>
        <Btn onClick={save} style={{ padding: '6px 14px', fontSize: '11px' }}>Save</Btn>
        {saved && <span style={S.dimText}>Saved ✓</span>}
      </div>
    </div>
  )
}

// ─── Project card ─────────────────────────────────────
function ProjectCard({ project, milestones, actions, onUpdate, onDelete, onAddMilestone, onToggleMilestone, onUpdateMilestone, onDeleteMilestone, onAddAction, onToggleAction, onUpdateAction, onDeleteAction }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('milestones')

  const pMs = milestones.filter(m => m.project_id === project.id)
  const pActions = actions.filter(a => a.project_id === project.id && !a.milestone_id)
  const allActions = actions.filter(a => a.project_id === project.id)
  const done = pMs.filter(m => m.done).length
  const pct = pMs.length ? Math.round(done / pMs.length * 100) : 0
  const rag = RAG[project.rag]

  return (
    <div style={S.card} className="animate-in">
      {/* Header */}
      <div style={S.cardHeader} onClick={() => setOpen(x => !x)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Editable value={project.name} onSave={name => onUpdate(project, { name })} style={S.projectName} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Editable value={project.meta || ''} onSave={meta => onUpdate(project, { meta })}
              placeholder="Add target / owner…" style={S.projectMeta} />
            <span style={S.projectMeta}>· {done}/{pMs.length} milestones</span>
            {allActions.length > 0 && (
              <span style={S.projectMeta}>· {allActions.filter(a => a.done).length}/{allActions.length} actions</span>
            )}
          </div>
        </div>
        <button style={{ ...S.ragBtn, color: rag.color }}
          onClick={e => { e.stopPropagation(); onUpdate(project, { rag: RAG[project.rag].next }) }}
          title="Click to cycle status">
          <div style={{ ...S.ragDot, background: rag.color }} />{rag.label}
        </button>
        <span style={{ ...S.chevron, transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
        <DeleteBtn onConfirm={() => onDelete(project)} />
      </div>

      {/* Progress */}
      <div style={S.progressStrip}>
        <ProgressBar pct={pct} style={{ flex: 1 }} />
        <span style={S.pct}>{pct}%</span>
      </div>

      {/* Expanded */}
      {open && (
        <>
          {/* Tab bar */}
          <div style={S.tabBar}>
            {[
              { id: 'milestones', label: 'Milestones', count: pMs.length },
              { id: 'actions',    label: 'Actions',    count: pActions.length },
              { id: 'notes',      label: 'Notes',      count: null },
            ].map(t => (
              <button key={t.id} style={{ ...S.tab, ...(tab === t.id ? S.tabActive : {}) }}
                onClick={() => setTab(t.id)}>
                {t.label}
                {t.count !== null && <span style={S.tabBadge}>{t.count}</span>}
              </button>
            ))}
          </div>

          <div style={S.tabBody}>
            {/* Milestones */}
            {tab === 'milestones' && (
              <>
                {pMs.length === 0 && <div style={{ ...S.dimText, padding: '8px 0 4px' }}>No milestones yet — add one below</div>}
                {pMs.map(ms => (
                  <MilestoneRow key={ms.id} ms={ms} actions={actions}
                    onToggle={onToggleMilestone} onUpdate={onUpdateMilestone} onDelete={onDeleteMilestone}
                    onAddAction={onAddAction} onToggleAction={onToggleAction}
                    onUpdateAction={onUpdateAction} onDeleteAction={onDeleteAction} />
                ))}
                <AddMilestoneForm onAdd={(text, phase) => onAddMilestone(project.id, text, phase, pMs.length)} />
              </>
            )}

            {/* Project-level actions */}
            {tab === 'actions' && (
              <>
                {pActions.length === 0 && <div style={{ ...S.dimText, padding: '8px 0 4px' }}>No project-level actions yet</div>}
                {pActions.map(a => (
                  <ActionRow key={a.id} action={a} onToggle={onToggleAction}
                    onUpdate={onUpdateAction} onDelete={onDeleteAction} />
                ))}
                <AddActionForm onAdd={(text, due) => onAddAction(text, due, null, project.id)} />
              </>
            )}

            {/* Notes */}
            {tab === 'notes' && <NoteField project={project} onSave={note => onUpdate(project, { note })} />}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Add project form ─────────────────────────────────
function AddProjectForm({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [meta, setMeta] = useState('')

  async function submit() {
    if (!name.trim()) return
    await onAdd(name.trim(), meta.trim())
    setName(''); setMeta(''); setOpen(false)
  }

  if (!open) return (
    <button style={S.addProjectBtn} onClick={() => setOpen(true)}>+ New Project</button>
  )
  return (
    <div style={{ ...S.card, padding: '16px 18px' }}>
      <div style={{ ...S.dimText, marginBottom: '10px' }}>NEW PROJECT</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input autoFocus style={S.inlineInput} placeholder="Project name…" value={name}
          onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        <input style={S.inlineInput} placeholder="Target / owner (optional)" value={meta}
          onChange={e => setMeta(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn onClick={submit}>Create Project</Btn>
          <Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Root component ───────────────────────────────────
export default function WorkProjects({ userId }) {
  const [projects, setProjects]     = useState([])
  const [milestones, setMilestones] = useState([])
  const [actions, setActions]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [seeded, setSeeded]         = useState(false)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    const [{ data: pRows }, { data: mRows }, { data: aRows }] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('milestones').select('*').eq('user_id', userId).order('position'),
      supabase.from('actions').select('*').eq('user_id', userId).order('created_at'),
    ])
    if (pRows && pRows.length > 0) {
      setProjects(pRows); setMilestones(mRows || []); setActions(aRows || [])
    } else if (!seeded) {
      setSeeded(true); await seedDefaults(); return
    }
    setLoading(false)
  }

  async function seedDefaults() {
    for (const p of DEFAULT_PROJECTS) {
      const { data: proj } = await supabase.from('projects')
        .insert({ user_id: userId, name: p.name, meta: p.meta, rag: p.rag }).select().single()
      if (!proj) continue
      await supabase.from('milestones').insert(
        p.milestones.map((m, j) => ({ project_id: proj.id, user_id: userId, text: m.text, phase: m.phase, done: m.done, position: j }))
      )
    }
    await load()
  }

  // Projects
  async function addProject(name, meta) {
    const { data } = await supabase.from('projects').insert({ user_id: userId, name, meta, rag: 'g' }).select().single()
    if (data) setProjects(p => [...p, data])
  }
  async function updateProject(project, changes) {
    setProjects(p => p.map(x => x.id === project.id ? { ...x, ...changes } : x))
    await supabase.from('projects').update(changes).eq('id', project.id)
  }
  async function deleteProject(project) {
    setProjects(p => p.filter(x => x.id !== project.id))
    setMilestones(m => m.filter(x => x.project_id !== project.id))
    setActions(a => a.filter(x => x.project_id !== project.id))
    await supabase.from('projects').delete().eq('id', project.id)
  }

  // Milestones
  async function addMilestone(projectId, text, phase, position) {
    const { data } = await supabase.from('milestones')
      .insert({ user_id: userId, project_id: projectId, text, phase, done: false, position }).select().single()
    if (data) setMilestones(m => [...m, data])
  }
  async function toggleMilestone(ms) {
    const done = !ms.done
    setMilestones(m => m.map(x => x.id === ms.id ? { ...x, done } : x))
    await supabase.from('milestones').update({ done }).eq('id', ms.id)
  }
  async function updateMilestone(ms, changes) {
    setMilestones(m => m.map(x => x.id === ms.id ? { ...x, ...changes } : x))
    await supabase.from('milestones').update(changes).eq('id', ms.id)
  }
  async function deleteMilestone(ms) {
    setMilestones(m => m.filter(x => x.id !== ms.id))
    setActions(a => a.filter(x => x.milestone_id !== ms.id))
    await supabase.from('milestones').delete().eq('id', ms.id)
  }

  // Actions
  async function addAction(text, due_date, milestoneId, projectId) {
    const pid = projectId || milestones.find(m => m.id === milestoneId)?.project_id
    if (!pid) return
    const { data } = await supabase.from('actions')
      .insert({ user_id: userId, project_id: pid, milestone_id: milestoneId || null, text, done: false, due_date: due_date || null })
      .select().single()
    if (data) setActions(a => [...a, data])
  }
  async function toggleAction(action) {
    const done = !action.done
    setActions(a => a.map(x => x.id === action.id ? { ...x, done } : x))
    await supabase.from('actions').update({ done }).eq('id', action.id)
  }
  async function updateAction(action, changes) {
    setActions(a => a.map(x => x.id === action.id ? { ...x, ...changes } : x))
    await supabase.from('actions').update(changes).eq('id', action.id)
  }
  async function deleteAction(action) {
    setActions(a => a.filter(x => x.id !== action.id))
    await supabase.from('actions').delete().eq('id', action.id)
  }

  if (loading) return <Spinner />

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <SectionLabel style={{ marginBottom: 0 }}>WORK PROJECTS — P0</SectionLabel>
        <span style={S.dimText}>Click any name or target to edit inline</span>
      </div>
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} milestones={milestones} actions={actions}
          onUpdate={updateProject} onDelete={deleteProject}
          onAddMilestone={addMilestone} onToggleMilestone={toggleMilestone}
          onUpdateMilestone={updateMilestone} onDeleteMilestone={deleteMilestone}
          onAddAction={addAction} onToggleAction={toggleAction}
          onUpdateAction={updateAction} onDeleteAction={deleteAction} />
      ))}
      <AddProjectForm onAdd={addProject} />
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────
const S = {
  card: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '10px', overflow: 'hidden' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', cursor: 'pointer', userSelect: 'none' },
  projectName: { fontSize: '14px', fontWeight: '500' },
  projectMeta: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
  ragBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '10px', padding: '4px 8px', borderRadius: '3px', flexShrink: 0 },
  ragDot: { width: '7px', height: '7px', borderRadius: '50%' },
  chevron: { fontSize: '9px', color: 'var(--dim)', transition: 'transform 0.2s', flexShrink: 0 },
  progressStrip: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px 10px' },
  pct: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', whiteSpace: 'nowrap' },
  tabBar: { display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--s2)' },
  tab: { padding: '8px 14px', background: 'none', border: 'none', borderBottom: '2px solid transparent', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s' },
  tabActive: { color: 'var(--text)', borderBottomColor: 'var(--accent)', background: 'var(--s1)' },
  tabBadge: { background: 'var(--s3)', borderRadius: '2px', padding: '1px 5px', fontSize: '10px', color: 'var(--dim)' },
  tabBody: { padding: '12px 16px', borderTop: '1px solid var(--border)' },
  msBlock: { borderBottom: '1px solid var(--border)' },
  msRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 4px' },
  checkBox: { width: '15px', height: '15px', flexShrink: 0, border: '1.5px solid var(--border2)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', marginTop: '1px' },
  checkBoxDone: { background: 'var(--accent)', borderColor: 'var(--accent)' },
  checkMark: { fontSize: '9px', color: '#fff', fontWeight: '700', lineHeight: 1 },
  actionsNest: { padding: '4px 4px 8px 28px', background: 'var(--bg)', borderTop: '1px solid var(--border)' },
  actionRow: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '7px 4px', borderBottom: '1px solid var(--border)' },
  phaseSelect: { background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '3px 6px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--dim)', outline: 'none', flexShrink: 0 },
  iconBtn: { background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--dim)', cursor: 'pointer', padding: '2px 5px', borderRadius: '3px', flexShrink: 0 },
  addLineBtn: { background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', cursor: 'pointer', padding: '8px 4px' },
  inlineForm: { display: 'flex', gap: '8px', alignItems: 'center', padding: '8px 4px', flexWrap: 'wrap' },
  inlineInput: { background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none', minWidth: 0 },
  addProjectBtn: { width: '100%', padding: '12px', background: 'none', border: '1px dashed var(--border)', borderRadius: '4px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--dim)', cursor: 'pointer', textAlign: 'center', marginTop: '4px' },
  noteArea: { width: '100%', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none', resize: 'vertical', lineHeight: 1.6 },
  dimText: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
}
