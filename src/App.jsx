import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import WorkProjects from './components/WorkProjects'
import WeightTracker from './components/WeightTracker'
import FitnessTracker from './components/FitnessTracker'
import HomeImprovement from './components/HomeImprovement'
import TechPlan from './components/TechPlan'

const NAV = [
  { group: 'Overview',      items: [{ id: 'dashboard', label: 'Dashboard' }] },
  { group: 'Work — P0',     items: [{ id: 'work',      label: 'Projects',    badge: '4', p0: true }] },
  { group: 'Personal — P0', items: [
    { id: 'weight',  label: 'Weight' },
    { id: 'fitness', label: 'Fitness' },
    { id: 'home',    label: 'Home Improvement' },
  ]},
  { group: 'System',        items: [{ id: 'tech', label: 'Tech Solution' }] },
]

export default function App() {
  const [session, setSession] = useState(undefined) // undefined = loading
  const [view, setView] = useState('dashboard')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--dim)' }}>Loading…</div>
    </div>
  )

  if (!session) return <Auth />

  const userId = session.user.id

  function renderView() {
    switch (view) {
      case 'dashboard': return <Dashboard userId={userId} onNavigate={setView} />
      case 'work':      return <WorkProjects userId={userId} />
      case 'weight':    return <WeightTracker userId={userId} />
      case 'fitness':   return <FitnessTracker userId={userId} />
      case 'home':      return <HomeImprovement userId={userId} />
      case 'tech':      return <TechPlan />
      default:          return <Dashboard userId={userId} onNavigate={setView} />
    }
  }

  const PAGE_TITLES = {
    dashboard: ['Dashboard', 'All P0 items — work & personal'],
    work:      ['Work Projects', 'Click a project to expand milestones'],
    weight:    ['Weight', 'Log readings and track progress toward your target'],
    fitness:   ['Fitness', 'Track weekly workouts — tap a day to mark it done'],
    home:      ['Home Improvement', 'Project checklist with estimated costs'],
    tech:      ['Tech Solution', 'MLP build plan — web + app + AI stack'],
  }
  const [title, subtitle] = PAGE_TITLES[view] || PAGE_TITLES.dashboard

  return (
    <div style={styles.shell}>
      {/* Topbar */}
      <header style={styles.topbar}>
        <div>
          <div style={styles.wordmark}>MLP<span style={{ color: 'var(--accent)' }}>·</span>COMMAND CENTER</div>
        </div>
        <div style={styles.topRight}>
          <span style={styles.userEmail}>{session.user.email}</span>
          <button style={styles.signOut} onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>

      {/* Sidebar */}
      <aside style={styles.sidebar}>
        {NAV.map(group => (
          <div key={group.group} style={styles.navGroup}>
            <div style={styles.navGroupLabel}>{group.group}</div>
            {group.items.map(item => (
              <div
                key={item.id}
                style={{ ...styles.navItem, ...(view === item.id ? styles.navItemActive : {}) }}
                onClick={() => setView(item.id)}
              >
                {item.label}
                {item.badge && (
                  <span style={{ ...styles.badge, ...(item.p0 ? styles.badgeP0 : {}) }}>
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}
      </aside>

      {/* Main */}
      <main style={styles.main}>
        <div style={styles.pageHead}>
          <div style={styles.pageTitle}>{title}</div>
          <div style={styles.pageSubtitle}>{subtitle}</div>
        </div>
        <div key={view} className="animate-in">
          {renderView()}
        </div>
      </main>
    </div>
  )
}

const styles = {
  shell: {
    display: 'grid',
    gridTemplateColumns: '220px 1fr',
    gridTemplateRows: '52px 1fr',
    height: '100vh',
    overflow: 'hidden',
  },
  topbar: {
    gridColumn: '1 / -1',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 24px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--bg)',
    zIndex: 10,
  },
  wordmark: { fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.12em' },
  topRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  userEmail: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
  signOut: {
    background: 'none', border: '1px solid var(--border)',
    borderRadius: '3px', padding: '4px 10px',
    fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--mid)',
    cursor: 'pointer', transition: 'all 0.15s',
  },
  sidebar: {
    borderRight: '1px solid var(--border)',
    background: 'var(--s1)',
    overflowY: 'auto',
    padding: '20px 0',
  },
  navGroup: { marginBottom: '24px' },
  navGroupLabel: {
    fontFamily: 'var(--mono)', fontSize: '9px', fontWeight: '600',
    letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dim)',
    padding: '0 18px 8px',
  },
  navItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 18px',
    fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--mid)',
    cursor: 'pointer', borderLeft: '2px solid transparent',
    transition: 'color 0.1s',
    userSelect: 'none',
  },
  navItemActive: {
    color: 'var(--text)',
    borderLeftColor: 'var(--accent)',
    background: 'rgba(90,122,0,0.05)',
  },
  badge: {
    fontFamily: 'var(--mono)', fontSize: '10px',
    background: 'var(--s2)', color: 'var(--dim)',
    padding: '1px 6px', borderRadius: '2px',
  },
  badgeP0: { color: 'var(--accent)', background: 'rgba(90,122,0,0.08)' },
  main: { overflowY: 'auto', background: 'var(--bg)' },
  pageHead: {
    padding: '24px 32px 20px',
    borderBottom: '1px solid var(--border)',
  },
  pageTitle: { fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '600', letterSpacing: '-0.02em' },
  pageSubtitle: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', marginTop: '3px' },
}
