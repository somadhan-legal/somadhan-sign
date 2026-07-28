import { describe, expect, it } from 'vitest'
import { getSafeAuthReturnTo } from './authRedirect'

describe('getSafeAuthReturnTo', () => {
  it('preserves an internal route, query, and hash', () => {
    expect(getSafeAuthReturnTo('/document/abc/edit?mode=review#field-2'))
      .toBe('/document/abc/edit?mode=review#field-2')
  })

  it('rejects external and protocol-relative destinations', () => {
    expect(getSafeAuthReturnTo('https://example.com')).toBe('/dashboard')
    expect(getSafeAuthReturnTo('//example.com/path')).toBe('/dashboard')
    expect(getSafeAuthReturnTo('/\\example.com/path')).toBe('/dashboard')
  })

  it('prevents authentication redirect loops', () => {
    expect(getSafeAuthReturnTo('/login?next=/dashboard')).toBe('/dashboard')
    expect(getSafeAuthReturnTo('/reset-password')).toBe('/dashboard')
  })
})
