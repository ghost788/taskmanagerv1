import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, SectionLabel, ProgressBar, Spinner } from './UI'
import { EtaPicker } from './TodaySheet'
import { etaLabel, etaColor, today } from '../lib/dates'

const RAG = {
  g: { label: 'On Track', color: 'var(--accent)', next: 'a' },
  a: { label: 'At Risk',  color: 'var(--amber)',  next: 'r' },
  r: { label: 'Blocker',  color: 'var(--red)',    next: 'g' },
}
const PHASES = ['Discovery', 'Build', 'Test', 'Ship']

const DEFAULT_PROJECTS = [
  { name: 'Shipping Charges Solution', meta: 'Target: Q2 2025', rag: 'g', milestones: [
    { text: 'Requirements & stakeholder alignment', phase: 'Discovery', done: true },
    { text: 'Source system mapping & data audit',   phase: 'Discovery', done: true },
    { text: 'ETL pipeline design & dev',            phase: 'Build',     done: false },
    { text: 'Shipping charges calculation logic',   phase: 'Build',     done: false },
    { text: 'Finance UAT & sign-off',               phase: 'Test',      done: false },
    { text: 'Prod deployment & runbook',            phase: 'Ship',      done: false },
  ]},
  { name: 'Electronic Remittance BRD & Delivery', meta: 'Target: Q2 2025', rag: 'a', milestones: [
    { text: 'BRD drafted with business stakeholders',     phase: 'Discovery', done: true },
    { text: 'Technical feasibility review',               phase: 'Discovery', done: false },
    { text: 'Remittance format standardization (820/835)',phase: 'Build',     done: false },
    { text: 'AP/AR system integration',                   phase: 'Build',     done: false },
    { text: 'Pilot with 3 vendors',                       phase: 'Test',      done: false },
    { text: 'Full rollout',                               phase: 'Ship',      done: false },
  ]},
  { name: 'PO Snapshot & E2E Reconciliation Dashboard', meta: 'Target: Q3 2025', rag: 'a', milestones: [
    { text: 'PO data model & source systems audit',   phase: 'Discovery', done: true },
    { text: 'Dashboard wireframes approved',          phase: 'Discovery', done: false },
    { text: 'Real-time PO snapshot data pipeline',    phase: 'Build',     done: false },
    { text: '3-way match reconciliation logic',       phase: 'Build',     done: false },
    { text: 'Exception workflow & alerts',            phase: 'Build',     done: false },
    { text: 'Finance ops launch & training',          phase: 'Ship',      done: false },
  ]},
  { name: 'Inbound Agentic AI — Amazon Business', meta: 'Target: Q3 2025', rag: 'r', milestones: [
    { text: 'Use case definition & scope lock',        phase: 'Discovery', done: false },
    { text: 'Amazon Business API access & auth setup', phase: 'Discovery', done: false },
    { text: 'Agent architecture (Amazon Bedrock)',     phase: 'Build',     done: false },
    { text: 'Inbound order handling & routing logic',  phase: 'Build',     done: false },
    { text: 'Human-in-the-loop review workflow',       phase: 'Build',     done: false },
    { text: 'Pilot run & feedback loop',               phase: 'Test',      done: false },
    { text: 'Production rollout',                      phase: 'Ship',      done: false },
  ]},
]

// ─── Inline editable text ─────────────────────────────
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
    <span style={{ ...style, cursor: 'text', borderBottom: '1px dashed transparent', transition: 'border-color 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
      onClick={e => { e.stopPropagation(); setDraft(value); setEditing(true) }} title="Click to edit">
      {value || <span style={{ color: 'var(--dim)' }}>{placeholder}</span>}
    </span>
  )
  return <input ref={ref} value={draft} onChange={e => setDraft(e.target.value)} onBlur={commit}
    onClick={e => e.stopPropagation()}
    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commit() } if (e.key === 'Escape') { setEditing(false); setDraft(value) } }}
    style={{ background: 'var(--s2)', border: '1px solid var(--accent)', borderRadius: '3px', padding: '2px 6px', fontFamily: 'inherit', fontSize: 'inherit', color: 'var(--text)', outline: 'none', width: '100%', ...style }} />
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
  return <button style={{ ...S.iconBtn, color: 'var(--dim)', opacity: 0.4 }}
    onMouseEnter={e => e.currentTarget.style.opacity = 1}
    onMouseLeave={e => e.currentTarget.style.opacity = 0.4}
    onClick={e => { e.stopPropagation(); setConfirm(true) }}>✕</button>
}

// ─── ETA badge ────────────────────────────────────────
function EtaBadge({ eta, onSave }) {
  const [open, setOpen] = useState(false)
  const label = etaLabel(eta)
  const color = etaColor(eta, false)
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button style={{ ...S.etaBtn, color }} onClick={e => { e.stopPropagation(); setOpen(x => !x) }}>
        {label ? `📅 ${label}` : '+ ETA'}
      </button>
      {open && (
        <div style={S.etaPopover} onClick={e => e.stopPropagation()}>
          <EtaPicker value={eta} onChange={v => { onSave(v); setOpen(false) }} />
        </div>
      )}
    </div>
  )
}

// ─── Reassign modal ───────────────────────────────────
function ReassignModal({ action, projects, milestones, onSave, onClose }) {
  const [projectId, setProjectId]     = useState(action.project_id || '')
  const [milestoneId, setMilestoneId] = useState(action.milestone_id || '')
  const pMs = milestones.filter(m => m.project_id === projectId)

  async function submit() {
    if (!projectId) return
    await onSave(action, { project_id: projectId, milestone_id: milestoneId || null })
    onClose()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>REASSIGN ACTION</div>
        <div style={{ fontSize: '13px', color: 'var(--text)', marginBottom: '16px' }}>"{action.text}"</div>

        <div style={{ marginBottom: '12px' }}>
          <div style={S.fieldLabel}>PROJECT</div>
          <select style={S.select} value={projectId} onChange={e => { setProjectId(e.target.value); setMilestoneId('') }} autoFocus>
            <option value="">— Select project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {pMs.length > 0 && (
          <div style={{ marginBottom: '12px' }}>
            <div style={S.fieldLabel}>MILESTONE (optional)</div>
            <select style={S.select} value={milestoneId} onChange={e => setMilestoneId(e.target.value)}>
              <option value="">— Project level —</option>
              {pMs.map(m => <option key={m.id} value={m.id}>{m.text}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button style={S.btnPrimary} onClick={submit} disabled={!projectId}>Save</button>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Action row ───────────────────────────────────────
function ActionRow({ action, onToggle, onUpdate, onDelete, showMilestone, milestones, projects }) {
  const [showReassign, setShowReassign] = useState(false)
  const ms = milestones?.find(m => m.id === action.milestone_id)

  return (
    <>
      <div style={{ ...S.actionRow, opacity: action.done ? 0.6 : 1 }}>
        <div style={{ ...S.checkBox, ...(action.done ? S.checkBoxDone : {}) }} onClick={() => onToggle(action)}>
          {action.done && <span style={S.checkMark}>✓</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Editable value={action.text} onSave={text => onUpdate(action, { text })}
            style={{ fontSize: '13px', color: action.done ? 'var(--dim)' : 'var(--text)', textDecoration: action.done ? 'line-through' : 'none' }} />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
            {showMilestone && ms && <span style={S.msBadge}>↳ {ms.text}</span>}
            {action.recurring && <span style={S.recurBadge}>↻ {action.frequency}</span>}
          </div>
        </div>
        <EtaBadge eta={action.eta} onSave={v => onUpdate(action, { eta: v })} />
        <button style={{ ...S.iconBtn, fontSize: '13px', opacity: 0.5 }} onClick={() => setShowReassign(true)} title="Reassign to different project/milestone">↗</button>
        <DeleteBtn onConfirm={() => onDelete(action)} />
      </div>
      {showReassign && (
        <ReassignModal
          action={action}
          projects={projects || []}
          milestones={milestones || []}
          onSave={onUpdate}
          onClose={() => setShowReassign(false)}
        />
      )}
    </>
  )
}

// ─── Add action form ──────────────────────────────────
function AddActionForm({ onAdd, milestones = [], defaultMilestoneId = null }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [eta, setEta] = useState(null)
  const [msId, setMsId] = useState(defaultMilestoneId)

  async function submit() {
    if (!text.trim()) return
    await onAdd(text.trim(), eta, msId)
    setText(''); setEta(null); setMsId(defaultMilestoneId); setOpen(false)
  }

  if (!open) return <button style={S.addLineBtn} onClick={() => setOpen(true)}>+ Add action</button>
  return (
    <div style={S.inlineForm}>
      <input autoFocus style={{ ...S.inlineInput, flex: 1 }} placeholder="Action text…" value={text}
        onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
      {milestones.length > 0 && !defaultMilestoneId && (
        <select value={msId || ''} onChange={e => setMsId(e.target.value || null)} style={S.phaseSelect}>
          <option value="">Project level</option>
          {milestones.map(m => <option key={m.id} value={m.id}>{m.text.slice(0, 40)}</option>)}
        </select>
      )}
      <EtaPicker value={eta} onChange={setEta} />
      <Btn onClick={submit} style={{ padding: '5px 12px', fontSize: '11px' }}>Add</Btn>
      <button style={S.iconBtn} onClick={() => setOpen(false)}>✕</button>
    </div>
  )
}

// ─── Milestone row ────────────────────────────────────
function MilestoneRow({ ms, actions, onToggle, onUpdate, onDelete, onAddAction, onToggleAction, onUpdateAction, onDeleteAction, allMilestones, projects }) {
  const [showActions, setShowActions] = useState(false)
  const msActions = actions.filter(a => a.milestone_id === ms.id).sort(byEta)

  return (
    <div style={S.msBlock}>
      <div style={S.msRow}>
        <div style={{ ...S.checkBox, ...(ms.done ? S.checkBoxDone : {}) }} onClick={() => onToggle(ms)}>
          {ms.done && <span style={S.checkMark}>✓</span>}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Editable value={ms.text} onSave={text => onUpdate(ms, { text })}
            style={{ fontSize: '13px', color: ms.done ? 'var(--dim)' : 'var(--text)', textDecoration: ms.done ? 'line-through' : 'none' }} />
        </div>
        <select value={ms.phase} onChange={e => onUpdate(ms, { phase: e.target.value })}
          onClick={e => e.stopPropagation()} style={S.phaseSelect}>
          {PHASES.map(p => <option key={p}>{p}</option>)}
        </select>
        {/* ETA on milestone */}
        <EtaBadge eta={ms.eta} onSave={v => onUpdate(ms, { eta: v })} />
        <button style={{ ...S.iconBtn, color: msActions.length > 0 ? 'var(--accent)' : 'var(--dim)', fontSize: '11px' }}
          onClick={e => { e.stopPropagation(); setShowActions(x => !x) }}>
          ▸ {msActions.length > 0 ? msActions.length : ''}
        </button>
        <DeleteBtn onConfirm={() => onDelete(ms)} />
      </div>
      {showActions && (
        <div style={S.actionsNest}>
          {msActions.length === 0 && <div style={{ ...S.dimText, padding: '4px 0 2px' }}>No actions yet</div>}
          {msActions.map(a => <ActionRow key={a.id} action={a} onToggle={onToggleAction} onUpdate={onUpdateAction} onDelete={onDeleteAction} milestones={allMilestones} projects={projects} />)}
          <AddActionForm onAdd={(text, eta) => onAddAction(text, eta, ms.id)} />
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
  const [eta, setEta] = useState(null)
  async function submit() {
    if (!text.trim()) return
    await onAdd(text.trim(), phase, eta)
    setText(''); setEta(null); setOpen(false)
  }
  if (!open) return <button style={S.addLineBtn} onClick={() => setOpen(true)}>+ Add milestone</button>
  return (
    <div style={S.inlineForm}>
      <input autoFocus style={{ ...S.inlineInput, flex: 1 }} placeholder="Milestone text…" value={text}
        onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
      <select value={phase} onChange={e => setPhase(e.target.value)} style={S.phaseSelect}>
        {PHASES.map(p => <option key={p}>{p}</option>)}
      </select>
      <EtaPicker value={eta} onChange={setEta} />
      <Btn onClick={submit} style={{ padding: '5px 12px', fontSize: '11px' }}>Add</Btn>
      <button style={S.iconBtn} onClick={() => setOpen(false)}>✕</button>
    </div>
  )
}

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

// ─── Sort helper: ascending ETA (nulls last) ──────────
function byEta(a, b) {
  if (!a.eta && !b.eta) return 0
  if (!a.eta) return 1
  if (!b.eta) return -1
  return a.eta < b.eta ? -1 : a.eta > b.eta ? 1 : 0
}

// ─── Project card ─────────────────────────────────────
function ProjectCard({ project, milestones, actions, projects, onUpdate, onDelete, onAddMilestone, onToggleMilestone, onUpdateMilestone, onDeleteMilestone, onAddAction, onToggleAction, onUpdateAction, onDeleteAction }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState('milestones')

  const pMs = milestones.filter(m => m.project_id === project.id).sort(byEta)
  // All actions for this project (both project-level and milestone-level), sorted
  const allProjectActions = actions.filter(a => a.project_id === project.id).sort(byEta)
  // Project-level only (no milestone)
  const directActions = allProjectActions.filter(a => !a.milestone_id)

  const done = pMs.filter(m => m.done).length
  const pct = pMs.length ? Math.round(done / pMs.length * 100) : 0
  const rag = RAG[project.rag]

  return (
    <div style={S.card} className="animate-in">
      <div style={S.cardHeader} onClick={() => setOpen(x => !x)}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
            <Editable value={project.name} onSave={name => onUpdate(project, { name })} style={S.projectName} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Editable value={project.meta || ''} onSave={meta => onUpdate(project, { meta })} placeholder="Add target / owner…" style={S.projectMeta} />
            <span style={S.projectMeta}>· {done}/{pMs.length} ms</span>
            {allProjectActions.length > 0 && <span style={S.projectMeta}>· {allProjectActions.filter(a => a.done).length}/{allProjectActions.length} actions</span>}
          </div>
        </div>
        <button style={{ ...S.ragBtn, color: rag.color }} onClick={e => { e.stopPropagation(); onUpdate(project, { rag: RAG[project.rag].next }) }}>
          <div style={{ ...S.ragDot, background: rag.color }} />{rag.label}
        </button>
        <span style={{ ...S.chevron, transform: open ? 'rotate(90deg)' : 'none' }}>▶</span>
        <DeleteBtn onConfirm={() => onDelete(project)} />
      </div>

      <div style={S.progressStrip}>
        <ProgressBar pct={pct} style={{ flex: 1 }} />
        <span style={S.pct}>{pct}%</span>
      </div>

      {open && (
        <>
          <div style={S.tabBar}>
            {[
              { id: 'milestones', label: 'Milestones',  count: pMs.length },
              { id: 'actions',    label: 'All Actions', count: allProjectActions.length },
              { id: 'notes',      label: 'Notes',       count: null },
            ].map(t => (
              <button key={t.id} style={{ ...S.tab, ...(tab === t.id ? S.tabActive : {}) }} onClick={() => setTab(t.id)}>
                {t.label}{t.count !== null && <span style={S.tabBadge}>{t.count}</span>}
              </button>
            ))}
          </div>

          <div style={S.tabBody}>
            {/* Milestones tab — sorted by ETA */}
            {tab === 'milestones' && (
              <>
                {pMs.length === 0 && <div style={{ ...S.dimText, padding: '8px 0 4px' }}>No milestones yet</div>}
                {pMs.map(ms => (
                  <MilestoneRow key={ms.id} ms={ms} actions={actions}
                    onToggle={onToggleMilestone} onUpdate={onUpdateMilestone} onDelete={onDeleteMilestone}
                    onAddAction={onAddAction} onToggleAction={onToggleAction}
                    onUpdateAction={onUpdateAction} onDeleteAction={onDeleteAction}
                    allMilestones={milestones} projects={projects} />
                ))}
                <AddMilestoneForm onAdd={(text, phase, eta) => onAddMilestone(project.id, text, phase, pMs.length, eta)} />
              </>
            )}

            {/* All actions tab — milestone actions + project actions merged, sorted by ETA */}
            {tab === 'actions' && (
              <>
                {allProjectActions.length === 0 && <div style={{ ...S.dimText, padding: '8px 0 4px' }}>No actions yet</div>}
                {allProjectActions.map(a => (
                  <ActionRow key={a.id} action={a}
                    onToggle={onToggleAction} onUpdate={onUpdateAction} onDelete={onDeleteAction}
                    showMilestone={true} milestones={pMs} projects={projects} />
                ))}
                {/* Add action — can assign to any milestone or project level */}
                <AddActionForm
                  onAdd={(text, eta, msId) => onAddAction(text, eta, msId, project.id)}
                  milestones={pMs}
                />
              </>
            )}

            {tab === 'notes' && <NoteField project={project} onSave={note => onUpdate(project, { note })} />}
          </div>
        </>
      )}
    </div>
  )
}

function AddProjectForm({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [meta, setMeta] = useState('')
  async function submit() {
    if (!name.trim()) return
    await onAdd(name.trim(), meta.trim())
    setName(''); setMeta(''); setOpen(false)
  }
  if (!open) return <button style={S.addProjectBtn} onClick={() => setOpen(true)}>+ New Project</button>
  return (
    <div style={{ ...S.card, padding: '16px 18px' }}>
      <div style={{ ...S.dimText, marginBottom: '10px' }}>NEW PROJECT</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <input autoFocus style={S.inlineInput} placeholder="Project name…" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        <input style={S.inlineInput} placeholder="Target / owner (optional)" value={meta} onChange={e => setMeta(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        <div style={{ display: 'flex', gap: '8px' }}><Btn onClick={submit}>Create Project</Btn><Btn variant="ghost" onClick={() => setOpen(false)}>Cancel</Btn></div>
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
      supabase.from('milestones').select('*').eq('user_id', userId).order('eta', { ascending: true, nullsFirst: false }),
      supabase.from('actions').select('*').eq('user_id', userId).order('eta', { ascending: true, nullsFirst: false }),
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
      const { data: proj } = await supabase.from('projects').insert({ user_id: userId, name: p.name, meta: p.meta, rag: p.rag }).select().single()
      if (!proj) continue
      await supabase.from('milestones').insert(p.milestones.map((m, j) => ({ project_id: proj.id, user_id: userId, text: m.text, phase: m.phase, done: m.done, position: j })))
    }
    await load()
  }

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

  async function addMilestone(projectId, text, phase, position, eta) {
    const { data } = await supabase.from('milestones').insert({ user_id: userId, project_id: projectId, text, phase, done: false, position, eta: eta || null }).select().single()
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

  async function addAction(text, eta, milestoneId, projectId) {
    const pid = projectId || milestones.find(m => m.id === milestoneId)?.project_id
    if (!pid) return
    const { data } = await supabase.from('actions').insert({ user_id: userId, project_id: pid, milestone_id: milestoneId || null, text, done: false, eta: eta || null }).select().single()
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
    <div className="page-pad">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <SectionLabel style={{ marginBottom: 0 }}>WORK PROJECTS — P0</SectionLabel>
        <span style={S.dimText}>Click any name to edit inline</span>
      </div>
      {projects.map(p => (
        <ProjectCard key={p.id} project={p} milestones={milestones} actions={actions} projects={projects}
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

const S = {
  card: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', marginBottom: '10px', overflow: 'hidden' },
  cardHeader: { display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap' },
  projectName: { fontSize: '14px', fontWeight: '500' },
  projectMeta: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
  ragBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '10px', padding: '4px 8px', borderRadius: '3px', flexShrink: 0 },
  ragDot: { width: '7px', height: '7px', borderRadius: '50%' },
  chevron: { fontSize: '9px', color: 'var(--dim)', transition: 'transform 0.2s', flexShrink: 0 },
  progressStrip: { display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px 10px' },
  pct: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', whiteSpace: 'nowrap' },
  tabBar: { display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--s2)', overflowX: 'auto' },
  tab: { padding: '8px 14px', background: 'none', border: 'none', borderBottom: '2px solid transparent', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.15s', whiteSpace: 'nowrap' },
  tabActive: { color: 'var(--text)', borderBottomColor: 'var(--accent)', background: 'var(--s1)' },
  tabBadge: { background: 'var(--s3)', borderRadius: '2px', padding: '1px 5px', fontSize: '10px', color: 'var(--dim)' },
  tabBody: { padding: '12px 16px', borderTop: '1px solid var(--border)' },
  msBlock: { borderBottom: '1px solid var(--border)' },
  msRow: { display: 'flex', alignItems: 'center', gap: '8px', padding: '9px 4px', flexWrap: 'wrap' },
  checkBox: { width: '15px', height: '15px', flexShrink: 0, border: '1.5px solid var(--border2)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', marginTop: '1px' },
  checkBoxDone: { background: 'var(--accent)', borderColor: 'var(--accent)' },
  checkMark: { fontSize: '9px', color: '#fff', fontWeight: '700', lineHeight: 1 },
  actionsNest: { padding: '4px 4px 8px 28px', background: 'var(--bg)', borderTop: '1px solid var(--border)' },
  actionRow: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '9px 4px', borderBottom: '1px solid var(--border)', transition: 'opacity 0.15s' },
  phaseSelect: { background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '3px 6px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--dim)', outline: 'none', flexShrink: 0 },
  iconBtn: { background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--dim)', cursor: 'pointer', padding: '2px 5px', borderRadius: '3px', flexShrink: 0 },
  addLineBtn: { background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', cursor: 'pointer', padding: '8px 4px' },
  inlineForm: { display: 'flex', gap: '6px', alignItems: 'center', padding: '8px 4px', flexWrap: 'wrap' },
  inlineInput: { background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '6px 10px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none', minWidth: 0 },
  addProjectBtn: { width: '100%', padding: '12px', background: 'none', border: '1px dashed var(--border)', borderRadius: '4px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--dim)', cursor: 'pointer', textAlign: 'center', marginTop: '4px' },
  noteArea: { width: '100%', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '10px 12px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none', resize: 'vertical', lineHeight: 1.6 },
  etaBtn: { background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '10px', cursor: 'pointer', padding: '2px 4px', borderRadius: '2px', whiteSpace: 'nowrap' },
  etaPopover: { position: 'absolute', right: 0, top: '24px', zIndex: 30, background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '10px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: '220px' },
  msBadge: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--dim)', background: 'var(--s2)', padding: '1px 6px', borderRadius: '2px', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  recurBadge: { background: 'rgba(90,122,0,0.08)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '9px', padding: '1px 5px', borderRadius: '2px' },
  dimText: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '6px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
  modalTitle: { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--dim)', marginBottom: '8px' },
  fieldLabel: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '5px' },
  select: { width: '100%', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none' },
  btnPrimary: { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '3px', padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  btnGhost: { background: 'none', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--mid)', cursor: 'pointer' },
}
