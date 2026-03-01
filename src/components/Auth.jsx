import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (mode === 'signup') {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email for a confirmation link.')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.wordmark}>MLP<span style={{ color: 'var(--accent)' }}>·</span>COMMAND CENTER</div>
        <div style={styles.sub}>Work projects &amp; personal goals</div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}
          {message && <div style={styles.success}>{message}</div>}

          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Loading…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div style={styles.toggle}>
          {mode === 'signin' ? (
            <>No account? <span style={styles.link} onClick={() => setMode('signup')}>Sign up</span></>
          ) : (
            <>Have an account? <span style={styles.link} onClick={() => setMode('signin')}>Sign in</span></>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  wrap: {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    background: 'var(--s1)',
    border: '1px solid var(--border)',
    borderRadius: '6px',
    padding: '40px',
    width: '100%',
    maxWidth: '380px',
    animation: 'in 0.25s ease both',
  },
  wordmark: {
    fontFamily: 'var(--mono)',
    fontSize: '15px',
    fontWeight: '600',
    letterSpacing: '0.12em',
    marginBottom: '4px',
  },
  sub: {
    fontFamily: 'var(--mono)',
    fontSize: '11px',
    color: 'var(--dim)',
    marginBottom: '32px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '5px' },
  label: {
    fontFamily: 'var(--mono)',
    fontSize: '10px',
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--dim)',
  },
  input: {
    background: 'var(--s2)',
    border: '1px solid var(--border)',
    borderRadius: '3px',
    padding: '9px 12px',
    fontSize: '13px',
    color: 'var(--text)',
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.15s',
  },
  btn: {
    background: 'var(--accent)',
    color: '#fff',
    border: 'none',
    borderRadius: '3px',
    padding: '10px',
    fontFamily: 'var(--mono)',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.05em',
    marginTop: '4px',
    transition: 'opacity 0.15s',
  },
  error: {
    fontFamily: 'var(--mono)',
    fontSize: '11px',
    color: 'var(--red)',
    background: 'rgba(192,57,43,0.06)',
    border: '1px solid rgba(192,57,43,0.2)',
    borderRadius: '3px',
    padding: '8px 10px',
  },
  success: {
    fontFamily: 'var(--mono)',
    fontSize: '11px',
    color: 'var(--accent)',
    background: 'rgba(90,122,0,0.06)',
    border: '1px solid rgba(90,122,0,0.2)',
    borderRadius: '3px',
    padding: '8px 10px',
  },
  toggle: {
    marginTop: '20px',
    fontFamily: 'var(--mono)',
    fontSize: '11px',
    color: 'var(--dim)',
    textAlign: 'center',
  },
  link: {
    color: 'var(--accent)',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
}
