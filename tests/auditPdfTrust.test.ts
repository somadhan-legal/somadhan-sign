import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const recoveryPdfSource = readFileSync(
  new URL('../src/lib/auditPdf.ts', import.meta.url),
  'utf8',
)

describe('legacy completed-PDF recovery boundary', () => {
  it('never presents a locally assembled fallback as an authoritative certificate', () => {
    expect(recoveryPdfSource).toContain('UNVERIFIED RECOVERY COPY')
    expect(recoveryPdfSource).toContain('no Somadhan Sign verification QR')
    expect(recoveryPdfSource).not.toContain('CERTIFICATE OF COMPLETION')
  })
})
