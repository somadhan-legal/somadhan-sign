import { describe, expect, it } from 'vitest'
import { safePdfFilename } from './download'

describe('safePdfFilename', () => {
  it('removes unsafe filename characters', () => {
    expect(safePdfFilename('Client: Contract/2026', ' - Signed')).toBe('Client_ Contract_2026 - Signed.pdf')
  })

  it('removes control characters', () => {
    expect(safePdfFilename('Terms\nFinal')).toBe('TermsFinal.pdf')
  })

  it('uses a safe fallback for an empty title', () => {
    expect(safePdfFilename('   ')).toBe('Document.pdf')
  })
})
