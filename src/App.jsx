import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Dashboard from './components/Dashboard'
import WorkProjects from './components/WorkProjects'
import WeightTracker from './components/WeightTracker'
import FitnessTracker from './components/FitnessTracker'
import HomeImprovement from './components/HomeImprovement'
import TechPlan from './components/TechPlan'
import TodaySheet from './components/TodaySheet'
import RecurringManager from './components/RecurringManager'
import Habits from './components/Habits'
import Inbox from './components/Inbox'

const NAV = [
  { group: 'Capture',       items: [{ id: 'inbox',     label: 'Inbox',             icon: '📥' }] },
  { group: 'Today',         items: [{ id: 'today',     label: 'Today & Tomorrow',  icon: '📋' }] },
  { group: 'Overview',      items: [{ id: 'dashboard', label: 'Dashboard',          icon: '⬛' }] },
  { group: 'Work — P0',     items: [
    { id: 'work',      label: 'Projects',         icon: '🗂', badge: '4', p0: true },
    { id: 'recurring', label: 'Recurring Actions', icon: '↻' },
  ]},
  { group: 'Personal — P0', items: [
    { id: 'habits',  label: 'Habits',           icon: '💊' },
    { id: 'weight',  label: 'Weight',           icon: '⚖️' },
    { id: 'fitness', label: 'Fitness',          icon: '💪' },
    { id: 'home',    label: 'Home Improvement', icon: '🏡' },
  ]},
  { group: 'System', items: [{ id: 'tech', label: 'Tech Solution', icon: '⚙️' }] },
]

// Bottom tabs shown on mobile (most used views)
const MOBILE_TABS = [
  { id: 'inbox',     label: 'Inbox',    icon: '📥' },
  { id: 'today',     label: 'Today',    icon: '📋' },
  { id: 'work',      label: 'Projects', icon: '🗂' },
  { id: 'habits',    label: 'Habits',   icon: '💊' },
  { id: 'dashboard', label: 'More',     icon: '☰'  },
]

const PAGE_TITLES = {
  inbox:     ['Inbox',            'Capture anything — assign to a project when ready'],
  today:     ['Today & Tomorrow', 'Your action schedule for the next 48 hours'],
  dashboard: ['Dashboard',        'All P0 items — work & personal'],
  work:      ['Work Projects',    'Click a project to expand milestones and actions'],
  recurring: ['Recurring Actions','Auto-generated daily, weekly, and monthly actions'],
  habits:    ['Habits',           'Daily habits with streak tracking and heatmap'],
  weight:    ['Weight',           'Log readings and track progress toward your target'],
  fitness:   ['Fitness',          'Track weekly workouts — tap a day to mark it done'],
  home:      ['Home Improvement', 'Project checklist with estimated costs'],
  tech:      ['Tech Solution',    'MLP build plan — web + app + AI stack'],
}

// Simple hook to detect mobile
function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const fn = () => setMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return mobile
}

export default function App() {
  const [session, setSession] = useState(undefined)
  const [view, setView] = useState('inbox')
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--dim)' }}>Loading…</div>
    </div>
  )
  if (!session) return <Auth />

  const userId = session.user.id

  function navigate(id) {
    setView(id)
    setMenuOpen(false)
  }

  function renderView() {
    switch (view) {
      case 'inbox':     return <Inbox userId={userId} />
      case 'today':     return <TodaySheet userId={userId} />
      case 'dashboard': return <Dashboard userId={userId} onNavigate={navigate} />
      case 'work':      return <WorkProjects userId={userId} />
      case 'recurring': return <RecurringManager userId={userId} />
      case 'habits':    return <Habits userId={userId} />
      case 'weight':    return <WeightTracker userId={userId} />
      case 'fitness':   return <FitnessTracker userId={userId} />
      case 'home':      return <HomeImprovement userId={userId} />
      case 'tech':      return <TechPlan />
      default:          return <Inbox userId={userId} />
    }
  }

  const [title] = PAGE_TITLES[view] || PAGE_TITLES.today

  // ── Mobile layout ──────────────────────────────────
  if (isMobile) return (
    <div style={M.shell}>
      {/* Mobile topbar */}
      <header style={M.topbar}>
        <div style={M.wordmark}>MLP<span style={{ color: 'var(--accent)' }}>·</span>{title}</div>
        <button style={M.menuBtn} onClick={() => setMenuOpen(x => !x)}>☰</button>
      </header>

      {/* Slide-down full menu */}
      {menuOpen && (
        <div style={M.menuOverlay} onClick={() => setMenuOpen(false)}>
          <div style={M.menuPanel} onClick={e => e.stopPropagation()}>
            <div style={M.menuHeader}>
              <span style={M.menuEmail}>{session.user.email}</span>
              <button style={M.menuClose} onClick={() => setMenuOpen(false)}>✕</button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {NAV.map(group => (
                <div key={group.group} style={M.menuGroup}>
                  <div style={M.menuGroupLabel}>{group.group}</div>
                  {group.items.map(item => (
                    <div key={item.id} style={{ ...M.menuItem, ...(view === item.id ? M.menuItemActive : {}) }} onClick={() => navigate(item.id)}>
                      <span style={M.menuIcon}>{item.icon}</span>
                      {item.label}
                      {item.badge && <span style={{ ...M.badge, ...(item.p0 ? M.badgeP0 : {}) }}>{item.badge}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            <div style={M.menuFooter}>
              <button style={M.signOut} onClick={() => supabase.auth.signOut()}>Sign out</button>
            </div>
          </div>
        </div>
      )}

      {/* Main scrollable content */}
      <main style={M.main}>
        <div key={view} className="animate-in">{renderView()}</div>
      </main>

      {/* Bottom tab bar */}
      <nav style={M.tabBar}>
        {MOBILE_TABS.map(tab => (
          <button key={tab.id} style={{ ...M.tab, ...(view === tab.id ? M.tabActive : {}) }} onClick={() => navigate(tab.id)}>
            <span style={M.tabIcon}>{tab.icon}</span>
            <span style={M.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )

  // ── Desktop layout ─────────────────────────────────
  return (
    <div style={D.shell}>
      <header style={D.topbar}>
        <div style={D.wordmark}>MLP<span style={{ color: 'var(--accent)' }}>·</span>COMMAND CENTER</div>
        <div style={D.topRight}>
          <span style={D.userEmail}>{session.user.email}</span>
          <button style={D.signOut} onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </header>

      <aside style={D.sidebar}>
        {NAV.map(group => (
          <div key={group.group} style={D.navGroup}>
            <div style={D.navGroupLabel}>{group.group}</div>
            {group.items.map(item => (
              <div key={item.id} style={{ ...D.navItem, ...(view === item.id ? D.navItemActive : {}) }} onClick={() => navigate(item.id)}>
                {item.label}
                {item.badge && <span style={{ ...D.badge, ...(item.p0 ? D.badgeP0 : {}) }}>{item.badge}</span>}
              </div>
            ))}
          </div>
        ))}
      </aside>

      <main style={D.main}>
        <div style={D.pageHead}>
          <div style={D.pageTitle}>{title}</div>
          <div style={D.pageSub}>{PAGE_TITLES[view]?.[1]}</div>
        </div>
        <div key={view} className="animate-in">{renderView()}</div>
      </main>
    </div>
  )
}

// ── Mobile styles ──────────────────────────────────────
const M = {
  shell: { display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', background: 'var(--bg)' },
  topbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '52px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', flexShrink: 0, zIndex: 50 },
  wordmark: { fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.08em' },
  menuBtn: { background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '8px', color: 'var(--text)' },
  main: { flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' },
  tabBar: { display: 'flex', borderTop: '1px solid var(--border)', background: 'var(--s1)', flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' },
  tab: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 4px', background: 'none', border: 'none', cursor: 'pointer', gap: '3px' },
  tabActive: { borderTop: '2px solid var(--accent)' },
  tabIcon: { fontSize: '18px' },
  tabLabel: { fontFamily: 'var(--mono)', fontSize: '9px', color: 'var(--dim)', letterSpacing: '0.06em' },
  menuOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', flexDirection: 'column' },
  menuPanel: { background: 'var(--s1)', height: '100%', width: '280px', display: 'flex', flexDirection: 'column', boxShadow: '4px 0 24px rgba(0,0,0,0.12)' },
  menuHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', borderBottom: '1px solid var(--border)' },
  menuEmail: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
  menuClose: { background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: 'var(--mid)', padding: '4px' },
  menuGroup: { marginBottom: '8px', paddingTop: '8px' },
  menuGroupLabel: { fontFamily: 'var(--mono)', fontSize: '9px', fontWeight: '600', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dim)', padding: '0 18px 6px' },
  menuItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 18px', fontFamily: 'var(--mono)', fontSize: '13px', color: 'var(--mid)', cursor: 'pointer', borderLeft: '2px solid transparent' },
  menuItemActive: { color: 'var(--text)', borderLeftColor: 'var(--accent)', background: 'rgba(90,122,0,0.05)' },
  menuIcon: { fontSize: '16px', width: '20px', textAlign: 'center' },
  menuFooter: { padding: '16px 18px', borderTop: '1px solid var(--border)' },
  signOut: { width: '100%', padding: '10px', background: 'none', border: '1px solid var(--border)', borderRadius: '3px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--mid)', cursor: 'pointer' },
  badge: { marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: '10px', background: 'var(--s2)', color: 'var(--dim)', padding: '1px 6px', borderRadius: '2px' },
  badgeP0: { color: 'var(--accent)', background: 'rgba(90,122,0,0.08)' },
}

// ── Desktop styles ─────────────────────────────────────
const D = {
  shell: { display: 'grid', gridTemplateColumns: '220px 1fr', gridTemplateRows: '52px 1fr', height: '100vh', overflow: 'hidden' },
  topbar: { gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--bg)', zIndex: 10 },
  wordmark: { fontFamily: 'var(--mono)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.12em' },
  topRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  userEmail: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)' },
  signOut: { background: 'none', border: '1px solid var(--border)', borderRadius: '3px', padding: '4px 10px', fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--mid)', cursor: 'pointer' },
  sidebar: { borderRight: '1px solid var(--border)', background: 'var(--s1)', overflowY: 'auto', padding: '20px 0' },
  navGroup: { marginBottom: '24px' },
  navGroupLabel: { fontFamily: 'var(--mono)', fontSize: '9px', fontWeight: '600', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dim)', padding: '0 18px 8px' },
  navItem: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 18px', fontFamily: 'var(--mono)', fontSize: '12px', color: 'var(--mid)', cursor: 'pointer', borderLeft: '2px solid transparent', transition: 'color 0.1s', userSelect: 'none' },
  navItemActive: { color: 'var(--text)', borderLeftColor: 'var(--accent)', background: 'rgba(90,122,0,0.05)' },
  badge: { fontFamily: 'var(--mono)', fontSize: '10px', background: 'var(--s2)', color: 'var(--dim)', padding: '1px 6px', borderRadius: '2px' },
  badgeP0: { color: 'var(--accent)', background: 'rgba(90,122,0,0.08)' },
  main: { overflowY: 'auto', background: 'var(--bg)' },
  pageHead: { padding: '24px 32px 20px', borderBottom: '1px solid var(--border)' },
  pageTitle: { fontFamily: 'var(--mono)', fontSize: '20px', fontWeight: '600', letterSpacing: '-0.02em' },
  pageSub: { fontFamily: 'var(--mono)', fontSize: '11px', color: 'var(--dim)', marginTop: '3px' },
}
