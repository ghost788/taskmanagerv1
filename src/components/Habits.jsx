import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, SectionLabel, Spinner } from './UI'
import { today, calcStreak, formatDate } from '../lib/dates'

const FREQ_LABELS = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly' }
const ICONS = ['💊', '🏃', '📖', '💧', '🧘', '✏️', '🥗', '😴', '🚶', '🎯', '🧠', '💪', '🌿', '☀️', '🛁']
const DEFAULT_HABITS = [{ name: 'Multivitamins', icon: '💊', frequency: 'daily' }]

function HeatMap({ logDates }) {
  const logSet = new Set(logDates)
  const days = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    days.push(d.toISOString().split('T')[0])
  }
  return (
    <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginTop: '8px' }}>
      {days.map(d => (
        <div key={d} title={d + (logSet.has(d) ? ' ✓' : '')} style={{ width: '14px', height: '14px', borderRadius: '2px', background: logSet.has(d) ? 'var(--accent)' : 'var(--s3)', border: d === today() ? '1px solid var(--accent)' : '1px solid transparent' }} />
      ))}
    </div>
  )
}

function HabitCard({ habit, logs, onToggleToday, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(habit.name)
  const [icon, setIcon] = useState(habit.icon)
  const logDates = logs.map(l => l.logged_date).sort()
  const { current, longest, lastMiss } = calcStreak(logDates)
  const doneToday = logDates.includes(today())

  async function saveEdit() { await onEdit(habit, { name, icon }); setEditing(false) }

  if (editing) return (
    <div style={{ ...S.habitCard, padding: '14px 16px' }}>
      <div style={S.fieldLabel}>ICON</div>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
        {ICONS.map(ic => <button key={ic} onClick={() => setIcon(ic)} style={{ ...S.iconBtn, background: icon === ic ? 'rgba(90,122,0,0.1)' : 'none', border: `1px solid ${icon === ic ? 'var(--accent)' : 'var(--border)'}` }}>{ic}</button>)}
      </div>
      <div style={S.fieldLabel}>NAME</div>
      <input style={S.input} value={name} onChange={e => setName(e.target.value)} autoFocus />
      <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
        <Btn onClick={saveEdit} style={{ padding: '6px 14px', fontSize: '11px' }}>Save</Btn>
        <Btn variant="ghost" onClick={() => setEditing(false)} style={{ padding: '6px 14px', fontSize: '11px' }}>Cancel</Btn>
      </div>
    </div>
  )

  return (
    <div style={{ ...S.habitCard, borderTop: `3px solid ${doneToday ? 'var(--accent)' : 'var(--border)'}` }}>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
          <div style={S.iconDisplay}>{habit.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={S.habitName}>{habit.name}</div>
            <div style={S.dimText}>{FREQ_LABELS[habit.frequency]}</div>
          </div>
          <button style={S.editBtn} onClick={() => setEditing(true)}>✎</button>
          <button style={{ ...S.editBtn, color: 'var(--red)', opacity: 0.4 }} onClick={() => onDelete(habit)}>✕</button>
        </div>
        <div style={S.streakRow}>
          {[
            { val: current, label: 'Current streak', color: 'var(--text)' },
            { val: longest, label: 'Longest streak', color: 'var(--accent)' },
            { val: logDates.length, label: 'Total done', color: 'var(--text)' },
            { val: lastMiss ? formatDate(lastMiss) : '—', label: 'Last miss', color: lastMiss ? 'var(--amber)' : 'var(--dim)', small: true },
          ].map((s, i) => (
            <div key={i} style={{ ...S.statCell, borderRight: i < 3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: s.small ? '12px' : '18px', fontWeight: '600', color: s.color, marginTop: s.small ? '3px' : 0 }}>{s.val}</div>
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
        <button style={{ ...S.todayBtn, ...(doneToday ? S.todayBtnDone : {}) }} onClick={() => onToggleToday(habit)}>
          {doneToday ? '✓ Done today — tap to undo' : 'Mark done today'}
        </button>
      </div>
    </div>
  )
}

function AddHabitForm({ onAdd, onClose }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('💊')
  const [freq, setFreq] = useState('daily')
  function submit() { if (!name.trim()) return; onAdd({ name: name.trim(), icon, frequency: freq }); onClose() }
  return (
    <div style={S.formCard}>
      <div style={S.formTitle}>NEW HABIT</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <div style={S.fieldLabel}>ICON</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {ICONS.map(ic => <button key={ic} onClick={() => setIcon(ic)} style={{ ...S.iconBtn, background: icon === ic ? 'rgba(90,122,0,0.1)' : 'none', border: `1px solid ${icon === ic ? 'var(--accent)' : 'var(--border)'}` }}>{ic}</button>)}
          </div>
        </div>
        <div>
          <div style={S.fieldLabel}>NAME</div>
          <input style={S.input} autoFocus placeholder="e.g. Multivitamins, Read 30min…" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} />
        </div>
        <div>
          <div style={S.fieldLabel}>FREQUENCY</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.entries(FREQ_LABELS).map(([v, l]) => (
              <button key={v} onClick={() => setFreq(v)} style={{ ...S.freqBtn, background: freq === v ? 'rgba(90,122,0,0.08)' : 'none', borderColor: freq === v ? 'var(--accent)' : 'var(--border)', color: freq === v ? 'var(--accent)' : 'var(--dim)' }}>{l}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn onClick={submit}>Create Habit</Btn>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

export default function Habits({ userId }) {
  const [habits, setHabits] = useState([])
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [seeded, setSeeded] = useState(false)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    const [{ data: hRows }, { data: lRows }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId).order('position'),
      supabase.from('habit_logs').select('*').eq('user_id', userId).order('logged_date'),
    ])
    if (hRows && hRows.length > 0) { setHabits(hRows); setLogs(lRows || []) }
    else if (!seeded) {
      setSeeded(true)
      for (const [i, h] of DEFAULT_HABITS.entries()) {
        const { data } = await supabase.from('habits').insert({ user_id: userId, ...h, position: i }).select().single()
        if (data) setHabits([data])
      }
    }
    setLoading(false)
  }

  async function addHabit({ name, icon, frequency }) {
    const { data } = await supabase.from('habits').insert({ user_id: userId, name, icon, frequency, position: habits.length }).select().single()
    if (data) setHabits(prev => [...prev, data])
  }
  async function editHabit(habit, changes) {
    setHabits(prev => prev.map(h => h.id === habit.id ? { ...h, ...changes } : h))
    await supabase.from('habits').update(changes).eq('id', habit.id)
  }
  async function deleteHabit(habit) {
    setHabits(prev => prev.filter(h => h.id !== habit.id))
    setLogs(prev => prev.filter(l => l.habit_id !== habit.id))
    await supabase.from('habits').delete().eq('id', habit.id)
  }
  async function toggleToday(habit) {
    const t = today()
    const existing = logs.find(l => l.habit_id === habit.id && l.logged_date === t)
    if (existing) {
      setLogs(prev => prev.filter(l => l.id !== existing.id))
      await supabase.from('habit_logs').delete().eq('id', existing.id)
    } else {
      const { data } = await supabase.from('habit_logs').insert({ user_id: userId, habit_id: habit.id, logged_date: t }).select().single()
      if (data) setLogs(prev => [...prev, data])
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
        <div style={S.emptyState}><div style={{ fontSize: '28px', marginBottom: '8px' }}>💊</div><div style={S.habitName}>No habits yet</div><div style={{ ...S.dimText, marginTop: '4px' }}>Track daily habits with streak counting and a 30-day heatmap.</div></div>
      )}
      <div style={S.grid}>
        {habits.map(habit => <HabitCard key={habit.id} habit={habit} logs={logs.filter(l => l.habit_id === habit.id)} onToggleToday={toggleToday} onDelete={deleteHabit} onEdit={editHabit} />)}
      </div>
    </div>
  )
}

const S = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px', marginTop: '12px' },
  habitCard: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' },
  habitName: { fontSize: '14px', fontWeight: '500' },
  iconDisplay: { fontSize: '22px', flexShrink: 0 },
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
  input: { width: '100%', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none' },
  iconBtn: { padding: '6px', borderRadius: '3px', cursor: 'pointer', fontSize: '16px', transition: 'all 0.15s' },
  freqBtn: { padding: '5px 10px', borderRadius: '3px', border: '1px solid', fontFamily: 'var(--mono)', fontSize: '10px', cursor: 'pointer', transition: 'all 0.15s' },
  addBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: '3px', padding: '6px 14px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--mid)', cursor: 'pointer' },
  editBtn: { background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--dim)', cursor: 'pointer', padding: '2px 4px' },
  emptyState: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '32px', textAlign: 'center' },
  dimText: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
}
