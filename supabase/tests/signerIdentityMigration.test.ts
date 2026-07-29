import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL('../migrations/20260718193442_prevent_duplicate_document_signers.sql', import.meta.url),
  'utf8',
).toLowerCase()

describe('signer identity migration', () => {
  it('cleans legacy duplicates before creating the unique index', () => {
    const cleanupPosition = migration.indexOf('delete from public.document_signers')
    const indexPosition = migration.indexOf('create unique index')

    expect(cleanupPosition).toBeGreaterThanOrEqual(0)
    expect(indexPosition).toBeGreaterThan(cleanupPosition)
    expect(migration).toContain('partition by document_id, lower(btrim(signer_email))')
    expect(migration).toContain("when 'signed' then 0")
  })

  it('normalizes signer and field assignment emails together', () => {
    expect(migration).toContain('update public.signature_fields')
    expect(migration).toContain('set assigned_to_email = lower(btrim(assigned_to_email))')
    expect(migration).toContain('update public.document_signers')
    expect(migration).toContain('set signer_email = lower(btrim(signer_email))')
  })
})
