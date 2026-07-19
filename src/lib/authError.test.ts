import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage } from './authError'

describe('getAuthErrorMessage', () => {
  it('turns provider codes into clear guidance', () => {
    expect(getAuthErrorMessage({ code: 'invalid_credentials' })).toBe('The email or password is incorrect.')
    expect(getAuthErrorMessage({ code: 'otp_expired' })).toContain('expired')
  })

  it('does not expose an unknown provider message', () => {
    expect(getAuthErrorMessage({ message: 'internal auth database detail' }, 'Please retry.')).toBe('Please retry.')
  })

  it('handles rate-limit status codes', () => {
    expect(getAuthErrorMessage({ status: 429 })).toContain('Too many attempts')
  })
})
