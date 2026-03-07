import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, SectionLabel, Spinner } from './UI'
import { EtaPicker } from './TodaySheet'
import { etaLabel, etaColor } from '../lib/dates'

function EtaChip({ eta }) {
  if (!eta) return null
  return <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: etaColor(eta, false), padding: '1px 6px', background: 'var(--s2)', borderRadius: '2px', whiteSpace: 'nowrap' }}>📅 {etaLabel(eta)}</span>
}

// ─── Assign modal ─────────────────────────────────────
function AssignModal({ item, projects, milestones, onAssign, onClose }) {
  const [projectId, setProjectId]     = useState('')
  const [milestoneId, setMilestoneId] = useState('')
  const [eta, setEta]                 = useState(item.eta)
  const pMs = milestones.filter(m => m.project_id === projectId)

  async function submit() {
    if (!projectId) return
    await onAssign(item, projectId, milestoneId || null, eta)
    onClose()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>ASSIGN TO PROJECT</div>
        <div style={{ fontSize: '13px', marginBottom: '16px', color: 'var(--text)' }}>"{item.text}"</div>

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

        <div style={{ marginBottom: '16px' }}>
          <div style={S.fieldLabel}>ETA</div>
          <EtaPicker value={eta} onChange={setEta} />
        </div>

        <div style={S.note}>This item will be moved out of Inbox and added as a project action.</div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button style={S.btnPrimary} onClick={submit} disabled={!projectId}>Move to Project</button>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Inbox item row ───────────────────────────────────
function InboxRow({ item, projects, milestones, onToggle, onDelete, onUpdateEta, onAssign }) {
  const [showEta, setShowEta]     = useState(false)
  const [showAssign, setShowAssign] = useState(false)

  return (
    <>
      <div style={{ ...S.row, opacity: item.done ? 0.55 : 1 }}>
        <div style={{ ...S.checkBox, ...(item.done ? S.checkBoxDone : {}) }} onClick={() => onToggle(item)}>
          {item.done && <span style={S.checkMark}>✓</span>}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', textDecoration: item.done ? 'line-through' : 'none', color: item.done ? 'var(--dim)' : 'var(--text)', lineHeight: 1.4 }}>
            {item.text}
          </div>
          <div style={{ marginTop: '3px' }}>
            <EtaChip eta={item.eta} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
          <button style={S.actionBtn} onClick={() => setShowEta(x => !x)} title="Set ETA">📅</button>
          <button style={{ ...S.actionBtn, color: 'var(--accent)' }} onClick={() => setShowAssign(true)} title="Assign to project">↗</button>
          <button style={{ ...S.actionBtn, color: 'var(--red)', opacity: 0.4 }} onClick={() => onDelete(item)} title="Delete">✕</button>
        </div>
      </div>

      {showEta && (
        <div style={S.etaRow}>
          <EtaPicker value={item.eta} onChange={v => { onUpdateEta(item, v); setShowEta(false) }} />
        </div>
      )}

      {showAssign && (
        <AssignModal
          item={item}
          projects={projects}
          milestones={milestones}
          onAssign={onAssign}
          onClose={() => setShowAssign(false)}
        />
      )}
    </>
  )
}

// ─── Quick capture bar ────────────────────────────────
function CaptureBar({ onAdd }) {
  const [text, setText]     = useState('')
  const [eta, setEta]       = useState(null)
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
          placeholder="Capture anything — press Enter to add…"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          autoFocus
        />
        <button style={{ ...S.etaToggleBtn, color: eta ? 'var(--accent)' : 'var(--mid)' }}
          onClick={() => setShowEta(x => !x)} title="Set ETA">
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

// ─── Main Inbox ───────────────────────────────────────
export default function Inbox({ userId }) {
  const [items, setItems]       = useState([])
  const [projects, setProjects] = useState([])
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('open') // 'open' | 'done'

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

  // Assign: create a real action, then DELETE the inbox item entirely
  async function assignToProject(item, projectId, milestoneId, eta) {
    await supabase.from('actions').insert({
      user_id: userId,
      project_id: projectId,
      milestone_id: milestoneId || null,
      text: item.text,
      eta: eta || null,
      done: false,
    })
    // Remove from inbox — item is now a project action
    setItems(prev => prev.filter(x => x.id !== item.id))
    await supabase.from('inbox').delete().eq('id', item.id)
  }

  if (loading) return <Spinner />

  const openItems = items.filter(i => !i.done)
  const doneItems = items.filter(i => i.done)
  const filtered  = filter === 'open' ? openItems : doneItems

  return (
    <div className="page-pad">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <SectionLabel style={{ marginBottom: '2px' }}>INBOX</SectionLabel>
          <div style={S.dimText}>Capture anything. Use ↗ to assign to a project — it will leave the inbox.</div>
        </div>
      </div>

      <CaptureBar onAdd={addItem} />

      {/* Filter tabs */}
      <div style={S.filterRow}>
        {[
          { id: 'open', label: 'Open', count: openItems.length },
          { id: 'done', label: 'Done', count: doneItems.length },
        ].map(f => (
          <button key={f.id} style={{ ...S.filterBtn, ...(filter === f.id ? S.filterBtnActive : {}) }} onClick={() => setFilter(f.id)}>
            {f.label} <span style={S.filterCount}>{f.count}</span>
          </button>
        ))}
      </div>

      <div style={S.list}>
        {filtered.length === 0 && (
          <div style={{ ...S.dimText, padding: '20px 16px', textAlign: 'center' }}>
            {filter === 'open' ? '✓ Inbox is clear' : 'No completed items'}
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
            onAssign={assignToProject}
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
  etaToggleBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: '3px', padding: '5px 10px', fontFamily: 'var(--mono)', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap' },
  filterRow: { display: 'flex', marginBottom: '12px', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' },
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
  fieldLabel: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '5px' },
  select: { width: '100%', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none' },
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '6px', padding: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
  modalTitle: { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--dim)', marginBottom: '8px' },
  note: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--dim)', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 10px' },
  btnPrimary: { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '3px', padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  btnGhost: { background: 'none', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--mid)', cursor: 'pointer' },
  dimText: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
}
