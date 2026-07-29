import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadPdfUrl, safePdfFilename, safeSignedPdfFilename } from './download'

afterEach(() => vi.unstubAllGlobals())

describe('safePdfFilename', () => {
  it('removes unsafe filename characters', () => {
    expect(safePdfFilename('Client: Contract/2026')).toBe(
      'Client_ Contract_2026_Somadhan_Sign.pdf',
    )
  })

  it('removes control characters', () => {
    expect(safePdfFilename('Terms\nFinal')).toBe('TermsFinal_Somadhan_Sign.pdf')
  })

  it('uses a safe fallback for an empty title', () => {
    expect(safePdfFilename('   ')).toBe('Document_Somadhan_Sign.pdf')
  })

  it('uses the original base name for the branded signed PDF', () => {
    expect(safeSignedPdfFilename('Client: Contract/2026.PDF')).toBe(
      'Client_ Contract_2026_Somadhan_Sign.pdf',
    )
    expect(safeSignedPdfFilename('   ')).toBe('Document_Somadhan_Sign.pdf')
  })

  it('rejects a successful response that is not actually a PDF', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not a pdf', { status: 200 })))
    await expect(downloadPdfUrl('https://example.com/file', 'file.pdf')).rejects.toThrow('not a valid PDF')
  })

  it('rejects an unsuccessful PDF response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('missing', { status: 404 })))
    await expect(downloadPdfUrl('https://example.com/file', 'file.pdf')).rejects.toThrow('could not be downloaded')
  })
})
