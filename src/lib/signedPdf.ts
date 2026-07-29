import { PDFDocument, degrees, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import '@fontsource/noto-sans-bengali/bengali-400.css'
import { formatSigningDate, formatSigningText } from '@/lib/utils'
import { fitSingleLineFieldText } from '@/lib/fieldText'

export interface SignedField {
  field_type: string
  page_number: number
  x_percent: number  // percentage 0-100
  y_percent: number  // percentage 0-100
  width_percent: number  // percentage 0-100
  height_percent: number  // percentage 0-100
  signature_id: string
}

export interface PdfPlacementRect {
  x: number
  y: number
  width: number
  height: number
  rotation: 0 | 90 | 180 | 270
}

const normalizeRotation = (angle: number): 0 | 90 | 180 | 270 => {
  const normalized = ((angle % 360) + 360) % 360
  return normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0
}

export const getPlacementRect = (page: PDFPage, placement: SignedField): PdfPlacementRect => {
  const crop = page.getCropBox()
  const rotation = normalizeRotation(page.getRotation().angle)
  const displayWidth = rotation === 90 || rotation === 270 ? crop.height : crop.width
  const displayHeight = rotation === 90 || rotation === 270 ? crop.width : crop.height
  const left = (placement.x_percent / 100) * displayWidth
  const top = (placement.y_percent / 100) * displayHeight
  const width = (placement.width_percent / 100) * displayWidth
  const height = (placement.height_percent / 100) * displayHeight

  switch (rotation) {
    case 90:
      return { x: crop.x + top + height, y: crop.y + left, width, height, rotation }
    case 180:
      return { x: crop.x + crop.width - left, y: crop.y + top + height, width, height, rotation }
    case 270:
      return { x: crop.x + crop.width - top - height, y: crop.y + crop.height - left, width, height, rotation }
    default:
      return { x: crop.x + left, y: crop.y + crop.height - top - height, width, height, rotation }
  }
}

const offsetPlacementPoint = (rect: PdfPlacementRect, horizontal: number, vertical: number) => {
  switch (rect.rotation) {
    case 90:
      return { x: rect.x - vertical, y: rect.y + horizontal }
    case 180:
      return { x: rect.x - horizontal, y: rect.y - vertical }
    case 270:
      return { x: rect.x + vertical, y: rect.y - horizontal }
    default:
      return { x: rect.x + horizontal, y: rect.y + vertical }
  }
}

export const getContainedImageRect = (
  rect: PdfPlacementRect,
  imageWidth: number,
  imageHeight: number,
) => {
  const scale = Math.min(rect.width / imageWidth, rect.height / imageHeight)
  const width = imageWidth * scale
  const height = imageHeight * scale
  const point = offsetPlacementPoint(
    rect,
    (rect.width - width) / 2,
    (rect.height - height) / 2,
  )
  return { ...point, width, height, rotation: rect.rotation }
}

const drawFieldText = async (pdfDoc: PDFDocument, page: PDFPage, value: string, font: PDFFont, rect: PdfPlacementRect) => {
  const padding = Math.min(5, rect.width * 0.08)
  const preferredSize = Math.min(11, Math.max(7, rect.height * 0.55))
  if (/[^\x20-\x7E]/.test(value)) {
    const scale = 4
    await document.fonts?.load(`${preferredSize * scale}px "Noto Sans Bengali"`).catch(() => undefined)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Text rendering is unavailable')
    context.font = `${preferredSize * scale}px "Noto Sans Bengali", sans-serif`
    let text = value.replace(/[\r\n\t]+/g, ' ').trim()
    const maxWidth = Math.max(rect.width - padding * 2, 8) * scale
    while (text.length > 0 && context.measureText(text).width > maxWidth) text = text.slice(0, -1)
    if (!text) return
    canvas.width = Math.max(1, Math.ceil(context.measureText(text).width + scale * 2))
    canvas.height = Math.max(1, Math.ceil(preferredSize * scale * 1.6))
    context.font = `${preferredSize * scale}px "Noto Sans Bengali", sans-serif`
    context.fillStyle = '#000000'
    context.textBaseline = 'alphabetic'
    context.fillText(text, scale, preferredSize * scale * 1.2)
    const image = await pdfDoc.embedPng(await fetch(canvas.toDataURL('image/png')).then(response => response.arrayBuffer()))
    page.drawImage(image, {
      x: rect.x,
      y: rect.y,
      width: canvas.width / scale,
      height: canvas.height / scale,
      rotate: degrees(rect.rotation),
    })
    return
  }
  const fitted = fitSingleLineFieldText(
    value,
    (text, size) => font.widthOfTextAtSize(text, size),
    Math.max(rect.width - padding * 2, 8),
    preferredSize,
  )
  page.drawText(fitted.text, {
    x: rect.x,
    y: rect.y,
    size: fitted.size,
    font,
    color: rgb(0, 0, 0),
    rotate: degrees(rect.rotation),
    maxWidth: Math.max(rect.width - padding * 2, 8),
  })
}

/**
 * Generates a PDF with all signed placements (signatures, initials, dates, checkboxes, text) overlaid
 */
export async function generateSignedPdf(
  originalPdfUrl: string,
  placements: SignedField[],
): Promise<Blob> {
  // Fetch the original PDF
  const response = await fetch(originalPdfUrl)
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
  const originalBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true })
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Group placements by page
  const placementsByPage = new Map<number, SignedField[]>()
  for (const placement of placements) {
    const pageNum = placement.page_number
    if (!placementsByPage.has(pageNum)) {
      placementsByPage.set(pageNum, [])
    }
    placementsByPage.get(pageNum)!.push(placement)
  }

  // Overlay placements on each page
  for (const [pageNum, pagePlacements] of placementsByPage) {
    if (!Number.isInteger(pageNum) || pageNum < 1 || pageNum > pdfDoc.getPageCount()) {
      console.warn(`Skipping placement on invalid page ${pageNum}`)
      continue
    }
    const page = pdfDoc.getPage(pageNum - 1) // 0-indexed

    for (const placement of pagePlacements) {
      if (![placement.x_percent, placement.y_percent, placement.width_percent, placement.height_percent].every(Number.isFinite)) continue
      const rect = getPlacementRect(page, placement)

      if (placement.field_type === 'signature' || placement.field_type === 'initials') {
        if (!placement.signature_id) throw new Error(`Missing ${placement.field_type} value on page ${pageNum}`)
        try {
            let imgBytes: ArrayBuffer
            let isJpeg = false
            
            // Check if it's a data URL
            if (placement.signature_id.startsWith('data:image')) {
              isJpeg = placement.signature_id.startsWith('data:image/jpeg') || placement.signature_id.startsWith('data:image/jpg')
              const base64Data = placement.signature_id.split(',')[1]
              const binaryString = atob(base64Data)
              const bytes = new Uint8Array(binaryString.length)
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i)
              }
              imgBytes = bytes.buffer
            } else {
              isJpeg = /\.(jpe?g)$/i.test(placement.signature_id)
              const imageResponse = await fetch(placement.signature_id)
              if (!imageResponse.ok) throw new Error(`Image request failed with status ${imageResponse.status}`)
              imgBytes = await imageResponse.arrayBuffer()
            }
            
            // Try PNG first, fall back to JPEG
            let img
            try {
              img = isJpeg
                ? await pdfDoc.embedJpg(imgBytes)
                : await pdfDoc.embedPng(imgBytes)
            } catch {
              // If PNG fails, try JPEG and vice versa
              try {
                img = isJpeg
                  ? await pdfDoc.embedPng(imgBytes)
                  : await pdfDoc.embedJpg(imgBytes)
              } catch {
                img = null
              }
            }
            
            if (!img) throw new Error('The signature image format is not supported')
            const contained = getContainedImageRect(rect, img.width, img.height)
            page.drawImage(img, {
              x: contained.x,
              y: contained.y,
              width: contained.width,
              height: contained.height,
              rotate: degrees(contained.rotation),
            })
          } catch (error) {
            console.error('Error embedding signature image:', error)
            throw new Error(`Could not embed the ${placement.field_type} on page ${pageNum}`, {
              cause: error,
            })
          }
      } else if (placement.field_type === 'date') {
        // Draw date text
        const dateText = formatSigningDate(placement.signature_id || new Date().toISOString().slice(0, 10))
        await drawFieldText(pdfDoc, page, dateText, font, rect)
      } else if (placement.field_type === 'checkbox') {
        // Draw checkbox
        const isChecked = placement.signature_id === 'checked' || placement.signature_id === 'checkbox:checked'
        
        if (isChecked) {
          await drawFieldText(pdfDoc, page, 'X', fontBold, rect)
        }
      } else if (placement.field_type === 'text') {
        // Draw text field content
        const textContent = formatSigningText(placement.signature_id || '')
        await drawFieldText(pdfDoc, page, textContent, font, rect)
      }
    }
  }

  const pdfBytes = await pdfDoc.save()
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
