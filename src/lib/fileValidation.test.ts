import { describe, expect, it } from 'vitest'
import { PDFDocument, PDFName } from 'pdf-lib'
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

  it('rejects a PDF that runs an action when opened', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([200, 200])
    pdf.catalog.set(PDFName.of('OpenAction'), pdf.context.obj({
      S: 'JavaScript',
      JS: 'app.alert(1)',
    }))
    const file = new File([new Uint8Array(await pdf.save())], 'active.pdf', { type: 'application/pdf' })
    await expect(validatePdfFile(file)).resolves.toContain('active content')
  })

  it('rejects a PDF that contains embedded files', async () => {
    const pdf = await PDFDocument.create()
    pdf.addPage([200, 200])
    pdf.catalog.set(PDFName.of('Names'), pdf.context.obj({
      EmbeddedFiles: { Names: [] },
    }))
    const file = new File([new Uint8Array(await pdf.save())], 'attachment.pdf', { type: 'application/pdf' })
    await expect(validatePdfFile(file)).resolves.toContain('attachments')
  })
})
