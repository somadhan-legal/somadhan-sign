import { describe, expect, it } from 'vitest'
import { getAuthErrorMessage, getRecoveryLinkError } from './authError'

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

  it('returns localized guidance without exposing provider details', () => {
    expect(getAuthErrorMessage({ code: 'invalid_credentials' }, 'আবার চেষ্টা করুন।', 'bn')).toBe('ইমেইল অথবা পাসওয়ার্ড সঠিক নয়।')
    expect(getAuthErrorMessage({ message: 'internal database detail' }, 'আবার চেষ্টা করুন।', 'bn')).toBe('আবার চেষ্টা করুন।')
  })
})

describe('getRecoveryLinkError', () => {
  it('recognizes expired recovery links without exposing provider text', () => {
    expect(getRecoveryLinkError('#error=access_denied&error_description=Email+link+is+invalid')).toBe('expired')
  })

  it('recognizes PKCE recovery errors returned in the query string', () => {
    expect(getRecoveryLinkError(
      '?error=access_denied&error_code=otp_expired&error_description=Email+link+has+expired',
      '',
    )).toBe('expired')
  })

  it('checks the hash when the query has no recovery error', () => {
    expect(getRecoveryLinkError('?source=email', '#error=server_error')).toBe('invalid')
  })

  it('maps arbitrary URL error text to a controlled invalid state', () => {
    expect(getRecoveryLinkError('#error=server_error&error_description=Call+this+phone+number')).toBe('invalid')
  })

  it('allows a recovery URL with no error', () => {
    expect(getRecoveryLinkError('', '#access_token=secret&type=recovery')).toBeNull()
  })
})
