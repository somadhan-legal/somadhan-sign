import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  new URL('../migrations/20260719072344_secure_public_document_access.sql', import.meta.url),
  'utf8',
).toLowerCase()

describe('secure document access migration privileges', () => {
  it.each(['cleanup_old_documents()', 'rls_auto_enable()'])(
    'keeps %s out of public RPC access',
    (signature) => {
      expect(migration).toContain(
        `revoke execute on function public.${signature} from public, anon, authenticated;`,
      )
      expect(migration).toContain(
        `grant execute on function public.${signature} to service_role;`,
      )
    },
  )

  it('retires legacy signer lookup and final URL mutation RPCs', () => {
    expect(migration).toContain(
      'revoke execute on function public.get_signer_by_token(text) from public, anon, authenticated;',
    )
    expect(migration).toContain(
      'drop function if exists public.save_final_pdf_url_by_token(text, text);',
    )
    expect(migration).not.toContain(
      'create or replace function public.save_final_pdf_url_by_token',
    )
  })
})
