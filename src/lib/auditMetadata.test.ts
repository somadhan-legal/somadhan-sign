import { describe, expect, it } from 'vitest'
import { formatAuditMetadata } from './auditMetadata'

describe('formatAuditMetadata', () => {
  it('formats consent metadata without exposing raw JSON', () => {
    expect(formatAuditMetadata(JSON.stringify({
      version: 'somadhan-esign-consent-v1',
      statement: 'Long localized statement',
      language: 'bn',
      source: 'signing-interface',
    }))).toBe('Consent version: somadhan-esign-consent-v1 · Language: Bangla')
  })

  it('formats delivery counts in Bangla', () => {
    expect(formatAuditMetadata('{"sent":2,"failed":1}', 'bn')).toBe('পাঠানো হয়েছে: 2 · ব্যর্থ: 1')
  })

  it('summarizes signing recipients without listing their addresses', () => {
    expect(formatAuditMetadata('{"ccEmails":["viewer@example.com"],"signerCount":3}'))
      .toBe('Signers: 3 · Viewers: 1')
  })

  it('keeps bounded plain-text activity details and hides unknown JSON', () => {
    expect(formatAuditMetadata('Signature placed on page 2')).toBe('Signature placed on page 2')
    expect(formatAuditMetadata('{"providerIds":["secret"]}')).toBeNull()
    expect(formatAuditMetadata('x'.repeat(350))).toHaveLength(300)
  })

  it('localizes known legacy activity details in Bangla', () => {
    expect(formatAuditMetadata('Signature placed on page 2', 'bn')).toBe('পৃষ্ঠা 2: স্বাক্ষর যোগ হয়েছে')
    expect(formatAuditMetadata('Auto-filled 3 initials fields', 'bn')).toBe('3টি ইনিশিয়াল ক্ষেত্র স্বয়ংক্রিয়ভাবে পূরণ হয়েছে')
    expect(formatAuditMetadata('Document uploaded', 'bn')).toBe('ডকুমেন্ট আপলোড করা হয়েছে')
  })

  it('summarizes database-authored field metadata without exposing raw identifiers', () => {
    expect(formatAuditMetadata(JSON.stringify({
      source: 'database',
      fieldId: 'private-field-id',
      fieldType: 'signature',
      pageNumber: 4,
    }))).toBe('Page 4')
  })
})
