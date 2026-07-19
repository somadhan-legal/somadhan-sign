const PDF_MAX_BYTES = 5 * 1024 * 1024
const SIGNATURE_IMAGE_MAX_BYTES = 2 * 1024 * 1024
const SIGNATURE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

export async function validatePdfFile(file: File): Promise<string | null> {
  if (file.size === 0) return 'The selected PDF is empty.'
  if (file.size > PDF_MAX_BYTES) return 'The PDF must be 5 MB or smaller.'
  if (!file.name.toLowerCase().endsWith('.pdf')) return 'Please select a PDF file.'

  const header = await file.slice(0, 5).text()
  if (header !== '%PDF-') return 'This file does not contain a valid PDF header.'
  try {
    const { PDFDocument } = await import('pdf-lib')
    const pdf = await PDFDocument.load(await file.arrayBuffer())
    if (pdf.getPageCount() === 0) return 'The PDF does not contain any pages.'
  } catch {
    return 'The PDF is damaged, encrypted, or unsupported.'
  }
  return null
}

export function validateSignatureImage(file: File): string | null {
  if (file.size === 0) return 'The selected image is empty.'
  if (file.size > SIGNATURE_IMAGE_MAX_BYTES) return 'The signature image must be 2 MB or smaller.'
  if (!SIGNATURE_IMAGE_TYPES.has(file.type)) return 'Use a PNG, JPG, or WebP image.'
  return null
}
