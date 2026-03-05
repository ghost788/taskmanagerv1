import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, SectionLabel, Spinner } from './UI'
import { EtaPicker } from './TodaySheet'
import { etaLabel, etaColor, today } from '../lib/dates'

// ─── ETA chip ─────────────────────────────────────────
function EtaChip({ eta }) {
  if (!eta) return null
  const label = etaLabel(eta)
  const color = etaColor(eta, false)
  return <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color, padding: '1px 6px', background: 'var(--s2)', borderRadius: '2px', whiteSpace: 'nowrap' }}>📅 {label}</span>
}

// ─── Promote modal — assign inbox item to project/milestone ──
function PromoteModal({ item, projects, milestones, onPromote, onClose }) {
  const [projectId, setProjectId] = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [eta, setEta] = useState(item.eta)

  const pMs = milestones.filter(m => m.project_id === projectId)

  async function submit() {
    if (!projectId) return
    await onPromote(item, projectId, milestoneId || null, eta)
    onClose()
  }

  return (
    <div style={S.modalOverlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>ASSIGN TO PROJECT</div>
        <div style={{ ...S.dimText, marginBottom: '16px', fontSize: '13px', color: 'var(--text)' }}>"{item.text}"</div>

        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>PROJECT</div>
          <select style={S.select} value={projectId} onChange={e => { setProjectId(e.target.value); setMilestoneId('') }} autoFocus>
            <option value="">— Select project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {pMs.length > 0 && (
          <div style={S.fieldGroup}>
            <div style={S.fieldLabel}>MILESTONE (optional)</div>
            <select style={S.select} value={milestoneId} onChange={e => setMilestoneId(e.target.value)}>
              <option value="">— Project level —</option>
              {pMs.map(m => <option key={m.id} value={m.id}>{m.text}</option>)}
            </select>
          </div>
        )}

        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>ETA</div>
          <EtaPicker value={eta} onChange={setEta} />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <Btn onClick={submit} disabled={!projectId}>Move to Project</Btn>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Inbox item row ───────────────────────────────────
function InboxRow({ item, projects, milestones, onToggle, onDelete, onUpdateEta, onPromote }) {
  const [showPromote, setShowPromote] = useState(false)
  const [editEta, setEditEta] = useState(false)
  const project = projects.find(p => p.id === item.project_id)
  const milestone = milestones.find(m => m.id === item.milestone_id)

  return (
    <>
      <div style={{ ...S.row, opacity: item.done ? 0.55 : 1 }}>
        {/* Checkbox */}
        <div style={{ ...S.checkBox, ...(item.done ? S.checkBoxDone : {}) }} onClick={() => onToggle(item)}>
          {item.done && <span style={S.checkMark}>✓</span>}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--dim)' : 'var(--text)' }}>
            {item.text}
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' }}>
            <EtaChip eta={item.eta} />
            {project && (
              <span style={S.assignedBadge}>
                {project.name}{milestone ? ` › ${milestone.text.slice(0, 30)}` : ''}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
          {/* ETA edit */}
          <button style={S.actionBtn} onClick={() => setEditEta(x => !x)} title="Set ETA">📅</button>
          {/* Assign to project */}
          {!item.promoted && (
            <button style={{ ...S.actionBtn, color: 'var(--accent)' }} onClick={() => setShowPromote(true)} title="Assign to project">↗</button>
          )}
          {/* Delete */}
          <button style={{ ...S.actionBtn, color: 'var(--red)', opacity: 0.5 }}
            onClick={() => onDelete(item)} title="Delete">✕</button>
        </div>
      </div>

      {/* Inline ETA picker */}
      {editEta && (
        <div style={S.etaRow}>
          <EtaPicker value={item.eta} onChange={v => { onUpdateEta(item, v); setEditEta(false) }} />
        </div>
      )}

      {/* Promote modal */}
      {showPromote && (
        <PromoteModal
          item={item}
          projects={projects}
          milestones={milestones}
          onPromote={onPromote}
          onClose={() => setShowPromote(false)}
        />
      )}
    </>
  )
}

// ─── Quick capture bar ────────────────────────────────
function CaptureBar({ onAdd }) {
  const [text, setText] = useState('')
  const [eta, setEta] = useState(null)
  const [showEta, setShowEta] = useState(false)

  async function submit() {
    if (!text.trim()) return
    await onAdd(text.trim(), eta)
    setText(''); setEta(null); setShowEta(false)
  }

  return (
    <div style={S.captureWrap}>
      <div style={S.captureRow}>
        <input
          style={S.captureInput}
          placeholder="Capture a thought, task, or idea… (Enter to add)"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />
        <button style={S.etaToggleBtn} onClick={() => setShowEta(x => !x)} title="Set ETA">
          📅{eta ? ` ${etaLabel(eta)}` : ''}
        </button>
        <Btn onClick={submit} style={{ padding: '8px 16px' }}>Capture</Btn>
      </div>
      {showEta && (
        <div style={{ padding: '8px 0 0' }}>
          <EtaPicker value={eta} onChange={setEta} />
        </div>
      )}
    </div>
  )
}

// ─── Main Inbox component ─────────────────────────────
export default function Inbox({ userId }) {
  const [items, setItems]       = useState([])
  const [projects, setProjects] = useState([])
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('open') // 'open' | 'done' | 'assigned'

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    const [{ data: iRows }, { data: pRows }, { data: mRows }] = await Promise.all([
      supabase.from('inbox').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('projects').select('id,name').eq('user_id', userId).order('created_at'),
      supabase.from('milestones').select('id,text,project_id').eq('user_id', userId),
    ])
    setItems(iRows || [])
    setProjects(pRows || [])
    setMilestones(mRows || [])
    setLoading(false)
  }

  async function addItem(text, eta) {
    const { data } = await supabase.from('inbox')
      .insert({ user_id: userId, text, eta: eta || null, done: false })
      .select().single()
    if (data) setItems(prev => [data, ...prev])
  }

  async function toggleItem(item) {
    const done = !item.done
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, done } : x))
    await supabase.from('inbox').update({ done }).eq('id', item.id)
  }

  async function deleteItem(item) {
    setItems(prev => prev.filter(x => x.id !== item.id))
    await supabase.from('inbox').delete().eq('id', item.id)
  }

  async function updateEta(item, eta) {
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, eta } : x))
    await supabase.from('inbox').update({ eta }).eq('id', item.id)
  }

  async function promote(item, projectId, milestoneId, eta) {
    // Create a real action in the actions table
    await supabase.from('actions').insert({
      user_id: userId,
      project_id: projectId,
      milestone_id: milestoneId || null,
      text: item.text,
      eta: eta || null,
      done: false,
    })
    // Mark inbox item as promoted & assigned
    const updates = { promoted: true, project_id: projectId, milestone_id: milestoneId || null, eta: eta || null }
    setItems(prev => prev.map(x => x.id === item.id ? { ...x, ...updates } : x))
    await supabase.from('inbox').update(updates).eq('id', item.id)
  }

  if (loading) return <Spinner />

  const filtered = items.filter(item => {
    if (filter === 'open')     return !item.done && !item.promoted
    if (filter === 'assigned') return item.promoted
    if (filter === 'done')     return item.done
    return true
  })

  const openCount     = items.filter(i => !i.done && !i.promoted).length
  const assignedCount = items.filter(i => i.promoted).length
  const doneCount     = items.filter(i => i.done).length

  return (
    <div className="page-pad">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <SectionLabel style={{ marginBottom: '2px' }}>INBOX</SectionLabel>
          <div style={S.dimText}>Capture anything. Assign to a project when ready.</div>
        </div>
      </div>

      {/* Quick capture */}
      <CaptureBar onAdd={addItem} />

      {/* Filter tabs */}
      <div style={S.filterRow}>
        {[
          { id: 'open',     label: 'Open',     count: openCount },
          { id: 'assigned', label: 'Assigned', count: assignedCount },
          { id: 'done',     label: 'Done',     count: doneCount },
        ].map(f => (
          <button key={f.id} style={{ ...S.filterBtn, ...(filter === f.id ? S.filterBtnActive : {}) }} onClick={() => setFilter(f.id)}>
            {f.label} <span style={S.filterCount}>{f.count}</span>
          </button>
        ))}
      </div>

      {/* Item list */}
      <div style={S.list}>
        {filtered.length === 0 && (
          <div style={{ ...S.dimText, padding: '20px 16px', textAlign: 'center' }}>
            {filter === 'open' ? 'Inbox is clear ✓' : `No ${filter} items`}
          </div>
        )}
        {filtered.map(item => (
          <InboxRow
            key={item.id}
            item={item}
            projects={projects}
            milestones={milestones}
            onToggle={toggleItem}
            onDelete={deleteItem}
            onUpdateEta={updateEta}
            onPromote={promote}
          />
        ))}
      </div>
    </div>
  )
}

const S = {
  captureWrap: { background: 'var(--s1)', border: '1px solid var(--accent)', borderRadius: '4px', padding: '12px 14px', marginBottom: '16px' },
  captureRow: { display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' },
  captureInput: { flex: 1, minWidth: '200px', background: 'none', border: 'none', fontFamily: 'var(--sans)', fontSize: '14px', color: 'var(--text)', outline: 'none', padding: '4px 0' },
  etaToggleBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: '3px', padding: '5px 10px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--mid)', cursor: 'pointer', whiteSpace: 'nowrap' },
  filterRow: { display: 'flex', gap: '0', marginBottom: '12px', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' },
  filterBtn: { flex: 1, padding: '8px 12px', background: 'var(--s1)', border: 'none', borderRight: '1px solid var(--border)', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', transition: 'all 0.15s' },
  filterBtnActive: { background: 'var(--s2)', color: 'var(--text)', fontWeight: '600' },
  filterCount: { background: 'var(--s3)', borderRadius: '2px', padding: '1px 5px', fontSize: '10px' },
  list: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' },
  row: { display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '11px 14px', borderBottom: '1px solid var(--border)', transition: 'opacity 0.15s' },
  etaRow: { padding: '6px 14px 10px 38px', background: 'var(--s2)', borderBottom: '1px solid var(--border)' },
  checkBox: { width: '16px', height: '16px', flexShrink: 0, border: '1.5px solid var(--border2)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', marginTop: '2px' },
  checkBoxDone: { background: 'var(--accent)', borderColor: 'var(--accent)' },
  checkMark: { fontSize: '9px', color: '#fff', fontWeight: '700', lineHeight: 1 },
  actionBtn: { background: 'none', border: 'none', fontSize: '14px', cursor: 'pointer', padding: '3px 5px', borderRadius: '3px', color: 'var(--mid)', transition: 'opacity 0.15s' },
  assignedBadge: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--accent)', background: 'rgba(90,122,0,0.07)', padding: '1px 6px', borderRadius: '2px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fieldGroup: { marginBottom: '12px' },
  fieldLabel: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '6px' },
  select: { width: '100%', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '6px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
  modalTitle: { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--dim)', marginBottom: '8px' },
  dimText: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
}
