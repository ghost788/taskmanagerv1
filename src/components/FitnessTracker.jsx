import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, Input, SectionLabel, ProgressBar, Spinner } from './UI'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function getWeekDates() {
  const now = new Date()
  const day = now.getDay()
  return DAYS.map((_, i) => {
    const d = new Date(now)
    d.setDate(now.getDate() - day + i)
    return d.toISOString().split('T')[0]
  })
}

export default function FitnessTracker({ userId }) {
  const [weekDates] = useState(getWeekDates)
  const [loggedDates, setLoggedDates] = useState(new Set())
  const [goal, setGoal] = useState(4)
  const [goalInput, setGoalInput] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    const startOfWeek = weekDates[0]
    const endOfWeek = weekDates[6]

    const [{ data: goalData }, { data: logs }] = await Promise.all([
      supabase.from('user_goals').select('fitness_goal').eq('user_id', userId).single(),
      supabase.from('fitness_logs').select('logged_date')
        .eq('user_id', userId)
        .gte('logged_date', startOfWeek)
        .lte('logged_date', endOfWeek),
    ])
    if (goalData?.fitness_goal) setGoal(goalData.fitness_goal)
    setLoggedDates(new Set(logs?.map(l => l.logged_date) || []))
    setLoading(false)
  }

  async function toggleDay(date) {
    if (loggedDates.has(date)) {
      setLoggedDates(prev => { const n = new Set(prev); n.delete(date); return n })
      await supabase.from('fitness_logs').delete().eq('user_id', userId).eq('logged_date', date)
    } else {
      setLoggedDates(prev => new Set([...prev, date]))
      await supabase.from('fitness_logs').insert({ user_id: userId, logged_date: date })
    }
  }

  async function saveGoal() {
    const val = parseInt(goalInput)
    if (!val || val < 1 || val > 7) return
    setGoal(val)
    setGoalInput('')
    await supabase.from('user_goals').upsert({ user_id: userId, fitness_goal: val, weight_target: 165, weight_unit: 'lbs' })
  }

  if (loading) return <Spinner />

  const done = weekDates.filter(d => loggedDates.has(d)).length
  const pct = Math.min(100, Math.round((done / goal) * 100))
  const status = done >= goal ? 'Goal met ✓' : done >= Math.ceil(goal / 2) ? 'On track' : 'Behind'
  const statusColor = done >= goal ? 'var(--accent)' : done >= Math.ceil(goal / 2) ? 'var(--amber)' : 'var(--red)'

  return (
    <div className="page-pad">
      <SectionLabel>FITNESS — P0</SectionLabel>

      {/* Stats */}
      <div style={styles.grid3}>
        <div style={styles.cell}>
          <div style={styles.cellLabel}>This Week</div>
          <div style={styles.cellVal}>{done}<span style={styles.unit}> / {goal}</span></div>
        </div>
        <div style={styles.cell}>
          <div style={styles.cellLabel}>Weekly Goal</div>
          <div style={styles.cellVal}>{goal}<span style={styles.unit}> / week</span></div>
        </div>
        <div style={styles.cell}>
          <div style={styles.cellLabel}>Status</div>
          <div style={{ ...styles.cellVal, color: statusColor, fontSize: '14px', marginTop: '4px' }}>{status}</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '20px' }}>
        <ProgressBar pct={pct} />
      </div>

      {/* Week grid */}
      <SectionLabel>THIS WEEK — tap to toggle</SectionLabel>
      <div style={styles.weekGrid}>
        {weekDates.map((date, i) => {
          const isDone = loggedDates.has(date)
          const isToday = date === new Date().toISOString().split('T')[0]
          return (
            <div
              key={date}
              onClick={() => toggleDay(date)}
              style={{
                ...styles.dayBtn,
                ...(isDone ? styles.dayBtnDone : {}),
                ...(isToday ? styles.dayBtnToday : {}),
              }}
            >
              <div style={{ ...styles.dayLabel, color: isDone ? 'var(--accent)' : isToday ? 'var(--text)' : 'var(--dim)' }}>
                {DAYS[i]}
              </div>
              <div style={{ ...styles.dayMark, color: isDone ? 'var(--accent)' : 'var(--border2)' }}>
                {isDone ? '✓' : '·'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Update goal */}
      <SectionLabel style={{ marginTop: '24px' }}>UPDATE WEEKLY GOAL</SectionLabel>
      <div style={styles.row}>
        <Input
          value={goalInput}
          onChange={e => setGoalInput(e.target.value)}
          placeholder={`Current: ${goal} workouts/week`}
          type="number"
          style={{ width: '220px' }}
        />
        <Btn onClick={saveGoal}>Save</Btn>
      </div>
    </div>
  )
}

const styles = {
  grid3: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
    gap: '1px', background: 'var(--border)',
    border: '1px solid var(--border)', borderRadius: '4px',
    overflow: 'hidden', marginBottom: '20px',
  },
  cell: { background: 'var(--s1)', padding: '14px 16px' },
  cellLabel: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '6px' },
  cellVal: { fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: '600' },
  unit: { fontSize: '13px', color: 'var(--mid)' },
  weekGrid: { display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '6px', marginBottom: '8px' },
  dayBtn: {
    background: 'var(--s2)', border: '1px solid var(--border)',
    borderRadius: '3px', padding: '10px 0', textAlign: 'center', cursor: 'pointer',
    transition: 'all 0.15s',
  },
  dayBtnDone: { background: 'rgba(90,122,0,0.07)', borderColor: 'rgba(90,122,0,0.35)' },
  dayBtnToday: { borderColor: 'var(--border2)' },
  dayLabel: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '4px' },
  dayMark: { fontSize: '14px' },
  row: { display: 'flex', gap: '8px', alignItems: 'center' },
}
