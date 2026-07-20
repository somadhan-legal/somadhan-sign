import { describe, expect, it } from 'vitest'
import { getFieldDraftFingerprint, type DraftFieldShape } from './fieldDraft'

const field = (overrides: Partial<DraftFieldShape> = {}): DraftFieldShape => ({
  document_id: 'doc-1',
  page_number: 1,
  x: 10,
  y: 20,
  width: 25,
  height: 8,
  assigned_to_email: 'Signer@Example.com ',
  field_type: 'signature',
  label: null,
  ...overrides,
})

describe('getFieldDraftFingerprint', () => {
  it('tracks persisted placement values and normalizes signer email casing', () => {
    expect(getFieldDraftFingerprint([field()], 'doc-1')).toBe(
      getFieldDraftFingerprint([field({ assigned_to_email: 'signer@example.com' })], 'doc-1')
    )
    expect(getFieldDraftFingerprint([field()], 'doc-1')).not.toBe(
      getFieldDraftFingerprint([field({ x: 11 })], 'doc-1')
    )
  })

  it('ignores fields from other documents', () => {
    expect(getFieldDraftFingerprint([field()], 'doc-1')).toBe(
      getFieldDraftFingerprint([field(), field({ document_id: 'doc-2' })], 'doc-1')
    )
  })
})
