import { describe, expect, it } from 'vitest'
import { getSigningFieldState } from './signingFieldState'

describe('getSigningFieldState', () => {
  it('marks every unfinished field assigned to the active signer as required', () => {
    expect(getSigningFieldState(true, false, false)).toBe('required')
  })

  it('keeps the current unfinished field visually distinct without changing ownership', () => {
    expect(getSigningFieldState(true, false, true)).toBe('current')
  })

  it('prioritizes the completed state over current navigation', () => {
    expect(getSigningFieldState(true, true, true)).toBe('completed')
  })

  it('does not highlight fields assigned to another signer', () => {
    expect(getSigningFieldState(false, false, true)).toBe('other')
  })
})
