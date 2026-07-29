import { describe, expect, it } from 'vitest'
import type { AuditTrailEntry } from '@/types/database'
import { appendUniqueAuditEntry } from './auditTrail'

const entry = (id: string, action: string): AuditTrailEntry => ({
  id,
  document_id: 'document-1',
  action,
  user_email: 'signer@example.com',
  user_name: null,
  ip_address: null,
  metadata: null,
  created_at: '2026-07-29T00:00:00.000Z',
})

describe('audit trail updates', () => {
  it('appends a newly recorded audit row', () => {
    expect(appendUniqueAuditEntry([entry('1', 'Document Viewed')], entry('2', 'Signature Applied')))
      .toHaveLength(2)
  })

  it('does not duplicate a deduplicated RPC response', () => {
    const updated = entry('1', 'Document Viewed')
    expect(appendUniqueAuditEntry([entry('1', 'Document Viewed')], updated)).toEqual([updated])
  })
})
