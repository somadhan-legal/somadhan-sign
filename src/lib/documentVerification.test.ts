import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  fetchDocumentVerification,
  formatVerificationFingerprint,
  readVerificationToken,
} from './documentVerification'

const token = `v1.${'A'.repeat(43)}`

describe('document verification helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('reads a versioned verification token from a URL fragment', () => {
    expect(readVerificationToken(`#${token}`)).toBe(token)
    expect(readVerificationToken(token)).toBe(token)
  })

  it('rejects malformed and unexpectedly long references', () => {
    expect(readVerificationToken('#document-id')).toBeNull()
    expect(readVerificationToken(`#v1.${'A'.repeat(44)}`)).toBeNull()
  })

  it('formats fingerprints into readable groups without changing them', () => {
    const digest = '0123456789abcdef'.repeat(4)
    expect(formatVerificationFingerprint(digest).replaceAll(' ', '')).toBe(digest)
  })

  it('accepts a bounded, privacy-safe audit timeline from the verification service', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
    vi.stubGlobal('window', { setTimeout, clearTimeout })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      schemaVersion: 1,
      status: 'active',
      issuer: 'Somadhan Sign',
      referenceCode: 'SS-1234-ABCD-5678',
      evidenceSha256: 'a'.repeat(64),
      artifactSha256: 'b'.repeat(64),
      artifactSize: 1024,
      hashScheme: 'raw-pdf-bytes-v1',
      completedAt: '2026-08-05T01:00:00.000Z',
      issuedAt: '2026-08-05T01:00:00.000Z',
      auditTrail: [
        { action: 'Document Created', occurredAt: '2026-08-05T00:30:00.000Z' },
        { action: 'Document Completed', occurredAt: '2026-08-05T01:00:00.000Z' },
      ],
    }), { status: 200 })))

    const result = await fetchDocumentVerification(token)

    expect(result.status).toBe('active')
    if (result.status === 'active') {
      expect(result.record.auditTrail).toHaveLength(2)
      expect(result.record.auditTrail?.[1]?.action).toBe('Document Completed')
    }
  })

  it('rejects malformed public audit events instead of rendering untrusted data', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-key')
    vi.stubGlobal('window', { setTimeout, clearTimeout })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      schemaVersion: 1,
      status: 'active',
      issuer: 'Somadhan Sign',
      referenceCode: 'SS-1234-ABCD-5678',
      evidenceSha256: 'a'.repeat(64),
      artifactSha256: 'b'.repeat(64),
      artifactSize: 1024,
      hashScheme: 'raw-pdf-bytes-v1',
      completedAt: '2026-08-05T01:00:00.000Z',
      issuedAt: '2026-08-05T01:00:00.000Z',
      auditTrail: [{ action: '<script>', occurredAt: 'not-a-date' }],
    }), { status: 200 })))

    await expect(fetchDocumentVerification(token)).resolves.toEqual({ status: 'unavailable' })
  })
})
