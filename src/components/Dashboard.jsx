import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SectionLabel, ProgressBar, Spinner } from './UI'

export default function Dashboard({ userId, onNavigate }) {
  const [data, setData] = useState(null)

  useEffect(() => { load() }, [userId])

  async function load() {
    const [
      { data: projects },
      { data: milestones },
      { data: weightLogs },
      { data: goals },
      { data: fitness },
      { data: home },
    ] = await Promise.all([
      supabase.from('projects').select('id, name, rag').eq('user_id', userId),
      supabase.from('milestones').select('project_id, done').eq('user_id', userId),
      supabase.from('weight_logs').select('value, unit').eq('user_id', userId).order('logged_at', { ascending: false }).limit(1),
      supabase.from('user_goals').select('*').eq('user_id', userId).single(),
      supabase.from('fitness_logs').select('logged_date').eq('user_id', userId)
        .gte('logged_date', getMonday()).lte('logged_date', getSunday()),
      supabase.from('home_items').select('done').eq('user_id', userId),
    ])
    setData({ projects, milestones, weightLogs, goals, fitness, home })
  }

  if (!data) return <Spinner />

  const { projects = [], milestones = [], weightLogs = [], goals, fitness = [], home = [] } = data
  const totalMs = milestones.length
  const doneMs = milestones.filter(m => m.done).length
  const atRisk = (projects || []).filter(p => p.rag !== 'g').length
  const currentWeight = weightLogs[0]?.value
  const targetWeight = goals?.weight_target || 165
  const weightUnit = goals?.weight_unit || 'lbs'
  const fitnessGoal = goals?.fitness_goal || 4
  const workoutsThisWeek = fitness.length
  const homeDone = home.filter(i => i.done).length

  const overviewCells = [
    { label: 'Work Milestones', value: `${doneMs}/${totalMs}`, sub: `${totalMs ? Math.round(doneMs/totalMs*100) : 0}% complete` },
    { label: 'At Risk / Blocked', value: atRisk, sub: 'of 4 work projects', color: atRisk > 0 ? 'var(--amber)' : 'var(--accent)' },
    { label: 'Weight to Goal', value: currentWeight ? `${(currentWeight - targetWeight).toFixed(0)} ${weightUnit}` : '—', sub: `Current: ${currentWeight ?? '—'} · Target: ${targetWeight}` },
    { label: 'Workouts This Week', value: `${workoutsThisWeek}/${fitnessGoal}`, sub: workoutsThisWeek >= fitnessGoal ? 'Goal met ✓' : 'Keep going', color: workoutsThisWeek >= fitnessGoal ? 'var(--accent)' : 'var(--text)' },
  ]

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Overview grid */}
      <div style={styles.ovGrid}>
        {overviewCells.map((c, i) => (
          <div key={i} style={styles.ovCell}>
            <div style={styles.ovLabel}>{c.label}</div>
            <div style={{ ...styles.ovValue, color: c.color || 'var(--text)' }}>{c.value}</div>
            <div style={styles.ovSub}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Work projects strip */}
      <SectionLabel style={{ marginTop: '28px' }}>WORK PROJECTS — P0</SectionLabel>
      {(projects || []).map(p => {
        const ms = milestones.filter(m => m.project_id === p.id)
        const done = ms.filter(m => m.done).length
        const pct = ms.length ? Math.round(done / ms.length * 100) : 0
        const RAG = { g: { label: 'On Track', color: 'var(--accent)' }, a: { label: 'At Risk', color: 'var(--amber)' }, r: { label: 'Blocker', color: 'var(--red)' } }
        const rag = RAG[p.rag] || RAG.g
        return (
          <div key={p.id} style={styles.strip} onClick={() => onNavigate('work')} className="animate-in">
            <div style={{ flex: 1 }}>
              <div style={styles.stripName}>{p.name}</div>
              <div style={styles.stripMeta}>{done}/{ms.length} milestones</div>
              <ProgressBar pct={pct} style={{ marginTop: '8px' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ ...styles.ragDot, background: rag.color, margin: '0 auto 3px' }} />
              <div style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: rag.color }}>{rag.label}</div>
            </div>
          </div>
        )
      })}

      {/* Personal goals strip */}
      <SectionLabel style={{ marginTop: '28px' }}>PERSONAL GOALS — P0</SectionLabel>
      <div style={styles.goalRow}>
        {[
          {
            icon: '⚖️', label: 'Weight', view: 'weight',
            summary: currentWeight ? `${currentWeight} → ${targetWeight} ${weightUnit}` : `Target: ${targetWeight} ${weightUnit}`,
            pct: currentWeight ? Math.max(0, Math.min(100, Math.round(((currentWeight - targetWeight) / Math.max(1, currentWeight - targetWeight + 5)) * 100))) : 0,
          },
          {
            icon: '💪', label: 'Fitness', view: 'fitness',
            summary: `${workoutsThisWeek}/${fitnessGoal} workouts this week`,
            pct: Math.min(100, Math.round(workoutsThisWeek / fitnessGoal * 100)),
          },
          {
            icon: '🏡', label: 'Home', view: 'home',
            summary: `${homeDone}/${home.length} projects done`,
            pct: home.length ? Math.round(homeDone / home.length * 100) : 0,
          },
        ].map(g => (
          <div key={g.label} style={styles.goalCard} onClick={() => onNavigate(g.view)}>
            <div style={{ fontSize: '18px', marginBottom: '6px' }}>{g.icon}</div>
            <div style={styles.goalName}>{g.label}</div>
            <div style={styles.goalSummary}>{g.summary}</div>
            <ProgressBar pct={g.pct} style={{ marginTop: '10px' }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function getMonday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  return d.toISOString().split('T')[0]
}

function getSunday() {
  const d = new Date()
  const day = d.getDay()
  d.setDate(d.getDate() + (6 - day))
  return d.toISOString().split('T')[0]
}

const styles = {
  ovGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4,1fr)',
    gap: '1px', background: 'var(--border)',
    border: '1px solid var(--border)', borderRadius: '4px',
    overflow: 'hidden',
  },
  ovCell: { background: 'var(--s1)', padding: '18px' },
  ovLabel: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '8px' },
  ovValue: { fontFamily: 'var(--mono)', fontSize: '28px', fontWeight: '600', lineHeight: 1 },
  ovSub: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--dim)', marginTop: '6px' },
  strip: {
    display: 'flex', alignItems: 'center', gap: '20px',
    background: 'var(--s1)', border: '1px solid var(--border)',
    borderRadius: '4px', padding: '14px 16px', marginBottom: '8px',
    cursor: 'pointer', transition: 'border-color 0.15s',
  },
  stripName: { fontSize: '13px', fontWeight: '500' },
  stripMeta: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', marginTop: '2px' },
  ragDot: { width: '7px', height: '7px', borderRadius: '50%' },
  goalRow: { display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' },
  goalCard: {
    background: 'var(--s1)', border: '1px solid var(--border)',
    borderRadius: '4px', padding: '16px',
    cursor: 'pointer', transition: 'border-color 0.15s',
  },
  goalName: { fontSize: '13px', fontWeight: '500' },
  goalSummary: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', marginTop: '3px' },
}
