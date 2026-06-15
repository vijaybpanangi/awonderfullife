// Scheduling helpers shared by the Worker (admin/cron) and the CLI. The newsletter's
// canonical zone is America/New_York; these convert ET wall-clock times to concrete
// UTC instants (DST-correct via Intl) and compute the default "next Saturday 7pm ET".
const TZ = 'America/New_York'

function partsInTZ(date) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const p = {}
  for (const part of f.formatToParts(date)) p[part.type] = part.value
  return {
    weekday: p.weekday,
    year: +p.year,
    month: +p.month,
    day: +p.day,
    hour: p.hour === '24' ? 0 : +p.hour,
    minute: +p.minute,
  }
}

// An ET wall-clock time (y, 1-based month, d, hh, mm) → the matching UTC Date.
// Works across DST because the offset is measured at the target instant itself.
export function etWallToUtc(y, m, d, hh, mm) {
  const guess = Date.UTC(y, m - 1, d, hh, mm)
  const p = partsInTZ(new Date(guess))
  const wall = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute)
  const offset = wall - guess // ET offset (ms) at that instant
  return new Date(guess - offset)
}

// The next Saturday 19:00 ET strictly after nowMs, as an ISO UTC string.
export function nextSaturday7pmETISO(nowMs) {
  for (let add = 0; add <= 8; add++) {
    const p = partsInTZ(new Date(nowMs + add * 86400000))
    if (p.weekday !== 'Sat') continue
    const utc = etWallToUtc(p.year, p.month, p.day, 19, 0)
    if (utc.getTime() > nowMs) return utc.toISOString()
  }
  return new Date(nowMs).toISOString() // unreachable in practice
}

// A datetime-local string "YYYY-MM-DDTHH:MM" interpreted as ET → ISO UTC, or null.
export function etLocalInputToISO(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(s || ''))
  if (!m) return null
  return etWallToUtc(+m[1], +m[2], +m[3], +m[4], +m[5]).toISOString()
}

// An ISO UTC instant → a friendly ET label, e.g. "Sat, Jul 4, 7:00 PM EDT".
export function formatET(iso) {
  if (!iso) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
