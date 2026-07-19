import { describe, expect, it } from 'vitest'
import { getDocumentStoragePath, getLegacyPublicDocumentUrl } from './documentStorage'

describe('getDocumentStoragePath', () => {
  it('keeps a private storage path unchanged', () => {
    expect(getDocumentStoragePath('user-id/123_contract.pdf')).toBe('user-id/123_contract.pdf')
  })

  it('extracts paths from legacy public URLs', () => {
    expect(getDocumentStoragePath(
      'https://project.supabase.co/storage/v1/object/public/documents/user-id/My%20File.pdf',
    )).toBe('user-id/My File.pdf')
  })

  it('extracts paths from signed URLs without retaining access tokens', () => {
    expect(getDocumentStoragePath(
      'https://project.supabase.co/storage/v1/object/sign/documents/user-id/file.pdf?token=secret',
    )).toBe('user-id/file.pdf')
  })

  it('rejects unrelated URLs and empty references', () => {
    expect(getDocumentStoragePath('https://example.com/file.pdf')).toBeNull()
    expect(getDocumentStoragePath('')).toBeNull()
    expect(getDocumentStoragePath(null)).toBeNull()
  })
})

describe('getLegacyPublicDocumentUrl', () => {
  it('keeps an existing browser URL unchanged', () => {
    const url = 'https://project.supabase.co/storage/v1/object/public/documents/file.pdf'
    expect(getLegacyPublicDocumentUrl(url)).toBe(url)
  })

  it('turns a legacy storage path into a public URL during staged rollout', () => {
    expect(getLegacyPublicDocumentUrl('user-id/file.pdf')).toContain(
      '/storage/v1/object/public/documents/user-id/file.pdf',
    )
  })
})
