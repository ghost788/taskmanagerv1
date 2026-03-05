import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SectionLabel, ProgressBar, Spinner } from './UI'
import { today, tomorrow, formatDate, isPast, etaColor } from '../lib/dates'

// ─── ETA picker shared component ─────────────────────
export function EtaPicker({ value, onChange, style = {} }) {
  const [mode, setMode] = useState(() => {
    if (!value) return 'none'
    if (value === today()) return 'today'
    if (value === tomorrow()) return 'tomorrow'
    return 'custom'
  })

  function pick(m) {
    setMode(m)
    if (m === 'today')    onChange(today())
    if (m === 'tomorrow') onChange(tomorrow())
    if (m === 'none')     onChange(null)
  }

  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', ...style }}>
      {['none', 'today', 'tomorrow', 'custom'].map(m => (
        <button
          key={m}
          style={{
            padding: '3px 9px', borderRadius: '3px', border: '1px solid',
            fontFamily: 'var(--mono)', fontSize: '10px', cursor: 'pointer',
            borderColor: mode === m ? 'var(--accent)' : 'var(--border)',
            background: mode === m ? 'rgba(90,122,0,0.08)' : 'none',
            color: mode === m ? 'var(--accent)' : 'var(--dim)',
            transition: 'all 0.15s',
          }}
          onClick={() => pick(m)}
        >
          {m === 'none' ? 'No ETA' : m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
      {mode === 'custom' && (
        <input
          type="date"
          defaultValue={value && value !== today() && value !== tomorrow() ? value : ''}
          onChange={e => onChange(e.target.value || null)}
          style={{
            background: 'var(--s2)', border: '1px solid var(--border)',
            borderRadius: '3px', padding: '3px 8px',
            fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--text)', outline: 'none',
          }}
        />
      )}
    </div>
  )
}

// ─── Single action item in the sheet ─────────────────
function SheetAction({ action, projectName, milestoneName, onToggle, onReschedule }) {
  const [showEta, setShowEta] = useState(false)
  const isDelayed = action.delayed
  const isDone = action.done

  return (
    <div style={{
      ...S.actionRow,
      background: isDelayed ? 'rgba(192,57,43,0.03)' : 'var(--s1)',
      borderLeft: `3px solid ${isDelayed ? 'var(--red)' : isDone ? 'var(--accent)' : 'var(--border)'}`,
    }}>
      {/* Checkbox */}
      <div
        style={{ ...S.checkBox, ...(isDone ? S.checkBoxDone : {}) }}
        onClick={() => onToggle(action)}
      >
        {isDone && <span style={S.checkMark}>✓</span>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ ...S.actionText, textDecoration: isDone ? 'line-through' : 'none', color: isDone ? 'var(--dim)' : isDelayed ? 'var(--red)' : 'var(--text)' }}>
          {isDelayed && <span style={S.delayedBadge}>DELAYED</span>}
          {action.text}
        </div>
        <div style={S.actionMeta}>
          <span>{projectName}</span>
          {milestoneName && <><span style={{ color: 'var(--border2)' }}>›</span><span>{milestoneName}</span></>}
          {action.recurring && <span style={S.recurBadge}>↻ {action.frequency}</span>}
        </div>
      </div>

      {/* Reschedule */}
      <button style={S.etaToggle} onClick={() => setShowEta(x => !x)} title="Change ETA">
        {showEta ? '✕' : '📅'}
      </button>

      {showEta && (
        <div style={{ position: 'absolute', right: '12px', top: '48px', zIndex: 20, background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '10px 12px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ ...S.dimText, marginBottom: '6px' }}>Reschedule</div>
          <EtaPicker value={action.eta} onChange={date => { onReschedule(action, date); setShowEta(false) }} />
        </div>
      )}
    </div>
  )
}

// ─── Day sheet ────────────────────────────────────────
function DaySheet({ label, actions, projects, milestones, onToggle, onReschedule }) {
  const done = actions.filter(a => a.done).length
  const pct = actions.length ? Math.round(done / actions.length * 100) : 0

  function getContext(action) {
    const project = projects.find(p => p.id === action.project_id)
    const milestone = milestones.find(m => m.id === action.milestone_id)
    return {
      projectName: project?.name || 'Unknown project',
      milestoneName: milestone?.text || null,
    }
  }

  return (
    <div style={S.sheet}>
      <div style={S.sheetHeader}>
        <div>
          <div style={S.sheetLabel}>{label}</div>
          <div style={S.sheetCount}>{done}/{actions.length} complete</div>
        </div>
        <div style={{ flex: 1, margin: '0 20px' }}>
          <ProgressBar pct={pct} />
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: '600' }}>{pct}%</div>
      </div>

      {actions.length === 0 ? (
        <div style={{ ...S.dimText, padding: '20px 16px' }}>No actions scheduled — add ETAs to your project actions to see them here.</div>
      ) : (
        <div>
          {actions.map(action => {
            const { projectName, milestoneName } = getContext(action)
            return (
              <div key={action.id} style={{ position: 'relative' }}>
                <SheetAction
                  action={action}
                  projectName={projectName}
                  milestoneName={milestoneName}
                  onToggle={onToggle}
                  onReschedule={onReschedule}
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Today/Tomorrow view ─────────────────────────
export default function TodaySheet({ userId }) {
  const [actions, setActions]       = useState([])
  const [projects, setProjects]     = useState([])
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    const t = today()
    const tom = tomorrow()

    // Mark overdue incomplete actions from yesterday as delayed
    await supabase.from('actions')
      .update({ delayed: true })
      .eq('user_id', userId)
      .lt('eta', t)
      .eq('done', false)
      .not('eta', 'is', null)

    const [{ data: aRows }, { data: pRows }, { data: mRows }] = await Promise.all([
      supabase.from('actions').select('*').eq('user_id', userId)
        .or(`eta.eq.${t},eta.eq.${tom},delayed.eq.true`)
        .order('eta').order('created_at'),
      supabase.from('projects').select('id,name').eq('user_id', userId),
      supabase.from('milestones').select('id,text,project_id').eq('user_id', userId),
    ])

    setActions(aRows || [])
    setProjects(pRows || [])
    setMilestones(mRows || [])
    setLoading(false)
  }

  async function toggleAction(action) {
    const done = !action.done
    setActions(prev => prev.map(a => a.id === action.id ? { ...a, done } : a))
    await supabase.from('actions').update({ done }).eq('id', action.id)
  }

  async function rescheduleAction(action, eta) {
    setActions(prev => prev.map(a => a.id === action.id ? { ...a, eta, delayed: false } : a))
    await supabase.from('actions').update({ eta, delayed: false }).eq('id', action.id)
    // Remove from view if no longer today/tomorrow
    const t = today(), tom = tomorrow()
    if (eta !== t && eta !== tom) {
      setActions(prev => prev.filter(a => a.id !== action.id))
    }
  }

  if (loading) return <Spinner />

  const t = today(), tom = tomorrow()
  const todayActions    = actions.filter(a => a.eta === t || a.delayed)
  const tomorrowActions = actions.filter(a => a.eta === tom && !a.delayed)

  return (
    <div className="page-pad">
      <SectionLabel>TODAY — {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</SectionLabel>
      <DaySheet
        label="Today"
        actions={todayActions}
        projects={projects}
        milestones={milestones}
        onToggle={toggleAction}
        onReschedule={rescheduleAction}
      />

      <div style={{ marginTop: '28px' }}>
        <SectionLabel>TOMORROW</SectionLabel>
        <DaySheet
          label="Tomorrow"
          actions={tomorrowActions}
          projects={projects}
          milestones={milestones}
          onToggle={toggleAction}
          onReschedule={rescheduleAction}
        />
      </div>
    </div>
  )
}

const S = {
  sheet: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden', marginBottom: '8px' },
  sheetHeader: { display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', borderBottom: '1px solid var(--border)', background: 'var(--s2)' },
  sheetLabel: { fontFamily: 'var(--mono)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.05em' },
  sheetCount: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', marginTop: '2px' },
  actionRow: { display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '11px 14px', borderBottom: '1px solid var(--border)', transition: 'background 0.1s' },
  checkBox: { width: '16px', height: '16px', flexShrink: 0, border: '1.5px solid var(--border2)', borderRadius: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.15s', marginTop: '2px' },
  checkBoxDone: { background: 'var(--accent)', borderColor: 'var(--accent)' },
  checkMark: { fontSize: '9px', color: '#fff', fontWeight: '700', lineHeight: 1 },
  actionText: { fontSize: '13px', lineHeight: 1.4, marginBottom: '3px' },
  actionMeta: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--dim)', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' },
  delayedBadge: { background: 'rgba(192,57,43,0.1)', color: 'var(--red)', fontFamily: 'var(--mono)', fontSize: '9px', padding: '1px 5px', borderRadius: '2px', marginRight: '6px', letterSpacing: '0.08em' },
  recurBadge: { background: 'rgba(90,122,0,0.08)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '9px', padding: '1px 5px', borderRadius: '2px' },
  etaToggle: { background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '2px', flexShrink: 0, opacity: 0.5, transition: 'opacity 0.15s' },
  dimText: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
}
