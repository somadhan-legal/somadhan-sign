import { afterEach, describe, expect, it, vi } from 'vitest'

describe('secure document access deployment mode', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('enables the secure service only when explicitly configured', async () => {
    vi.stubEnv('VITE_SECURE_DOCUMENT_ACCESS_ENABLED', 'true')
    vi.resetModules()

    const { secureDocumentAccessEnabled } = await import('./secureDocumentAccess')
    expect(secureDocumentAccessEnabled).toBe(true)
  })

  it('keeps legacy mode explicit while the secure service is not deployed', async () => {
    vi.stubEnv('VITE_SECURE_DOCUMENT_ACCESS_ENABLED', 'false')
    vi.resetModules()

    const { secureDocumentAccessEnabled } = await import('./secureDocumentAccess')
    expect(secureDocumentAccessEnabled).toBe(false)
  })
})
