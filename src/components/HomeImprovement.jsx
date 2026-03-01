import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, Input, SectionLabel, ProgressBar, Spinner } from './UI'

const DEFAULTS = [
  { text: 'Kitchen — cabinets & countertops', cost: '$8,000' },
  { text: 'Replace HVAC system', cost: '$6,500' },
  { text: 'Backyard deck & landscaping', cost: '$4,000' },
  { text: 'Master bathroom remodel', cost: '$5,000' },
  { text: 'Smart home (security, lighting, thermostat)', cost: '$1,200' },
  { text: 'Garage organization & epoxy floor', cost: '$800', done: true },
]

export default function HomeImprovement({ userId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [newCost, setNewCost] = useState('')
  const [seeded, setSeeded] = useState(false)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('home_items')
      .select('*')
      .eq('user_id', userId)
      .order('position')

    if (data && data.length > 0) {
      setItems(data)
    } else if (!seeded) {
      setSeeded(true)
      const rows = DEFAULTS.map((d, i) => ({
        user_id: userId, text: d.text, cost: d.cost,
        done: d.done || false, position: i,
      }))
      const { data: inserted } = await supabase.from('home_items').insert(rows).select()
      setItems(inserted || [])
    }
    setLoading(false)
  }

  async function toggleItem(item) {
    const newDone = !item.done
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, done: newDone } : i))
    await supabase.from('home_items').update({ done: newDone }).eq('id', item.id)
  }

  async function addItem() {
    if (!newText.trim()) return
    const position = items.length
    const { data } = await supabase
      .from('home_items')
      .insert({ user_id: userId, text: newText.trim(), cost: newCost.trim() || null, done: false, position })
      .select().single()
    if (data) setItems(prev => [...prev, data])
    setNewText('')
    setNewCost('')
  }

  if (loading) return <Spinner />

  const done = items.filter(i => i.done).length
  const total = items.length
  const pct = total ? Math.round((done / total) * 100) : 0
  const remaining = items
    .filter(i => !i.done && i.cost)
    .reduce((sum, i) => sum + parseInt((i.cost || '0').replace(/[^0-9]/g, '')), 0)

  return (
    <div style={{ padding: '28px 32px' }}>
      <SectionLabel>HOME IMPROVEMENT — P0</SectionLabel>

      {/* Stats */}
      <div style={styles.grid3}>
        <div style={styles.cell}>
          <div style={styles.cellLabel}>Done</div>
          <div style={styles.cellVal}>{done}<span style={styles.unit}> / {total}</span></div>
        </div>
        <div style={styles.cell}>
          <div style={styles.cellLabel}>Progress</div>
          <div style={styles.cellVal}>{pct}<span style={styles.unit}>%</span></div>
        </div>
        <div style={styles.cell}>
          <div style={styles.cellLabel}>Budget Remaining</div>
          <div style={{ ...styles.cellVal, fontSize: '16px', marginTop: '2px' }}>${remaining.toLocaleString()}</div>
        </div>
      </div>

      <ProgressBar pct={pct} style={{ marginBottom: '20px' }} />

      {/* Item list */}
      <div style={styles.list}>
        {items.map(item => (
          <div key={item.id} style={styles.row} onClick={() => toggleItem(item)}>
            <div style={{ ...styles.circle, ...(item.done ? styles.circleDone : {}) }}>
              {item.done && <span style={styles.check}>✓</span>}
            </div>
            <span style={{ ...styles.itemText, ...(item.done ? styles.itemDone : {}) }}>
              {item.text}
            </span>
            {item.cost && <span style={styles.cost}>{item.cost}</span>}
          </div>
        ))}
      </div>

      {/* Add new */}
      <SectionLabel style={{ marginTop: '24px' }}>ADD PROJECT</SectionLabel>
      <div style={styles.addRow}>
        <Input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          placeholder="Project name…"
          style={{ flex: 1 }}
        />
        <Input
          value={newCost}
          onChange={e => setNewCost(e.target.value)}
          placeholder="Est. cost"
          style={{ width: '110px' }}
        />
        <Btn onClick={addItem}>Add</Btn>
      </div>
    </div>
  )
}

const styles = {
  grid3: {
    display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
    gap: '1px', background: 'var(--border)',
    border: '1px solid var(--border)', borderRadius: '4px',
    overflow: 'hidden', marginBottom: '16px',
  },
  cell: { background: 'var(--s1)', padding: '14px 16px' },
  cellLabel: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '6px' },
  cellVal: { fontFamily: 'var(--mono)', fontSize: '22px', fontWeight: '600' },
  unit: { fontSize: '13px', color: 'var(--mid)' },
  list: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' },
  row: {
    display: 'flex', alignItems: 'center', gap: '12px',
    padding: '11px 16px', borderBottom: '1px solid var(--border)',
    cursor: 'pointer', transition: 'background 0.1s',
  },
  circle: {
    width: '16px', height: '16px', borderRadius: '50%',
    border: '1.5px solid var(--border2)', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s',
  },
  circleDone: { background: 'var(--accent)', borderColor: 'var(--accent)' },
  check: { fontSize: '9px', color: '#fff', fontWeight: '700' },
  itemText: { flex: 1, fontSize: '13px' },
  itemDone: { color: 'var(--dim)', textDecoration: 'line-through' },
  cost: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
  addRow: { display: 'flex', gap: '8px', alignItems: 'center' },
}
