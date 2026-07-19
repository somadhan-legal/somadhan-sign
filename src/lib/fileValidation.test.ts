import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { validatePdfFile } from './fileValidation'

describe('validatePdfFile', () => {
  it('accepts a readable PDF with at least one page', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([200, 200])
    const bytes = await pdf.save()
    const file = new File([new Uint8Array(bytes)], 'agreement.pdf', { type: 'application/pdf' })
    await expect(validatePdfFile(file)).resolves.toBeNull()
  })

  it('rejects files that only imitate a PDF header', async () => {
    const file = new File(['%PDF-not-a-real-document'], 'broken.pdf', { type: 'application/pdf' })
    await expect(validatePdfFile(file)).resolves.toBe('The PDF is damaged, encrypted, or unsupported.')
  })

  it('rejects a valid PDF saved with a misleading extension', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([200, 200])
    const file = new File([new Uint8Array(await pdf.save())], 'agreement.txt', { type: 'application/pdf' })
    await expect(validatePdfFile(file)).resolves.toBe('Please select a PDF file.')
  })
})
