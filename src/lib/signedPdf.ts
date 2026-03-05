import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface SignedField {
  field_type: string
  page_number: number
  x_percent: number  // percentage 0-100
  y_percent: number  // percentage 0-100
  width_percent: number  // percentage 0-100
  height_percent: number  // percentage 0-100
  signature_id: string
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
    const page = pdfDoc.getPage(pageNum - 1) // 0-indexed
    const { width: pageWidth, height } = page.getSize()

    for (const placement of pagePlacements) {
      // Convert percentage coordinates to actual PDF pixel coordinates
      const x = (placement.x_percent / 100) * pageWidth
      const w = (placement.width_percent / 100) * pageWidth
      const h = (placement.height_percent / 100) * height
      const y = height - (placement.y_percent / 100) * height - h // PDF coordinates are bottom-up

      if (placement.field_type === 'signature' || placement.field_type === 'initials') {
        // Draw signature/initials image
        if (placement.signature_id) {
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
              // It's a URL, fetch it
              isJpeg = /\.(jpe?g)$/i.test(placement.signature_id)
              imgBytes = await fetch(placement.signature_id).then((r) => r.arrayBuffer())
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
            
            if (img) {
              page.drawImage(img, {
                x,
                y,
                width: w,
                height: h,
              })
            } else {
              page.drawText(placement.field_type === 'signature' ? '[Signed]' : '[Initialed]', {
                x: x + 5,
                y: y + h / 2 - 5,
                size: 10,
                font: fontBold,
                color: rgb(0, 0, 0),
              })
            }
          } catch (error) {
            console.error('Error embedding signature image:', error)
            page.drawText(placement.field_type === 'signature' ? '[Signed]' : '[Initialed]', {
              x: x + 5,
              y: y + h / 2 - 5,
              size: 10,
              font: fontBold,
              color: rgb(0, 0, 0),
            })
          }
        }
      } else if (placement.field_type === 'date') {
        // Draw date text
        let dateText = placement.signature_id || new Date().toLocaleDateString()
        if (dateText.startsWith('date:')) dateText = dateText.replace('date:', '')
        page.drawText(dateText, {
          x: x + 5,
          y: y + h / 2 - 5,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        })
      } else if (placement.field_type === 'checkbox') {
        // Draw checkbox
        const isChecked = placement.signature_id === 'checked' || placement.signature_id === 'checkbox:checked'
        
        if (isChecked) {
          // Draw a tick/checkmark using two lines (short leg + long leg)
          const cx = x + w / 2
          const cy = y + h / 2
          const s = Math.min(w, h) * 0.3
          // Short leg: bottom-left to bottom-center
          page.drawLine({ start: { x: cx - s, y: cy }, end: { x: cx - s * 0.3, y: cy - s * 0.7 }, thickness: 2.5, color: rgb(0, 0, 0) })
          // Long leg: bottom-center to top-right
          page.drawLine({ start: { x: cx - s * 0.3, y: cy - s * 0.7 }, end: { x: cx + s, y: cy + s * 0.8 }, thickness: 2.5, color: rgb(0, 0, 0) })
        }
      } else if (placement.field_type === 'text') {
        // Draw text field content
        const textContent = placement.signature_id || ''
        page.drawText(textContent, {
          x: x + 5,
          y: y + h / 2 - 5,
          size: 10,
          font: font,
          color: rgb(0, 0, 0),
        })
      }
    }
  }

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}
