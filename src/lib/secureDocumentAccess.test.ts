import { afterEach, describe, expect, it, vi } from 'vitest'

describe('secure document access deployment mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('enables the secure service when explicitly configured', async () => {
    vi.stubEnv('VITE_SECURE_DOCUMENT_ACCESS_ENABLED', 'true')
    vi.resetModules()

    const { secureDocumentAccessEnabled } = await import('./secureDocumentAccess')
    expect(secureDocumentAccessEnabled).toBe(true)
  })

  it('allows an explicit emergency rollback to legacy mode', async () => {
    vi.stubEnv('VITE_SECURE_DOCUMENT_ACCESS_ENABLED', 'false')
    vi.resetModules()

    const { secureDocumentAccessEnabled } = await import('./secureDocumentAccess')
    expect(secureDocumentAccessEnabled).toBe(false)
  })

  it('uses secure access by default after the coordinated rollout', async () => {
    vi.stubEnv('VITE_SECURE_DOCUMENT_ACCESS_ENABLED', '')
    vi.resetModules()

    const { secureDocumentAccessEnabled } = await import('./secureDocumentAccess')
    expect(secureDocumentAccessEnabled).toBe(true)
  })
})
