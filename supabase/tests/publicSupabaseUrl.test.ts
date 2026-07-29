import { describe, expect, it } from 'vitest'
import { withPublicSupabaseOrigin } from '../functions/_shared/publicSupabaseUrl'

describe('withPublicSupabaseOrigin', () => {
  it('keeps the signed storage path and token while replacing an internal origin', () => {
    expect(withPublicSupabaseOrigin(
      'http://kong:8000/storage/v1/object/sign/documents/file.pdf?token=secret',
      'http://127.0.0.1:54321',
    )).toBe('http://127.0.0.1:54321/storage/v1/object/sign/documents/file.pdf?token=secret')
  })

  it('leaves the URL unchanged when no valid public origin is configured', () => {
    const value = 'https://project.supabase.co/storage/v1/object/sign/documents/file.pdf?token=secret'
    expect(withPublicSupabaseOrigin(value, undefined)).toBe(value)
    expect(withPublicSupabaseOrigin(value, 'file:///tmp')).toBe(value)
  })
})
