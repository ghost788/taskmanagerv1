import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, Input, SectionLabel, ProgressBar, Spinner } from './UI'

export default function WeightTracker({ userId }) {
  const [logs, setLogs] = useState([])
  const [goal, setGoal] = useState({ weight_target: 165, weight_unit: 'lbs' })
  const [inputVal, setInputVal] = useState('')
  const [inputUnit, setInputUnit] = useState('lbs')
  const [loading, setLoading] = useState(true)
  const [targetInput, setTargetInput] = useState('')
  const [savingTarget, setSavingTarget] = useState(false)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    const [{ data: goalData }, { data: logData }] = await Promise.all([
      supabase.from('user_goals').select('*').eq('user_id', userId).single(),
      supabase.from('weight_logs').select('*').eq('user_id', userId).order('logged_at', { ascending: false }).limit(14),
    ])
    if (goalData) {
      setGoal(goalData)
      setInputUnit(goalData.weight_unit)
    } else {
      await supabase.from('user_goals').insert({ user_id: userId, weight_target: 165, weight_unit: 'lbs', fitness_goal: 4 })
    }
    setLogs(logData || [])
    setLoading(false)
  }

  async function logWeight() {
    const val = parseFloat(inputVal)
    if (!val || val < 50 || val > 600) return
    const { data } = await supabase
      .from('weight_logs')
      .insert({ user_id: userId, value: val, unit: inputUnit })
      .select().single()
    if (data) setLogs(prev => [data, ...prev].slice(0, 14))
    setInputVal('')
  }

  async function saveTarget() {
    const val = parseFloat(targetInput)
    if (!val) return
    setSavingTarget(true)
    await supabase.from('user_goals').upsert({ user_id: userId, weight_target: val, weight_unit: inputUnit, fitness_goal: goal.fitness_goal || 4 })
    setGoal(prev => ({ ...prev, weight_target: val, weight_unit: inputUnit }))
    setTargetInput('')
    setSavingTarget(false)
  }

  if (loading) return <Spinner />

  const current = logs[0]?.value
  const target = goal.weight_target
  const startVal = logs[logs.length - 1]?.value || current
  const lost = current && startVal ? (startVal - current).toFixed(1) : '—'
  const toGo = current ? (current - target).toFixed(1) : '—'
  const pct = (current && startVal && startVal !== target)
    ? Math.max(0, Math.min(100, Math.round(((startVal - current) / (startVal - target)) * 100)))
    : 0

  // Sparkline
  const sparkLogs = [...logs].reverse()
  const allVals = sparkLogs.map(l => l.value).concat(target)
  const maxV = Math.max(...allVals), minV = Math.min(...allVals)
  const range = maxV - minV || 1
  const barH = v => Math.max(4, Math.round(((v - minV) / range) * 40))

  return (
    <div className="page-pad">
      <SectionLabel>WEIGHT — P0</SectionLabel>

      {/* Readout grid */}
      <div style={styles.grid3}>
        <div style={styles.cell}>
          <div style={styles.cellLabel}>Current</div>
          <div style={styles.cellVal}>{current ?? '—'} <span style={styles.unit}>{goal.weight_unit}</span></div>
        </div>
        <div style={styles.cell}>
          <div style={styles.cellLabel}>Target</div>
          <div style={{ ...styles.cellVal, color: 'var(--accent)' }}>{target} <span style={styles.unit}>{goal.weight_unit}</span></div>
        </div>
        <div style={styles.cell}>
          <div style={styles.cellLabel}>To Go</div>
          <div style={{ ...styles.cellVal, color: 'var(--amber)' }}>{toGo} <span style={styles.unit}>{goal.weight_unit}</span></div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={styles.label}>Progress to goal</span>
          <span style={styles.label}>{pct}% · lost {lost} {goal.weight_unit}</span>
        </div>
        <ProgressBar pct={pct} />
      </div>

      {/* Sparkline */}
      {sparkLogs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <SectionLabel style={{ marginBottom: '8px' }}>Trend — {sparkLogs.length} entries</SectionLabel>
          <div style={styles.sparkline}>
            {sparkLogs.map((l, i) => (
              <div key={l.id} title={`${l.value} ${l.unit}`}
                style={{
                  ...styles.sparkBar,
                  height: `${barH(l.value)}px`,
                  borderTopColor: i === sparkLogs.length - 1 ? 'var(--accent)' : 'var(--mid)',
                }} />
            ))}
            <div title={`Target: ${target}`}
              style={{
                ...styles.sparkBar,
                height: `${barH(target)}px`,
                background: 'rgba(90,122,0,0.07)',
                borderTopColor: 'rgba(90,122,0,0.35)',
                borderTopStyle: 'dashed',
              }} />
          </div>
        </div>
      )}

      {/* Log weight */}
      <SectionLabel>LOG WEIGHT</SectionLabel>
      <div style={styles.row}>
        <Input
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          placeholder="e.g. 184.5"
          type="number"
          style={{ width: '120px' }}
        />
        <select value={inputUnit} onChange={e => setInputUnit(e.target.value)} style={styles.select}>
          <option>lbs</option>
          <option>kg</option>
        </select>
        <Btn onClick={logWeight}>Log</Btn>
      </div>

      {/* Update target */}
      <SectionLabel style={{ marginTop: '24px' }}>UPDATE TARGET</SectionLabel>
      <div style={styles.row}>
        <Input
          value={targetInput}
          onChange={e => setTargetInput(e.target.value)}
          placeholder={`Current target: ${target}`}
          type="number"
          style={{ width: '200px' }}
        />
        <Btn onClick={saveTarget} disabled={savingTarget}>{savingTarget ? 'Saving…' : 'Save'}</Btn>
      </div>

      {/* History */}
      {logs.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <SectionLabel>LOG HISTORY</SectionLabel>
          <div style={styles.historyBlock}>
            {logs.map((l, i) => (
              <div key={l.id} style={styles.histRow}>
                <span style={styles.label}>Entry {logs.length - i}</span>
                <span style={styles.label}>{new Date(l.logged_at).toLocaleDateString()}</span>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '12px' }}>{l.value} {l.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
  label: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
  sparkline: { display: 'flex', alignItems: 'flex-end', gap: '3px', height: '48px' },
  sparkBar: {
    flex: 1, minHeight: '4px',
    background: 'var(--s3)',
    borderTop: '1px solid var(--mid)',
    borderRadius: '2px 2px 0 0',
  },
  row: { display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' },
  select: {
    background: 'var(--s2)', border: '1px solid var(--border)',
    borderRadius: '3px', padding: '8px 10px',
    fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)',
    outline: 'none',
  },
  historyBlock: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' },
  histRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '10px 14px', borderBottom: '1px solid var(--border)',
  },
}
