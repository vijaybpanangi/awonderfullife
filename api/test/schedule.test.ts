import { describe, it, expect } from 'vitest'
import { etWallToUtc, nextSaturday7pmETISO, etLocalInputToISO, formatET } from '../src/schedule.mjs'

describe('etWallToUtc (DST-correct ET→UTC)', () => {
  it('summer EDT (UTC-4): 7pm ET = 23:00 UTC same day', () => {
    expect(etWallToUtc(2026, 7, 4, 19, 0).toISOString()).toBe('2026-07-04T23:00:00.000Z')
  })
  it('winter EST (UTC-5): 7pm ET = 00:00 UTC the next day', () => {
    expect(etWallToUtc(2026, 12, 12, 19, 0).toISOString()).toBe('2026-12-13T00:00:00.000Z')
  })
})

describe('nextSaturday7pmETISO', () => {
  it('from a Tuesday, returns the upcoming Saturday 7pm ET', () => {
    expect(nextSaturday7pmETISO(Date.parse('2026-06-16T12:00:00Z'))).toBe('2026-06-20T23:00:00.000Z')
  })
  it('on Saturday after 7pm ET, rolls to next week', () => {
    expect(nextSaturday7pmETISO(Date.parse('2026-06-20T23:30:00Z'))).toBe('2026-06-27T23:00:00.000Z')
  })
})

describe('etLocalInputToISO', () => {
  it('interprets a datetime-local string as Eastern Time', () => {
    expect(etLocalInputToISO('2026-07-10T15:00')).toBe('2026-07-10T19:00:00.000Z')
  })
  it('returns null for invalid input', () => {
    expect(etLocalInputToISO('nope')).toBe(null)
  })
})

describe('formatET', () => {
  it('renders an ISO instant in Eastern Time with a zone label', () => {
    const s = formatET('2026-07-04T23:00:00.000Z')
    expect(s).toContain('7:00')
    expect(s).toContain('EDT')
  })
})
