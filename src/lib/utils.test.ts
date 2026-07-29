import { describe, expect, it } from 'vitest'
import { formatDate, formatSigningDate } from './utils'

describe('formatDate', () => {
  it('formats document dates in the selected interface language', () => {
    const date = '2026-07-29T08:00:00.000Z'
    expect(formatDate(date, 'en-US')).toContain('2026')
    expect(formatDate(date, 'bn-BD')).toMatch(/[০-৯]/)
  })
})

describe('formatSigningDate', () => {
  it('formats a canonical signing date without timezone conversion', () => {
    expect(formatSigningDate('2026-07-20')).toBe('20/07/2026')
  })

  it('supports legacy prefixed dates', () => {
    expect(formatSigningDate('date:2026-07-20')).toBe('20/07/2026')
  })

  it('preserves legacy display values', () => {
    expect(formatSigningDate('20/07/2026')).toBe('20/07/2026')
  })
})
