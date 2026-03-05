import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Btn, SectionLabel, Spinner } from './UI'
import { today, tomorrow, nextOccurrence } from '../lib/dates'

const FREQ_LABELS = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Every 2 weeks', monthly: 'Monthly' }
const FREQ_OPTIONS = Object.entries(FREQ_LABELS)

// ─── Generate due actions from templates ──────────────
export async function generateRecurringActions(userId) {
  const t = today()
  const { data: templates } = await supabase
    .from('recurring_actions')
    .select('*')
    .eq('user_id', userId)
    .eq('active', true)

  if (!templates?.length) return

  for (const tmpl of templates) {
    // Determine if we need to generate a new instance
    const lastGen = tmpl.last_generated
    let shouldGenerate = false
    let eta = t

    if (!lastGen) {
      shouldGenerate = true
    } else {
      const next = nextOccurrence(lastGen, tmpl.frequency)
      if (next <= t) { shouldGenerate = true; eta = next <= t ? t : next }
    }

    if (!shouldGenerate) continue

    // Check if an instance already exists for today
    const { data: existing } = await supabase
      .from('actions')
      .select('id')
      .eq('user_id', userId)
      .eq('recur_template_id', tmpl.id)
      .eq('eta', eta)
      .limit(1)

    if (existing?.length) continue

    // Create the action instance
    await supabase.from('actions').insert({
      user_id: userId,
      project_id: tmpl.project_id,
      milestone_id: tmpl.milestone_id,
      text: tmpl.text,
      done: false,
      eta,
      recurring: true,
      frequency: tmpl.frequency,
      recur_template_id: tmpl.id,
    })

    // Update last_generated
    await supabase.from('recurring_actions').update({ last_generated: eta }).eq('id', tmpl.id)
  }
}

// ─── Add recurring action form ────────────────────────
function AddRecurringForm({ userId, projects, milestones, onAdd, onClose }) {
  const [text, setText] = useState('')
  const [freq, setFreq] = useState('daily')
  const [projectId, setProjectId] = useState(projects[0]?.id || '')
  const [milestoneId, setMilestoneId] = useState('')

  const projectMilestones = milestones.filter(m => m.project_id === projectId)

  async function submit() {
    if (!text.trim() || !projectId) return
    const { data } = await supabase.from('recurring_actions').insert({
      user_id: userId,
      project_id: projectId,
      milestone_id: milestoneId || null,
      text: text.trim(),
      frequency: freq,
      active: true,
    }).select().single()
    if (data) { onAdd(data); onClose() }
  }

  return (
    <div style={S.formCard}>
      <div style={S.formTitle}>NEW RECURRING ACTION</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <input style={S.input} autoFocus placeholder="Action text…" value={text} onChange={e => setText(e.target.value)} />

        <div style={S.row}>
          <div style={{ flex: 1 }}>
            <div style={S.fieldLabel}>Frequency</div>
            <select style={S.select} value={freq} onChange={e => setFreq(e.target.value)}>
              {FREQ_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div style={{ flex: 2 }}>
            <div style={S.fieldLabel}>Project</div>
            <select style={S.select} value={projectId} onChange={e => { setProjectId(e.target.value); setMilestoneId('') }}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        {projectMilestones.length > 0 && (
          <div>
            <div style={S.fieldLabel}>Milestone (optional)</div>
            <select style={S.select} value={milestoneId} onChange={e => setMilestoneId(e.target.value)}>
              <option value="">— Project level —</option>
              {projectMilestones.map(m => <option key={m.id} value={m.id}>{m.text}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px' }}>
          <Btn onClick={submit}>Create</Btn>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
        </div>
      </div>
    </div>
  )
}

// ─── Recurring action row ─────────────────────────────
function RecurRow({ tmpl, projects, milestones, onToggle, onDelete }) {
  const project = projects.find(p => p.id === tmpl.project_id)
  const milestone = milestones.find(m => m.id === tmpl.milestone_id)

  return (
    <div style={S.row2}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.tmplText}>{tmpl.text}</div>
        <div style={S.tmplMeta}>
          <span style={{ ...S.freqBadge, opacity: tmpl.active ? 1 : 0.4 }}>↻ {FREQ_LABELS[tmpl.frequency]}</span>
          <span>{project?.name}</span>
          {milestone && <><span style={{ color: 'var(--border2)' }}>›</span><span>{milestone.text}</span></>}
          {tmpl.last_generated && <span>Last: {tmpl.last_generated}</span>}
        </div>
      </div>

      <label style={S.toggle}>
        <input type="checkbox" checked={tmpl.active} onChange={() => onToggle(tmpl)} style={{ display: 'none' }} />
        <div style={{ ...S.toggleTrack, background: tmpl.active ? 'var(--accent)' : 'var(--border2)' }}>
          <div style={{ ...S.toggleThumb, transform: tmpl.active ? 'translateX(14px)' : 'translateX(0)' }} />
        </div>
        <span style={S.dimText}>{tmpl.active ? 'Active' : 'Paused'}</span>
      </label>

      <button style={S.delBtn} onClick={() => onDelete(tmpl)} title="Delete">✕</button>
    </div>
  )
}

// ─── Main RecurringManager component ─────────────────
export default function RecurringManager({ userId }) {
  const [templates, setTemplates] = useState([])
  const [projects, setProjects]   = useState([])
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)

  useEffect(() => { load() }, [userId])

  async function load() {
    setLoading(true)
    await generateRecurringActions(userId)
    const [{ data: tRows }, { data: pRows }, { data: mRows }] = await Promise.all([
      supabase.from('recurring_actions').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('projects').select('id,name').eq('user_id', userId),
      supabase.from('milestones').select('id,text,project_id').eq('user_id', userId),
    ])
    setTemplates(tRows || [])
    setProjects(pRows || [])
    setMilestones(mRows || [])
    setLoading(false)
  }

  async function toggleActive(tmpl) {
    const active = !tmpl.active
    setTemplates(prev => prev.map(t => t.id === tmpl.id ? { ...t, active } : t))
    await supabase.from('recurring_actions').update({ active }).eq('id', tmpl.id)
  }

  async function deleteTemplate(tmpl) {
    setTemplates(prev => prev.filter(t => t.id !== tmpl.id))
    await supabase.from('recurring_actions').delete().eq('id', tmpl.id)
  }

  if (loading) return <Spinner />

  const byFreq = FREQ_OPTIONS.map(([freq, label]) => ({
    freq, label,
    items: templates.filter(t => t.frequency === freq)
  })).filter(g => g.items.length > 0)

  return (
    <div className="page-pad">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <SectionLabel style={{ marginBottom: 0 }}>RECURRING ACTIONS</SectionLabel>
        <button style={S.addBtn} onClick={() => setShowForm(true)}>+ New Recurring Action</button>
      </div>

      {showForm && (
        <AddRecurringForm
          userId={userId}
          projects={projects}
          milestones={milestones}
          onAdd={t => setTemplates(prev => [...prev, t])}
          onClose={() => setShowForm(false)}
        />
      )}

      {templates.length === 0 && !showForm && (
        <div style={S.emptyState}>
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>↻</div>
          <div style={S.tmplText}>No recurring actions yet</div>
          <div style={{ ...S.dimText, marginTop: '4px' }}>Create recurring actions to auto-generate daily, weekly, or monthly tasks against your projects.</div>
        </div>
      )}

      {byFreq.map(({ freq, label, items }) => (
        <div key={freq} style={{ marginBottom: '20px' }}>
          <div style={S.freqHeader}>{label}</div>
          <div style={S.block}>
            {items.map(tmpl => (
              <RecurRow
                key={tmpl.id}
                tmpl={tmpl}
                projects={projects}
                milestones={milestones}
                onToggle={toggleActive}
                onDelete={deleteTemplate}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const S = {
  formCard: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '18px', marginBottom: '16px' },
  formTitle: { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.15em', color: 'var(--dim)', marginBottom: '12px' },
  row: { display: 'flex', gap: '10px' },
  row2: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  fieldLabel: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '5px' },
  input: { width: '100%', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '8px 10px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none' },
  select: { width: '100%', background: 'var(--s2)', border: '1px solid var(--border)', borderRadius: '3px', padding: '7px 10px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--text)', outline: 'none' },
  block: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', overflow: 'hidden' },
  freqHeader: { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '6px' },
  tmplText: { fontSize: '13px', fontWeight: '500' },
  tmplMeta: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--dim)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px', flexWrap: 'wrap' },
  freqBadge: { background: 'rgba(90,122,0,0.08)', color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: '9px', padding: '1px 6px', borderRadius: '2px' },
  toggle: { display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flexShrink: 0 },
  toggleTrack: { width: '28px', height: '16px', borderRadius: '8px', position: 'relative', transition: 'background 0.2s', flexShrink: 0 },
  toggleThumb: { position: 'absolute', top: '2px', left: '2px', width: '12px', height: '12px', borderRadius: '50%', background: '#fff', transition: 'transform 0.2s' },
  delBtn: { background: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--dim)', cursor: 'pointer', padding: '2px 6px', opacity: 0.4, transition: 'opacity 0.15s', flexShrink: 0 },
  addBtn: { background: 'none', border: '1px solid var(--border)', borderRadius: '3px', padding: '6px 14px', fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--mid)', cursor: 'pointer' },
  emptyState: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '32px', textAlign: 'center' },
  dimText: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
}
