// ─── Date utilities ───────────────────────────────────

export function today() {
  return new Date().toISOString().split('T')[0]
}

export function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
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

// Next occurrence after a given date for a recurrence frequency
export function nextOccurrence(fromDate, frequency) {
  const d = new Date(fromDate + 'T00:00:00')
  switch (frequency) {
    case 'daily':    d.setDate(d.getDate() + 1); break
    case 'weekly':   d.setDate(d.getDate() + 7); break
    case 'biweekly': d.setDate(d.getDate() + 14); break
    case 'monthly':  d.setMonth(d.getMonth() + 1); break
  }
  return d.toISOString().split('T')[0]
}

// Get week start (Monday) for a given date string
export function weekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

// Days between two date strings
export function daysBetween(a, b) {
  const da = new Date(a + 'T00:00:00')
  const db = new Date(b + 'T00:00:00')
  return Math.round((db - da) / 86400000)
}

// Streak calculation: given sorted array of logged date strings,
// returns { current, longest, lastMiss }
export function calcStreak(sortedDates) {
  if (!sortedDates.length) return { current: 0, longest: 0, lastMiss: null }
  const t = today()
  let current = 0, longest = 0, streak = 0
  let lastMiss = null

  // Walk backward from today
  let check = t
  for (let i = sortedDates.length - 1; i >= 0; i--) {
    const d = sortedDates[i]
    if (d === check || d === t) {
      streak++
      check = new Date(check + 'T00:00:00')
      check.setDate(check.getDate() - 1)
      check = check.toISOString().split('T')[0]
    } else {
      if (!lastMiss) lastMiss = check
      break
    }
  }
  current = streak

  // Longest streak pass
  streak = 1
  for (let i = 1; i < sortedDates.length; i++) {
    const diff = daysBetween(sortedDates[i - 1], sortedDates[i])
    if (diff === 1) { streak++; longest = Math.max(longest, streak) }
    else streak = 1
  }
  longest = Math.max(longest, current, streak)

  return { current, longest, lastMiss }
}
