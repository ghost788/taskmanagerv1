// ─── Reusable UI primitives ───────────────────────────

export function Btn({ children, onClick, variant = 'primary', style = {}, disabled }) {
  const base = {
    border: 'none',
    borderRadius: '3px',
    padding: '8px 16px',
    fontFamily: 'var(--mono)',
    fontSize: '12px',
    fontWeight: '600',
    letterSpacing: '0.05em',
    cursor: disabled ? 'default' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'opacity 0.15s',
  }
  const variants = {
    primary: { background: 'var(--accent)', color: '#fff' },
    ghost: { background: 'none', border: '1px solid var(--border)', color: 'var(--mid)' },
  }
  return (
    <button style={{ ...base, ...variants[variant], ...style }} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function Input({ value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        background: 'var(--s2)',
        border: '1px solid var(--border)',
        borderRadius: '3px',
        padding: '8px 12px',
        fontFamily: 'var(--mono)',
        fontSize: '12px',
        color: 'var(--text)',
        outline: 'none',
        ...style,
      }}
    />
  )
}

export function SectionLabel({ children, style = {} }) {
  return (
    <div style={{
      fontFamily: 'var(--mono)',
      fontSize: '10px',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
      color: 'var(--dim)',
      marginBottom: '12px',
      ...style,
    }}>
      {children}
    </div>
  )
}

export function ProgressBar({ pct, style = {} }) {
  return (
    <div style={{ height: '2px', background: 'var(--border)', borderRadius: '1px', overflow: 'hidden', ...style }}>
      <div style={{
        height: '100%',
        width: `${Math.min(100, Math.max(0, pct))}%`,
        background: 'var(--accent)',
        borderRadius: '1px',
        transition: 'width 0.4s ease',
      }} />
    </div>
  )
}

export function Spinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '48px' }}>
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: '11px',
        color: 'var(--dim)',
        letterSpacing: '0.1em',
      }}>Loading…</div>
    </div>
  )
}
