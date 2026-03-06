import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SectionLabel, ProgressBar, Spinner } from './UI'
import { today, tomorrow, formatDateLong, etaColor } from '../lib/dates'

// ─── ETA picker (shared — exported for use in other components) ───
export function EtaPicker({ value, onChange, style = {} }) {
  const [mode, setMode] = useState(() => {
    if (!value) return 'none'
    if (value === today()) return 'today'
    if (value === tomorrow()) return 'tomorrow'
    return 'custom'
  })

  // Keep mode in sync if value changes externally
  useEffect(() => {
    if (!value) setMode('none')
    else if (value === today()) setMode('today')
    else if (value === tomorrow()) setMode('tomorrow')
    else setMode('custom')
  }, [value])

  function pick(m) {
    setMode(m)
    if (m === 'today')    onChange(today())
    if (m === 'tomorrow') onChange(tomorrow())
    if (m === 'none')     onChange(null)
  }

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', ...style }}>
      {['none', 'today', 'tomorrow', 'custom'].map(m => (
        <button key={m} onClick={() => pick(m)} style={{
          padding: '3px 9px', borderRadius: '3px', border: '1px solid',
          fontFamily: 'var(--mono)', fontSize: '10px', cursor: 'pointer',
          borderColor: mode === m ? 'var(--accent)' : 'var(--border)',
          background: mode === m ? 'rgba(90,122,0,0.08)' : 'none',
          color: mode === m ? 'var(--accent)' : 'var(--dim)',
          transition: 'all 0.15s',
        }}>
          {m === 'none' ? 'No ETA' : m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
      {mode === 'custom' && (
        <input type="date"
          defaultValue={value && value !== today() && value !== tomorrow() ? value : ''}
          onChange={e => onChange(e.target.value || null)}
          style={{ background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '3px 8px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text)', outline: 'none' }}
        />
      )}
    </div>
  )
}

// ─── Reassign modal ───────────────────────────────────
function ReassignModal({ item, projects, milestones, onReassign, onClose }) {
  const [projectId, setProjectId] = useState(item.project_id || '')
  const [milestoneId, setMilestoneId] = useState(item.milestone_id || '')
  const pMs = milestones.filter(m => m.project_id === projectId)

  async function submit() {
    await onReassign(item, projectId || null, milestoneId || null)
    onClose()
  }

  return (
    <div style={S.overlay} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <div style={S.modalTitle}>REASSIGN ACTION</div>
        <div style={{ fontSize: '13px', marginBottom: '16px', color: 'var(--text)' }}>"{item.text}"</div>

        <div style={S.fieldGroup}>
          <div style={S.fieldLabel}>PROJECT</div>
          <select style={S.select} value={projectId} onChange={e => { setProjectId(e.target.value); setMilestoneId('') }} autoFocus>
            <option value="">— No project —</option>
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

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button style={S.btnPrimary} onClick={submit}>Save</button>
          <button style={S.btnGhost} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ─── Unified action item (works for both actions and inbox items) ─
function SheetItem({ item, projectName, milestoneName, onToggle, onReschedule, onReassign, projects, milestones, isInbox }) {
  const [showEta, setShowEta]         = useState(false)
  const [showReassign, setShowReassign] = useState(false)
  const isDelayed = item.delayed
  const isDone    = item.done

  return (
    <div style={{
      ...S.actionRow,
      background: isDelayed ? 'rgba(192,57,43,0.03)' : 'var(--s1)',
      borderLeft: `3px solid ${isDelayed ? 'var(--red)' : isDone ? 'var(--accent)' : 'transparent'}`,
    }}>
      {/* Checkbox */}
      <div style={{ ...S.checkBox, ...(isDone ? S.checkBoxDone : {}) }} onClick={() => onToggle(item)}>
        {isDone && <span style={S.checkMark}>✓</span>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', lineHeight: 1.4, marginBottom: '3px', textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--dim)' : isDelayed ? 'var(--red)' : 'var(--text)' }}>
          {isDelayed && <span style={S.delayedBadge}>DELAYED</span>}
          {item.text}
        </div>
        <div style={S.meta}>
          {isInbox && <span style={S.inboxBadge}>📥 Inbox</span>}
          {projectName && <span>{projectName}</span>}
          {milestoneName && <><span style={{ color: 'var(--border2)' }}>›</span><span>{milestoneName}</span></>}
          {item.recurring && <span style={S.recurBadge}>↻ {item.frequency}</span>}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center', flexShrink: 0 }}>
        <button style={S.ctrlBtn} onClick={() => setShowEta(x => !x)} title="Change ETA">📅</button>
        <button style={S.ctrlBtn} onClick={() => setShowReassign(x => !x)} title="Reassign">↗</button>
      </div>

      {/* ETA popover */}
      {showEta && (
        <div style={S.etaPopover}>
          <div style={{ ...S.fieldLabel, marginBottom: '6px' }}>RESCHEDULE</div>
          <EtaPicker value={item.eta} onChange={date => { onReschedule(item, date, isInbox); setShowEta(false) }} />
        </div>
      )}

      {/* Reassign modal */}
      {showReassign && (
        <ReassignModal
          item={item}
          projects={projects}
          milestones={milestones}
          onReassign={(it, pid, mid) => onReassign(it, pid, mid, isInbox)}
          onClose={() => setShowReassign(false)}
        />
      )}
    </div>
  )
}

// ─── Day sheet ────────────────────────────────────────
function DaySheet({ label, items, projects, milestones, onToggle, onReschedule, onReassign }) {
  const done = items.filter(a => a.done).length
  const pct  = items.length ? Math.round(done / items.length * 100) : 0

  function getContext(item) {
    const project   = projects.find(p => p.id === item.project_id)
    const milestone = milestones.find(m => m.id === item.milestone_id)
    return { projectName: project?.name || null, milestoneName: milestone?.text || null }
  }

  return (
    <div style={S.sheet}>
      <div style={S.sheetHeader}>
        <div>
          <div style={S.sheetLabel}>{label}</div>
          <div style={S.sheetCount}>{done}/{items.length} complete</div>
        </div>
        <div style={{ flex: 1, margin: '0 20px' }}><ProgressBar pct={pct} /></div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: '600' }}>{pct}%</div>
      </div>

      {items.length === 0 ? (
        <div style={{ ...S.dimText, padding: '20px 16px' }}>Nothing scheduled — set ETAs on actions or inbox items to see them here.</div>
      ) : (
        items.map(item => {
          const { projectName, milestoneName } = getContext(item)
          return (
            <SheetItem
              key={`${item._source}-${item.id}`}
              item={item}
              projectName={projectName}
              milestoneName={milestoneName}
              onToggle={onToggle}
              onReschedule={onReschedule}
              onReassign={onReassign}
              projects={projects}
              milestones={milestones}
              isInbox={item._source === 'inbox'}
            />
          )
        })
      )}
    </div>
  )
}

// ─── Main TodaySheet component ────────────────────────
export default function TodaySheet({ userId }) {
  const [actions, setActions]       = useState([])
  const [inboxItems, setInboxItems] = useState([])
  const [projects, setProjects]     = useState([])
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    const t   = today()
    const tom = tomorrow()

    // Mark overdue actions as delayed
    await supabase.from('actions')
      .update({ delayed: true })
      .eq('user_id', userId)
      .lt('eta', t)
      .eq('done', false)
      .not('eta', 'is', null)

    const [{ data: aRows }, { data: iRows }, { data: pRows }, { data: mRows }] = await Promise.all([
      // Actions for today, tomorrow, or delayed
      supabase.from('actions').select('*').eq('user_id', userId)
        .or(`eta.eq.${t},eta.eq.${tom},delayed.eq.true`)
        .order('eta').order('created_at'),
      // Inbox items for today or tomorrow (not promoted/done)
      supabase.from('inbox').select('*').eq('user_id', userId)
        .or(`eta.eq.${t},eta.eq.${tom}`)
        .eq('done', false)
        .order('eta').order('created_at'),
      supabase.from('projects').select('id,name').eq('user_id', userId),
      supabase.from('milestones').select('id,text,project_id').eq('user_id', userId),
    ])

    setActions((aRows || []).map(a => ({ ...a, _source: 'action' })))
    setInboxItems((iRows || []).map(i => ({ ...i, _source: 'inbox' })))
    setProjects(pRows || [])
    setMilestones(mRows || [])
    setLoading(false)
  }

  // ── Toggle ───────────────────────────────────────────
  async function toggleItem(item) {
    const done = !item.done
    if (item._source === 'inbox') {
      setInboxItems(prev => prev.map(x => x.id === item.id ? { ...x, done } : x))
      await supabase.from('inbox').update({ done }).eq('id', item.id)
    } else {
      setActions(prev => prev.map(x => x.id === item.id ? { ...x, done } : x))
      await supabase.from('actions').update({ done }).eq('id', item.id)
    }
  }

  // ── Reschedule ────────────────────────────────────────
  async function rescheduleItem(item, eta, isInbox) {
    const t = today(), tom = tomorrow()
    if (isInbox) {
      setInboxItems(prev => {
        const updated = prev.map(x => x.id === item.id ? { ...x, eta } : x)
        // Remove from view if no longer today/tomorrow
        return updated.filter(x => x.eta === t || x.eta === tom)
      })
      await supabase.from('inbox').update({ eta }).eq('id', item.id)
    } else {
      setActions(prev => {
        const updated = prev.map(x => x.id === item.id ? { ...x, eta, delayed: false } : x)
        return updated.filter(x => x.eta === t || x.eta === tom || x.delayed)
      })
      await supabase.from('actions').update({ eta, delayed: false }).eq('id', item.id)
    }
  }

  // ── Reassign project/milestone ────────────────────────
  async function reassignItem(item, projectId, milestoneId, isInbox) {
    if (isInbox) {
      setInboxItems(prev => prev.map(x => x.id === item.id ? { ...x, project_id: projectId, milestone_id: milestoneId } : x))
      await supabase.from('inbox').update({ project_id: projectId, milestone_id: milestoneId }).eq('id', item.id)
    } else {
      setActions(prev => prev.map(x => x.id === item.id ? { ...x, project_id: projectId, milestone_id: milestoneId } : x))
      await supabase.from('actions').update({ project_id: projectId, milestone_id: milestoneId }).eq('id', item.id)
    }
  }

  if (loading) return <Spinner />

  const t   = today()
  const tom = tomorrow()

  // Merge actions + inbox items, then split by day
  const all = [...actions, ...inboxItems]
  const todayItems    = all.filter(x => x.eta === t || (x._source === 'action' && x.delayed))
  const tomorrowItems = all.filter(x => x.eta === tom && !(x._source === 'action' && x.delayed))

  return (
    <div className="page-pad">
      <SectionLabel>{formatDateLong(t).toUpperCase()}</SectionLabel>
      <DaySheet label="Today" items={todayItems} projects={projects} milestones={milestones}
        onToggle={toggleItem} onReschedule={rescheduleItem} onReassign={reassignItem} />

      <div style={{ marginTop: '28px' }}>
        <SectionLabel>TOMORROW</SectionLabel>
        <DaySheet label="Tomorrow" items={tomorrowItems} projects={projects} milestones={milestones}
          onToggle={toggleItem} onReschedule={rescheduleItem} onReassign={reassignItem} />
      </div>
    </div>
  )
}

const S = {
  sheet: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' },
  sheetHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--s2)' },
  sheetLabel: { fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' },
  sheetCount: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', marginTop: '2px' },
  actionRow: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '11px 14px', borderBottom: '1px solid var(--border)', position: 'relative', transition: 'background 0.1s' },
  checkBox: { width: '16px', height: '16px', flexShrink: 0, border: '1.5px solid var(--border2)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', marginTop: '2px' },
  checkBoxDone: { background: 'var(--accent)', borderColor: 'var(--accent)' },
  checkMark: { fontSize: '9px', color: '#fff', fontWeight: '700', lineHeight: 1 },
  meta: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--dim)', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' },
  delayedBadge: { background: 'rgba(192,57,43,0.1)', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: '9px', padding: '1px 5px', borderRadius: '2px', marginRight: '6px', letterSpacing: '0.08em' },
  inboxBadge: { background: 'rgba(90,122,0,0.07)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '9px', padding: '1px 5px', borderRadius: '2px' },
  recurBadge: { background: 'rgba(90,122,0,0.07)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '9px', padding: '1px 5px', borderRadius: '2px' },
  ctrlBtn: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '3px', opacity: 0.5, transition: 'opacity 0.15s' },
  etaPopover: { position: 'absolute', right: '12px', top: '44px', zIndex: 30, background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', minWidth: '240px' },
  // Reassign modal
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '6px', padding: '24px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' },
  modalTitle: { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--dim)', marginBottom: '8px' },
  fieldGroup: { marginBottom: '12px' },
  fieldLabel: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '5px' },
  select: { width: '100%', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none' },
  btnPrimary: { background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '3px', padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  btnGhost: { background: 'none', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 16px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--mid)', cursor: 'pointer' },
  dimText: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
}
