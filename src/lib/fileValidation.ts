const PDF_MAX_BYTES = 5 * 1024 * 1024
const SIGNATURE_IMAGE_MAX_BYTES = 2 * 1024 * 1024
const SIGNATURE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const NORMALIZED_SIGNATURE_MAX_DATA_URL_LENGTH = 3_000_000
const NORMALIZED_SIGNATURE_MAX_WIDTH = 1000
const NORMALIZED_SIGNATURE_MAX_HEIGHT = 500

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

export function normalizeSignatureImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    const cleanup = () => URL.revokeObjectURL(objectUrl)
    image.onerror = () => {
      cleanup()
      reject(new Error('The signature image could not be decoded.'))
    }
    image.onload = () => {
      try {
        if (image.naturalWidth < 1 || image.naturalHeight < 1) {
          throw new Error('The signature image has invalid dimensions.')
        }
        const scale = Math.min(
          1,
          NORMALIZED_SIGNATURE_MAX_WIDTH / image.naturalWidth,
          NORMALIZED_SIGNATURE_MAX_HEIGHT / image.naturalHeight,
        )
        const canvas = document.createElement('canvas')
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
        const context = canvas.getContext('2d')
        if (!context) throw new Error('Image conversion is unavailable.')
        context.drawImage(image, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/png')
        if (!dataUrl.startsWith('data:image/png;base64,') || dataUrl.length > NORMALIZED_SIGNATURE_MAX_DATA_URL_LENGTH) {
          throw new Error('The normalized signature image is too large.')
        }
        resolve(dataUrl)
      } catch (error) {
        reject(error)
      } finally {
        cleanup()
      }
    }
    image.src = objectUrl
  })
}
