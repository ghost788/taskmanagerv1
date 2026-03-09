import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, SectionLabel, Spinner } from './UI'
import {
  today, tomorrow, localDateStr,
  nextOccurrence, nextWeekdayOccurrence,
  calcStreak, formatDate,
  WEEKDAY_LABELS,
} from '../lib/dates'

const ICONS = ['💊', '🏃', '📖', '💧', '🧘', '✏️', '🥗', '😴', '🚶', '🎯', '🧠', '💪', '🌿', '☀️', '🛁']
const DEFAULT_HABITS = [{ name: 'Multivitamins', icon: '💊', frequency: 'daily', every_x_days: null, repeat_days: null }]

// ─── Frequency label ──────────────────────────────────
function freqLabel(habit) {
  if (habit.frequency === 'daily')        return 'Every day'
  if (habit.frequency === 'weekly')       return 'Every week'
  if (habit.frequency === 'biweekly')     return 'Every 2 weeks'
  if (habit.frequency === 'monthly')      return 'Every month'
  if (habit.frequency === 'every_x_days') return `Every ${habit.every_x_days || 1} days`
  if (habit.frequency === 'weekdays' && habit.repeat_days?.length)
    return habit.repeat_days.slice().sort((a,b)=>a-b).map(d => WEEKDAY_LABELS[d]).join(' · ')
  return habit.frequency
}

// ─── Next due date for a habit ────────────────────────
function nextDueDate(habit, lastLogDate) {
  if (!lastLogDate) {
    if (habit.frequency === 'weekdays')
      return nextWeekdayOccurrence(today(), habit.repeat_days || [], false)
    return today()
  }
  if (habit.frequency === 'weekdays')
    return nextWeekdayOccurrence(lastLogDate, habit.repeat_days || [], true)
  const next = nextOccurrence(lastLogDate, habit.frequency, habit.every_x_days || 1)
  return next < today() ? today() : next
}

// ─── Ensure one pending action exists for this habit ──
async function ensureHabitAction(userId, habit, logs, existingActions) {
  const lastLog = logs.length ? logs[logs.length - 1].logged_date : null
  const dueDate = nextDueDate(habit, lastLog)
  const alreadyExists = existingActions.some(a => a.habit_id === habit.id && a.eta === dueDate)
  if (alreadyExists) return null
  const { data } = await supabase.from('actions').insert({
    user_id: userId,
    habit_id: habit.id,
    text: `${habit.icon} ${habit.name}`,
    eta: dueDate,
    done: false,
    recurring: true,
    frequency: habit.frequency,
  }).select().single()
  return data
}

// ─── Frequency picker ─────────────────────────────────
function FrequencyPicker({ frequency, everyXDays, repeatDays, onChange }) {
  const [mode, setMode] = useState(frequency || 'daily')
  const [xDays, setXDays] = useState(everyXDays || 2)
  const [days, setDays] = useState(repeatDays || [])

  function emit(newMode, newX, newDays) {
    onChange({
      frequency:    newMode,
      every_x_days: newMode === 'every_x_days' ? (newX || 2) : null,
      repeat_days:  newMode === 'weekdays' ? newDays : null,
    })
  }

  function pickMode(m) { setMode(m); emit(m, xDays, days) }

  function changeX(val) {
    const n = Math.max(1, parseInt(val) || 1)
    setXDays(n)
    emit(mode, n, days)
  }

  function toggleDay(d) {
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d]
    setDays(next)
    emit(mode, xDays, next)
  }

  const MODES = [
    { id: 'daily',        label: 'Daily' },
    { id: 'weekly',       label: 'Weekly' },
    { id: 'biweekly',     label: 'Biweekly' },
    { id: 'monthly',      label: 'Monthly' },
    { id: 'every_x_days', label: 'Every X days' },
    { id: 'weekdays',     label: 'Set days' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => pickMode(m.id)} style={{
            padding: '5px 11px', borderRadius: '3px', border: '1px solid',
            fontFamily: 'var(--mono)', fontSize: '11px', cursor: 'pointer',
            borderColor: mode === m.id ? 'var(--accent)' : 'var(--border)',
            background:  mode === m.id ? 'rgba(90,122,0,0.08)' : 'none',
            color:       mode === m.id ? 'var(--accent)' : 'var(--dim)',
            transition: 'all 0.15s',
          }}>{m.label}</button>
        ))}
      </div>

      {mode === 'every_x_days' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
          <span style={S.fieldLabel}>EVERY</span>
          <input
            type="number" min="1" max="365" value={xDays}
            onChange={e => changeX(e.target.value)}
            style={{ ...S.input, width: '70px', textAlign: 'center', padding: '6px 8px' }}
          />
          <span style={S.fieldLabel}>DAYS</span>
        </div>
      )}

      {mode === 'weekdays' && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
          {WEEKDAY_LABELS.map((label, i) => (
            <button key={i} onClick={() => toggleDay(i)} style={{
              width: '38px', height: '38px', borderRadius: '50%', border: '1.5px solid',
              fontFamily: 'var(--mono)', fontSize: '11px', cursor: 'pointer',
              borderColor: days.includes(i) ? 'var(--accent)' : 'var(--border)',
              background:  days.includes(i) ? 'rgba(90,122,0,0.12)' : 'none',
              color:       days.includes(i) ? 'var(--accent)' : 'var(--dim)',
              fontWeight:  days.includes(i) ? '700' : '400',
              transition: 'all 0.15s',
            }}>{label[0]}</button>
          ))}
        </div>
      )}
      {mode === 'weekdays' && days.length === 0 && (
        <div style={{ ...S.dimText, marginTop: '6px', color: 'var(--amber)' }}>Select at least one day</div>
      )}
    </div>
  )
}

// ─── Heatmap ──────────────────────────────────────────
function HeatMap({ logDates }) {
  const logSet = new Set(logDates)
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(localDateStr(d))
  }
  return (
    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '8px' }}>
      {days.map(d => (
        <div key={d} title={d + (logSet.has(d) ? ' ✓' : '')} style={{
          width: '14px', height: '14px', borderRadius: '2px',
          background: logSet.has(d) ? 'var(--accent)' : 'var(--s3)',
          border: d === today() ? '1px solid var(--accent)' : '1px solid transparent',
        }} />
      ))}
    </div>
  )
}

// ─── Habit card ───────────────────────────────────────
function HabitCard({ habit, logs, habitAction, onToggleToday, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(habit.name)
  const [icon, setIcon] = useState(habit.icon)
  const [freqCfg, setFreqCfg] = useState({
    frequency: habit.frequency,
    every_x_days: habit.every_x_days,
    repeat_days: habit.repeat_days,
  })

  const logDates = logs.map(l => l.logged_date).sort()
  const { current, longest, lastMiss } = calcStreak(logDates)
  const doneToday = logDates.includes(today())

  const nextDue = habitAction?.eta
  const nextDueLabel = !nextDue ? null
    : nextDue === today()    ? 'Due today'
    : nextDue === tomorrow() ? 'Due tomorrow'
    : `Due ${nextDue}`

  async function saveEdit() {
    await onEdit(habit, { name, icon, ...freqCfg })
    setEditing(false)
  }

  if (editing) return (
    <div style={{ ...S.habitCard, padding: '16px' }}>
      <div style={{ ...S.fieldLabel, marginBottom: '8px' }}>ICON</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
        {ICONS.map(ic => (
          <button key={ic} onClick={() => setIcon(ic)} style={{
            padding: '6px', borderRadius: '3px', cursor: 'pointer', fontSize: '16px',
            background: icon === ic ? 'rgba(90,122,0,0.1)' : 'none',
            border: `1px solid ${icon === ic ? 'var(--accent)' : 'var(--border)'}`,
          }}>{ic}</button>
        ))}
      </div>
      <div style={{ ...S.fieldLabel, marginBottom: '6px' }}>NAME</div>
      <input style={{ ...S.input, marginBottom: '14px' }} value={name} onChange={e => setName(e.target.value)} autoFocus />
      <div style={{ ...S.fieldLabel, marginBottom: '8px' }}>FREQUENCY</div>
      <FrequencyPicker
        frequency={freqCfg.frequency}
        everyXDays={freqCfg.every_x_days}
        repeatDays={freqCfg.repeat_days}
        onChange={setFreqCfg}
      />
      <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
        <Btn onClick={saveEdit} style={{ padding: '6px 14px', fontSize: '11px' }}>Save</Btn>
        <Btn variant="ghost" onClick={() => setEditing(false)} style={{ padding: '6px 14px', fontSize: '11px' }}>Cancel</Btn>
      </div>
    </div>
  )

  return (
    <div style={{ ...S.habitCard, borderTop: `3px solid ${doneToday ? 'var(--accent)' : 'var(--border)'}` }}>
      <div style={{ padding: '14px 16px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
          <div style={{ fontSize: '22px', flexShrink: 0 }}>{habit.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={S.habitName}>{habit.name}</div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginTop: '3px' }}>
              <span style={S.freqChip}>{freqLabel(habit)}</span>
              {nextDueLabel && (
                <span style={{ ...S.dimText, color: nextDue === today() ? 'var(--amber)' : 'var(--dim)' }}>
                  {nextDueLabel}
                </span>
              )}
            </div>
          </div>
          <button style={S.editBtn} onClick={() => setEditing(true)}>✎</button>
          <button style={{ ...S.editBtn, color: 'var(--red)', opacity: 0.4 }} onClick={() => onDelete(habit)}>✕</button>
        </div>

        {/* Stats */}
        <div style={S.streakRow}>
          {[
            { val: current,         label: 'Current',  color: 'var(--text)' },
            { val: longest,         label: 'Longest',  color: 'var(--accent)' },
            { val: logDates.length, label: 'Total',    color: 'var(--text)' },
            { val: lastMiss ? formatDate(lastMiss) : '—', label: 'Last miss', color: lastMiss ? 'var(--amber)' : 'var(--dim)', small: true },
          ].map((s, i) => (
            <div key={i} style={{ ...S.statCell, borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: s.small ? '11px' : '18px', fontWeight: '600', color: s.color, marginTop: s.small ? '4px' : 0 }}>{s.val}</div>
              <div style={S.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {lastMiss && current > 0 && (
          <div style={S.missNote}>⚠ Missed {formatDate(lastMiss)} — streak continued after recovery</div>
        )}

        <div style={{ marginTop: '12px' }}>
          <div style={S.fieldLabel}>LAST 30 DAYS</div>
          <HeatMap logDates={logDates} />
        </div>

        <button
          style={{ ...S.todayBtn, ...(doneToday ? S.todayBtnDone : {}) }}
          onClick={() => onToggleToday(habit)}
        >
          {doneToday ? '✓ Done today — tap to undo' : 'Mark done today'}
        </button>
      </div>
    </div>
  )
}

// ─── Add habit form ───────────────────────────────────
function AddHabitForm({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💊')
  const [freqCfg, setFreqCfg] = useState({ frequency: 'daily', every_x_days: null, repeat_days: null })

  function submit() {
    if (!name.trim()) return
    if (freqCfg.frequency === 'weekdays' && (!freqCfg.repeat_days || freqCfg.repeat_days.length === 0)) return
    onAdd({ name: name.trim(), icon, ...freqCfg })
    onClose()
  }

  return (
    <div style={S.formCard}>
      <div style={S.formTitle}>NEW HABIT</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <div style={S.fieldLabel}>ICON</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ICONS.map(ic => (
              <button key={ic} onClick={() => setIcon(ic)} style={{
                padding: '6px', borderRadius: '3px', cursor: 'pointer', fontSize: '16px',
                background: icon === ic ? 'rgba(90,122,0,0.1)' : 'none',
                border: `1px solid ${icon === ic ? 'var(--accent)' : 'var(--border)'}`,
              }}>{ic}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={S.fieldLabel}>NAME</div>
          <input style={S.input} autoFocus placeholder="e.g. Multivitamins, Read 30min…" value={name}
            onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <div>
          <div style={S.fieldLabel}>FREQUENCY</div>
          <FrequencyPicker
            frequency={freqCfg.frequency}
            everyXDays={freqCfg.every_x_days}
            repeatDays={freqCfg.repeat_days}
            onChange={setFreqCfg}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn onClick={submit}>Create Habit</Btn>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────
export default function Habits({ userId }) {
  const [habits, setHabits]     = useState([])
  const [logs, setLogs]         = useState([])
  const [actions, setActions]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [seeded, setSeeded]     = useState(false)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    const [{ data: hRows }, { data: lRows }, { data: aRows }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId).order('position'),
      supabase.from('habit_logs').select('*').eq('user_id', userId).order('logged_date'),
      supabase.from('actions').select('*').eq('user_id', userId).not('habit_id', 'is', null),
    ])
    const loadedHabits  = hRows || []
    const loadedLogs    = lRows || []
    const loadedActions = aRows || []

    if (loadedHabits.length > 0) {
      setHabits(loadedHabits); setLogs(loadedLogs)
      const allActions = [...loadedActions]
      for (const habit of loadedHabits) {
        const habitLogs = loadedLogs.filter(l => l.habit_id === habit.id)
        const created = await ensureHabitAction(userId, habit, habitLogs, allActions)
        if (created) allActions.push(created)
      }
      setActions(allActions)
    } else if (!seeded) {
      setSeeded(true)
      for (const [i, h] of DEFAULT_HABITS.entries()) {
        const { data } = await supabase.from('habits').insert({ user_id: userId, ...h, position: i }).select().single()
        if (data) {
          setHabits([data])
          const action = await ensureHabitAction(userId, data, [], [])
          if (action) setActions([action])
        }
      }
    }
    setLoading(false)
  }

  async function addHabit(habitData) {
    const { data } = await supabase.from('habits')
      .insert({ user_id: userId, ...habitData, position: habits.length })
      .select().single()
    if (data) {
      setHabits(prev => [...prev, data])
      const action = await ensureHabitAction(userId, data, [], actions)
      if (action) setActions(prev => [...prev, action])
    }
  }

  async function editHabit(habit, changes) {
    const updated = { ...habit, ...changes }
    setHabits(prev => prev.map(h => h.id === habit.id ? updated : h))
    await supabase.from('habits').update(changes).eq('id', habit.id)

    const pendingAction = actions.find(a => a.habit_id === habit.id && !a.done)

    // Update action text if name/icon changed
    if (pendingAction && (changes.name !== undefined || changes.icon !== undefined)) {
      const newText = `${updated.icon} ${updated.name}`
      setActions(prev => prev.map(a => a.id === pendingAction.id ? { ...a, text: newText } : a))
      await supabase.from('actions').update({ text: newText }).eq('id', pendingAction.id)
    }

    // If frequency changed, regenerate pending action
    if (changes.frequency !== undefined || changes.every_x_days !== undefined || changes.repeat_days !== undefined) {
      if (pendingAction) {
        setActions(prev => prev.filter(a => a.id !== pendingAction.id))
        await supabase.from('actions').delete().eq('id', pendingAction.id)
      }
      const habitLogs = logs.filter(l => l.habit_id === habit.id)
      const remaining = actions.filter(a => a.id !== pendingAction?.id)
      const newAction = await ensureHabitAction(userId, updated, habitLogs, remaining)
      if (newAction) setActions(prev => [...prev, newAction])
    }
  }

  async function deleteHabit(habit) {
    setHabits(prev => prev.filter(h => h.id !== habit.id))
    setLogs(prev => prev.filter(l => l.habit_id !== habit.id))
    setActions(prev => prev.filter(a => a.habit_id !== habit.id))
    await supabase.from('habits').delete().eq('id', habit.id)
  }

  async function toggleToday(habit) {
    const t = today()
    const existing = logs.find(l => l.habit_id === habit.id && l.logged_date === t)

    if (existing) {
      // Undo: remove log, mark action undone, delete next action
      setLogs(prev => prev.filter(l => l.id !== existing.id))
      await supabase.from('habit_logs').delete().eq('id', existing.id)

      const todayAction = actions.find(a => a.habit_id === habit.id && a.eta === t)
      if (todayAction) {
        setActions(prev => prev.map(a => a.id === todayAction.id ? { ...a, done: false } : a))
        await supabase.from('actions').update({ done: false }).eq('id', todayAction.id)
      }
      const nextAction = actions.find(a => a.habit_id === habit.id && a.eta > t && !a.done)
      if (nextAction) {
        setActions(prev => prev.filter(a => a.id !== nextAction.id))
        await supabase.from('actions').delete().eq('id', nextAction.id)
      }
    } else {
      // Log it
      const { data: logData } = await supabase.from('habit_logs')
        .insert({ user_id: userId, habit_id: habit.id, logged_date: t })
        .select().single()
      if (logData) setLogs(prev => [...prev, logData])

      // Mark today action done
      const todayAction = actions.find(a => a.habit_id === habit.id && a.eta === t)
      let updatedActions = actions
      if (todayAction) {
        updatedActions = actions.map(a => a.id === todayAction.id ? { ...a, done: true } : a)
        setActions(updatedActions)
        await supabase.from('actions').update({ done: true }).eq('id', todayAction.id)
      }

      // Generate next pending action
      const habitLogs = [...logs.filter(l => l.habit_id === habit.id), { logged_date: t }]
        .sort((a, b) => a.logged_date < b.logged_date ? -1 : 1)
      const newAction = await ensureHabitAction(userId, habit, habitLogs, updatedActions)
      if (newAction) setActions(prev => [...prev, newAction])
    }
  }

  if (loading) return <Spinner />

  const todayDone = habits.filter(h => logs.some(l => l.habit_id === h.id && l.logged_date === today())).length

  return (
    <div className="page-pad">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <SectionLabel style={{ marginBottom: 0 }}>HABITS</SectionLabel>
        <button style={S.addBtn} onClick={() => setShowForm(true)}>+ New Habit</button>
      </div>

      <div style={S.summaryBar}>
        <span style={S.dimText}>{todayDone}/{habits.length} done today</span>
        <div style={{ flex: 1, margin: '0 16px', height: '2px', background: 'var(--border)', borderRadius: '1px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${habits.length ? Math.round(todayDone/habits.length*100) : 0}%`, background: 'var(--accent)', transition: 'width 0.4s' }} />
        </div>
        <span style={S.dimText}>{habits.length ? Math.round(todayDone/habits.length*100) : 0}%</span>
      </div>

      {showForm && <AddHabitForm onAdd={addHabit} onClose={() => setShowForm(false)} />}

      {habits.length === 0 && !showForm && (
        <div style={S.emptyState}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>💊</div>
          <div style={S.habitName}>No habits yet</div>
          <div style={{ ...S.dimText, marginTop: '4px' }}>Track habits on any schedule — daily, weekly, specific days, or every N days.</div>
        </div>
      )}

      <div style={S.grid}>
        {habits.map(habit => (
          <HabitCard
            key={habit.id}
            habit={habit}
            logs={logs.filter(l => l.habit_id === habit.id)}
            habitAction={actions.find(a => a.habit_id === habit.id && !a.done)}
            onToggleToday={toggleToday}
            onDelete={deleteHabit}
            onEdit={editHabit}
          />
        ))}
      </div>
    </div>
  )
}

const S = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', marginTop: '12px' },
  habitCard: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' },
  habitName: { fontSize: '14px', fontWeight: '500' },
  freqChip: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--accent)', background: 'rgba(90,122,0,0.07)', padding: '2px 7px', borderRadius: '2px' },
  streakRow: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', background: 'var(--s2)', borderRadius: '3px', overflow: 'hidden', border: '1px solid var(--border)' },
  statCell: { padding: '10px 8px', textAlign: 'center' },
  statLabel: { fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.08em', marginTop: '2px' },
  missNote: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--amber)', background: 'rgba(179,106,0,0.07)', border: '1px solid rgba(179,106,0,0.2)', borderRadius: '3px', padding: '6px 10px', marginTop: '10px' },
  todayBtn: { marginTop: '14px', width: '100%', padding: '9px', background: 'none', border: '1px solid var(--border)', borderRadius: '3px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--mid)', cursor: 'pointer', transition: 'all 0.15s' },
  todayBtnDone: { background: 'rgba(90,122,0,0.07)', borderColor: 'rgba(90,122,0,0.3)', color: 'var(--accent)' },
  summaryBar: { display: 'flex', alignItems: 'center', background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '12px 16px', marginBottom: '16px' },
  formCard: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '18px', marginBottom: '16px' },
  formTitle: { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--dim)', marginBottom: '12px' },
  fieldLabel: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '6px' },
  input: { width: '100%', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' },
  addBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: '3px', padding: '6px 14px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--mid)', cursor: 'pointer' },
  editBtn: { background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--dim)', cursor: 'pointer', padding: '2px 4px' },
  emptyState: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '32px', textAlign: 'center' },
  dimText: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
}
