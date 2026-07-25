import { describe, expect, it } from 'vitest'
import { isSigningToken, isViewerReference } from './publicAccessReference'

const token = 'a'.repeat(64)
const documentId = '11111111-1111-4111-8111-111111111111'

describe('public document access references', () => {
  it('accepts only full cryptographic signing tokens', () => {
    expect(isSigningToken(token)).toBe(true)
    expect(isSigningToken('short-token')).toBe(false)
    expect(isSigningToken(`${'g'.repeat(63)}!`)).toBe(false)
  })

  it('accepts viewer tokens only in secure deployment mode', () => {
    expect(isViewerReference(token, true)).toBe(true)
    expect(isViewerReference(documentId, true)).toBe(false)
  })

  it('accepts only legacy document UUIDs before the secure rollout', () => {
    expect(isViewerReference(documentId, false)).toBe(true)
    expect(isViewerReference(token, false)).toBe(false)
    expect(isViewerReference('not-a-reference', false)).toBe(false)
  })
})
