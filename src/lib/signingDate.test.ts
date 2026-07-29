import { describe, expect, it } from 'vitest'
import { getLocalSigningDate } from './signingDate'

describe('getLocalSigningDate', () => {
  it('uses the signer local calendar date', () => {
    expect(getLocalSigningDate(new Date(2026, 6, 29, 23, 45))).toBe('2026-07-29')
  })

  it('pads single-digit months and days', () => {
    expect(getLocalSigningDate(new Date(2026, 0, 4, 12, 0))).toBe('2026-01-04')
  })
})
