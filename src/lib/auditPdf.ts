import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib'
import '@fontsource/noto-sans-bengali/bengali-400.css'
import somadhanLogo from '@/assets/somadhan.png'
import { formatAuditMetadata } from '@/lib/auditMetadata'

export interface AuditEntry {
  action: string
  user_email: string
  user_name?: string | null
  created_at: string
  metadata?: string | null
  ip_address?: string | null
}

const isBengaliCharacter = (character: string) => /[\u0980-\u09FF]/.test(character)

const drawUserText = async (pdfDoc: PDFDocument, page: PDFPage, value: string, options: {
  x: number
  y: number
  size: number
  latinFont: PDFFont
  color: ReturnType<typeof rgb>
  maxWidth: number
}) => {
  const safeValue = String(value || '').replace(/[\r\n\t]+/g, ' ')
  if (![...safeValue].some(isBengaliCharacter)) {
    let text = safeValue.replace(/[^\x20-\x7E]/g, '')
    while (text.length > 0 && options.latinFont.widthOfTextAtSize(text, options.size) > options.maxWidth) text = text.slice(0, -1)
    if (text) page.drawText(text, { x: options.x, y: options.y, size: options.size, font: options.latinFont, color: options.color })
    return
  }

  const renderScale = 4
  await document.fonts?.load(`${options.size * renderScale}px "Noto Sans Bengali"`).catch(() => undefined)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return
  context.font = `${options.size * renderScale}px "Noto Sans Bengali", sans-serif`
  let text = safeValue
  while (text.length > 0 && context.measureText(text).width > options.maxWidth * renderScale) text = text.slice(0, -1)
  if (!text) return
  canvas.width = Math.max(1, Math.ceil(context.measureText(text).width + renderScale * 2))
  canvas.height = Math.max(1, Math.ceil(options.size * renderScale * 1.6))
  context.font = `${options.size * renderScale}px "Noto Sans Bengali", sans-serif`
  context.fillStyle = `rgb(${options.color.red * 255}, ${options.color.green * 255}, ${options.color.blue * 255})`
  context.textBaseline = 'alphabetic'
  context.fillText(text, renderScale, options.size * renderScale * 1.2)
  const image = await pdfDoc.embedPng(await fetch(canvas.toDataURL('image/png')).then(response => response.arrayBuffer()))
  page.drawImage(image, {
    x: options.x,
    y: options.y - options.size * 0.25,
    width: canvas.width / renderScale,
    height: canvas.height / renderScale,
  })
}

/**
 * Generates a PDF page with the audit trail appended to the original document.
 * Returns a Blob of the combined PDF.
 */
export async function generateAuditPdf(
  originalPdfUrl: string,
  auditEntries: AuditEntry[],
  documentTitle: string,
): Promise<Blob> {
  // Fetch the original PDF
  const response = await fetch(originalPdfUrl)
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
  const originalBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true })
  
  // If no audit entries, just return the original PDF
  if (!auditEntries || auditEntries.length === 0) {
    const pdfBytes = await pdfDoc.save()
    return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  
  // Fetch and embed PNG logo
  let logoImage = null
  try {
    const logoResponse = await fetch(somadhanLogo)
    if (logoResponse.ok) {
      const logoBytes = await logoResponse.arrayBuffer()
      logoImage = await pdfDoc.embedPng(logoBytes)
    }
  } catch (e) {
    console.warn('Failed to load logo PNG:', e)
  }

  const pageWidth = 595.28 // A4
  const pageHeight = 841.89
  const margin = 50
  const lineHeight = 16
  const smallLine = 13

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let yPos = pageHeight - margin

  // ===== SomadhanSign Branding =====
  const brandColor = rgb(0.02, 0.31, 0.33) // #054F54

  // Full PNG Logo
  if (logoImage) {
    const logoHeight = 35
    const logoWidth = logoImage.width * (logoHeight / logoImage.height)
    page.drawImage(logoImage, {
      x: margin,
      y: yPos - logoHeight,
      width: logoWidth,
      height: logoHeight,
    })
    yPos -= (logoHeight + 8)
  }

  // Tagline below
  page.drawText('Powered by Somadhan', {
    x: margin,
    y: yPos,
    size: 9,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  })

  yPos -= 20

  // Separator line after branding
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: pageWidth - margin, y: yPos },
    thickness: 1.5,
    color: brandColor,
  })
  yPos -= 24

  // ===== Certificate Content =====
  // Title
  page.drawText('CERTIFICATE OF COMPLETION', {
    x: margin,
    y: yPos,
    size: 18,
    font: fontBold,
    color: rgb(0.1, 0.1, 0.1),
  })
  yPos -= 28

  // Subtitle
  page.drawText('Electronic Signature Audit Trail', {
    x: margin,
    y: yPos,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  })
  yPos -= 24

  // Horizontal line
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: pageWidth - margin, y: yPos },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  yPos -= 20

  // Document info
  page.drawText('Document:', {
    x: margin,
    y: yPos,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  })
  await drawUserText(pdfDoc, page, documentTitle, {
    x: margin + 70,
    y: yPos,
    size: 10,
    latinFont: font,
    color: rgb(0.2, 0.2, 0.2),
    maxWidth: pageWidth - margin * 2 - 70,
  })
  yPos -= lineHeight

  page.drawText('Generated:', {
    x: margin,
    y: yPos,
    size: 10,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  })
  page.drawText(new Date().toLocaleString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    timeZone: 'UTC',
  }) + ' UTC', {
    x: margin + 70,
    y: yPos,
    size: 10,
    font: font,
    color: rgb(0.2, 0.2, 0.2),
  })
  yPos -= 24

  // Legal notice
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: pageWidth - margin, y: yPos },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  })
  yPos -= 16

  const legalText = [
    'This document was processed using Somadhan Sign. The events below are the activity',
    'records captured by the service, including any electronic-signature consent event.',
    'This certificate is an activity summary and does not independently determine the legal',
    'validity or enforceability of the document in any particular jurisdiction.',
  ]
  for (const line of legalText) {
    page.drawText(line, {
      x: margin,
      y: yPos,
      size: 8.5,
      font: font,
      color: rgb(0.45, 0.45, 0.45),
    })
    yPos -= smallLine
  }
  yPos -= 12

  // Horizontal line
  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: pageWidth - margin, y: yPos },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  yPos -= 20

  // Column headers
  page.drawText('ACTION', {
    x: margin,
    y: yPos,
    size: 8,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  })
  page.drawText('USER', {
    x: 220,
    y: yPos,
    size: 8,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  })
  page.drawText('DATE & TIME', {
    x: 400,
    y: yPos,
    size: 8,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  })
  yPos -= 6

  page.drawLine({
    start: { x: margin, y: yPos },
    end: { x: pageWidth - margin, y: yPos },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  })
  yPos -= 14

  // Audit entries
  for (const entry of auditEntries) {
    const metadata = formatAuditMetadata(entry.metadata)
    const rowHeight = (metadata || entry.ip_address) ? smallLine * 3 + 12 : smallLine * 2 + 12
    // Check if we need a new page
    if (yPos < margin + rowHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      yPos = pageHeight - margin
      
      // Full PNG Logo
      if (logoImage) {
        const logoH = 35
        const logoW = logoImage.width * (logoH / logoImage.height)
        page.drawImage(logoImage, {
          x: margin,
          y: yPos - logoH,
          width: logoW,
          height: logoH,
        })
        yPos -= (logoH + 8)
      }
      
      page.drawText('Powered by Somadhan', {
        x: margin,
        y: yPos,
        size: 9,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      })
      yPos -= 20
      
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness: 1.5,
        color: brandColor,
      })
      yPos -= 20
      
      page.drawText('AUDIT TRAIL (continued)', {
        x: margin,
        y: yPos,
        size: 14,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.1),
      })
      yPos -= 24
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness: 1,
        color: rgb(0.8, 0.8, 0.8),
      })
      yPos -= 20
    }

    const dt = new Date(entry.created_at)
    const dateStr = dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false, timeZone: 'UTC' })

    // Helper function to sanitize text for WinAnsi encoding
    const sanitize = (text: string) => text
      .replace(/✓/g, '[x]')
      .replace(/✔/g, '[x]')
      .replace(/✗/g, '[ ]')
      .replace(/✘/g, '[ ]')
      .replace(/[^\x20-\x7E]/g, '') // Remove non-ASCII printable characters

    // Action
    page.drawText(sanitize(entry.action), {
      x: margin,
      y: yPos,
      size: 9,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
    })

    // User
    const userName = entry.user_name || entry.user_email.split('@')[0]
    await drawUserText(pdfDoc, page, userName, {
      x: 220,
      y: yPos,
      size: 9,
      latinFont: fontBold,
      color: rgb(0.15, 0.15, 0.15),
      maxWidth: 165,
    })
    page.drawText(sanitize(entry.user_email), {
      x: 220,
      y: yPos - smallLine,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })

    // Date & time
    page.drawText(dateStr, {
      x: 400,
      y: yPos,
      size: 9,
      font: font,
      color: rgb(0.15, 0.15, 0.15),
    })
    page.drawText(timeStr + ' UTC', {
      x: 400,
      y: yPos - smallLine,
      size: 8,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    })
    
    // IP Address (below date/time)
    if (entry.ip_address) {
      page.drawText(entry.ip_address, {
        x: 400,
        y: yPos - smallLine * 2,
        size: 8,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    // Metadata
    if (metadata) {
        await drawUserText(pdfDoc, page, metadata, {
          x: margin + 10,
          y: yPos - smallLine * 2,
          size: 8,
          latinFont: font,
          color: rgb(0.5, 0.5, 0.5),
          maxWidth: 330,
        })
    }

    // Separator line
    page.drawLine({
      start: { x: margin, y: yPos - rowHeight + 6 },
      end: { x: pageWidth - margin, y: yPos - rowHeight + 6 },
      thickness: 0.3,
      color: rgb(0.9, 0.9, 0.9),
    })
    yPos -= rowHeight
  }

  // Footer on last page
  if (yPos > margin + 30) {
    yPos -= 20
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: pageWidth - margin, y: yPos },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    })
    yPos -= 16
    page.drawText('This audit trail was automatically generated by Somadhan Sign as a summary of', {
      x: margin,
      y: yPos,
      size: 8,
      font: font,
      color: rgb(0.45, 0.45, 0.45),
    })
    yPos -= smallLine
    page.drawText('the electronic signature activity recorded by the service for this document.', {
      x: margin,
      y: yPos,
      size: 8,
      font: font,
      color: rgb(0.45, 0.45, 0.45),
    })
  }

  const pdfBytes = await pdfDoc.save()
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' })
}
