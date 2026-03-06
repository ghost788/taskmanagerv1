// ─── Date utilities (all timezone-aware) ──────────────
// Key rule: NEVER use .toISOString() for local date — it returns UTC.
// Use localDateStr() everywhere instead.

function pad(n) { return String(n).padStart(2, '0') }

// Returns "YYYY-MM-DD" in the user's LOCAL timezone
export function localDateStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function today() {
  return localDateStr(new Date())
}

export function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return localDateStr(d)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  // Parse as local midnight to avoid off-by-one from UTC conversion
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatDateLong(dateStr) {
  if (!dateStr) return ''
  const [y, m, day] = dateStr.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
}

export function isPast(dateStr) {
  return dateStr && dateStr < today()
}

export function isToday(dateStr) {
  return dateStr === today()
}

export function isTomorrow(dateStr) {
  return dateStr === tomorrow()
}

export function etaLabel(dateStr) {
  if (!dateStr) return null
  if (isToday(dateStr)) return 'Today'
  if (isTomorrow(dateStr)) return 'Tomorrow'
  if (isPast(dateStr)) return `Overdue · ${formatDate(dateStr)}`
  return formatDate(dateStr)
}

export function etaColor(dateStr, done) {
  if (done) return 'var(--accent)'
  if (!dateStr) return 'var(--dim)'
  if (isPast(dateStr)) return 'var(--red)'
  if (isToday(dateStr)) return 'var(--amber)'
  return 'var(--dim)'
}

export function nextOccurrence(fromDate, frequency) {
  const [y, m, day] = fromDate.split('-').map(Number)
  const d = new Date(y, m - 1, day)
  switch (frequency) {
    case 'daily':    d.setDate(d.getDate() + 1); break
    case 'weekly':   d.setDate(d.getDate() + 7); break
    case 'biweekly': d.setDate(d.getDate() + 14); break
    case 'monthly':  d.setMonth(d.getMonth() + 1); break
  }
  return localDateStr(d)
}

export function daysBetween(a, b) {
  const [ay, am, ad] = a.split('-').map(Number)
  const [by, bm, bd] = b.split('-').map(Number)
  const da = new Date(ay, am - 1, ad)
  const db = new Date(by, bm - 1, bd)
  return Math.round((db - da) / 86400000)
}

// Streak: given sorted date strings, returns { current, longest, lastMiss }
export function calcStreak(sortedDates) {
  if (!sortedDates.length) return { current: 0, longest: 0, lastMiss: null }
  const t = today()
  let current = 0, longest = 0, streak = 0, lastMiss = null

  // Walk backward from today
  const checkDate = d => {
    const [y, m, day] = d.split('-').map(Number)
    const dt = new Date(y, m - 1, day)
    dt.setDate(dt.getDate() - 1)
    return localDateStr(dt)
  }

  let check = t
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    if (sortedDates[i] === check || sortedDates[i] === t) {
      streak++
      check = checkDate(check)
    } else {
      if (!lastMiss) lastMiss = check
      break
    }
  }
  current = streak

  streak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = daysBetween(sortedDates[i - 1], sortedDates[i])
    if (diff === 1) { streak++; longest = Math.max(longest, streak) }
    else streak = 1
  }
  longest = Math.max(longest, current, streak)

  return { current, longest, lastMiss }
}
