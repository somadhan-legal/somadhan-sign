import { describe, expect, it } from 'vitest'
import { getNextUnsignedField } from './fieldNavigation'

const fields = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]

describe('getNextUnsignedField', () => {
  it('advances to the next unfinished field in document order', () => {
    expect(getNextUnsignedField(fields, new Set(['a']), 'a')?.id).toBe('b')
  })

  it('skips fields that are already complete', () => {
    expect(getNextUnsignedField(fields, new Set(['a', 'b']), 'a')?.id).toBe('c')
  })

  it('wraps to the first unfinished field', () => {
    expect(getNextUnsignedField(fields, new Set(['b', 'c']), 'c')?.id).toBe('a')
  })

  it('returns no field when signing is complete', () => {
    expect(getNextUnsignedField(fields, new Set(['a', 'b', 'c']), 'c')).toBeNull()
  })
})
