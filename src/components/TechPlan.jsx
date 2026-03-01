import { SectionLabel } from './UI'

const STACK = [
  { title: 'Web App', items: [['React + Vite', 'SPA framework'], ['Tailwind CSS', 'Styling'], ['React Query', 'Data layer'], ['Recharts', 'Dashboards'], ['Vercel', 'Hosting']] },
  { title: 'Mobile App', items: [['React Native + Expo', 'iOS & Android'], ['Expo EAS', 'OTA builds'], ['Push Notifications', 'Daily nudges'], ['SQLite local', 'Offline-first']] },
  { title: 'Backend', items: [['Supabase', 'DB + Auth + Realtime'], ['PostgreSQL', 'Projects & goals'], ['Row-level security', 'Private data'], ['Edge Functions', 'Serverless logic'], ['Google SSO', 'Auth (Phase 2)']] },
  { title: 'AI / Agentic', items: [['Claude API', 'Reasoning engine'], ['Amazon Bedrock', 'Inbound AI agent'], ['LangChain', 'Orchestration'], ['pgvector', 'RAG / context'], ['Webhooks', 'Event triggers']] },
]

const ROADMAP = [
  { phase: 'Phase 0 — Done', title: 'HTML Prototype', desc: 'Single-file app. Validated the data model. Deployed to Netlify.', status: 'done' },
  { phase: 'Phase 1 — Now', title: 'React + Supabase', desc: 'This version. Auth, real database, cross-device sync, PWA.', status: 'now' },
  { phase: 'Phase 2 — Next', title: 'Mobile App (React Native)', desc: 'iOS + Android. Push reminders. Quick-log weight & workouts. Offline-first sync.', status: '' },
  { phase: 'Phase 3 — Future', title: 'Inbound Agentic AI', desc: 'Amazon Bedrock agent. Order handling & routing. Human-in-the-loop. Claude API summaries.', status: '' },
  { phase: 'Phase 4 — Future', title: 'E2E Reconciliation Live Data', desc: 'Shipping charges + PO snapshot pipelines. Electronic remittance BRD integrated. Anomaly alerts.', status: '' },
]

export default function TechPlan() {
  return (
    <div style={{ padding: '28px 32px' }}>
      <SectionLabel>STACK</SectionLabel>
      <div style={styles.techGrid}>
        {STACK.map(block => (
          <div key={block.title} style={styles.techBlock}>
            <div style={styles.techTitle}>{block.title}</div>
            {block.items.map(([name, desc]) => (
              <div key={name} style={styles.stackRow}>
                <span>{name}</span>
                <span style={styles.stackDesc}>{desc}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <SectionLabel style={{ marginTop: '28px' }}>BUILD ROADMAP</SectionLabel>
      <div style={styles.roadmapBlock}>
        <div style={styles.roadmap}>
          {ROADMAP.map((item, i) => (
            <div key={i} style={styles.rmItem}>
              <div style={{ ...styles.rmDot, ...(item.status === 'done' ? styles.rmDotDone : item.status === 'now' ? styles.rmDotNow : {}) }} />
              <div>
                <div style={styles.rmPhase}>{item.phase}</div>
                <div style={styles.rmTitle}>{item.title}</div>
                <div style={styles.rmDesc}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const styles = {
  techGrid: { display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '4px' },
  techBlock: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '16px 18px' },
  techTitle: { fontFamily: 'var(--mono)', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '12px' },
  stackRow: { display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' },
  stackDesc: { fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--dim)' },
  roadmapBlock: { background: 'var(--s1)', border: '1px solid var(--border)', borderRadius: '4px', padding: '16px 18px' },
  roadmap: { position: 'relative', paddingLeft: '22px' },
  rmItem: { position: 'relative', paddingLeft: '18px', paddingBottom: '18px', borderLeft: '1px solid var(--border)', marginLeft: '4px' },
  rmDot: { position: 'absolute', left: '-5px', top: '4px', width: '8px', height: '8px', borderRadius: '50%', border: '1.5px solid var(--border2)', background: 'var(--bg)' },
  rmDotDone: { background: 'var(--accent)', borderColor: 'var(--accent)' },
  rmDotNow: { background: 'var(--bg)', borderColor: 'var(--accent)', boxShadow: '0 0 0 3px rgba(90,122,0,0.12)' },
  rmPhase: { fontFamily: 'var(--mono)', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--dim)', marginBottom: '2px' },
  rmTitle: { fontSize: '13px', fontWeight: '500', marginBottom: '3px' },
  rmDesc: { fontSize: '12px', color: 'var(--mid)', lineHeight: 1.6 },
}
