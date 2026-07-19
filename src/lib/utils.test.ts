import { describe, expect, it } from 'vitest'
import { formatSigningDate } from './utils'

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
