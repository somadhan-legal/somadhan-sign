import { describe, expect, it } from 'vitest'
import {
  formatVerificationFingerprint,
  readVerificationToken,
} from './documentVerification'

const token = `v1.${'A'.repeat(43)}`

describe('document verification helpers', () => {
  it('reads a versioned verification token from a URL fragment', () => {
    expect(readVerificationToken(`#${token}`)).toBe(token)
    expect(readVerificationToken(token)).toBe(token)
  })

  it('rejects malformed and unexpectedly long references', () => {
    expect(readVerificationToken('#document-id')).toBeNull()
    expect(readVerificationToken(`#v1.${'A'.repeat(44)}`)).toBeNull()
  })

  it('formats fingerprints into readable groups without changing them', () => {
    const digest = '0123456789abcdef'.repeat(4)
    expect(formatVerificationFingerprint(digest).replaceAll(' ', '')).toBe(digest)
  })
})
