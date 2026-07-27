import { describe, expect, it } from 'vitest'
import { getSignedSignerRecoveryAction } from './signingCompletion'

describe('getSignedSignerRecoveryAction', () => {
  it('shows the finished state for a completed document', () => {
    expect(getSignedSignerRecoveryAction('completed', true, false)).toBe('show-finished')
  })

  it('shows the finished state while other signers are still pending', () => {
    expect(getSignedSignerRecoveryAction('pending', false, false)).toBe('show-finished')
  })

  it('keeps interrupted finalization retryable for the last signer', () => {
    expect(getSignedSignerRecoveryAction('pending', true, false)).toBe('retry-finalization')
  })

  it('keeps an inconclusive completion check retryable', () => {
    expect(getSignedSignerRecoveryAction('pending', false, true)).toBe('retry-completion-check')
  })
})
