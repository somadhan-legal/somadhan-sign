import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export interface AuditEntry {
  action: string
  user_email: string
  user_name?: string | null
  created_at: string
  metadata?: string | null
  ip_address?: string | null
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
  console.log('[generateAuditPdf] Called with:', { documentTitle, entryCount: auditEntries.length, url: originalPdfUrl.substring(0, 50) })
  console.log('[generateAuditPdf] Audit entries:', auditEntries.map(e => ({ action: e.action, user: e.user_email })))
  
  // Fetch the original PDF
  const response = await fetch(originalPdfUrl)
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
  const originalBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true })
  
  const existingPageCount = pdfDoc.getPageCount()
  console.log('[generateAuditPdf] Original PDF has', existingPageCount, 'pages')
  
  // If no audit entries, just return the original PDF
  if (!auditEntries || auditEntries.length === 0) {
    console.log('[generateAuditPdf] No audit entries, returning original PDF')
    const pdfBytes = await pdfDoc.save()
    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const pageWidth = 595.28 // A4
  const pageHeight = 841.89
  const margin = 50
  const lineHeight = 16
  const smallLine = 13

  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let yPos = pageHeight - margin

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
  page.drawText(documentTitle, {
    x: margin + 70,
    y: yPos,
    size: 10,
    font: font,
    color: rgb(0.2, 0.2, 0.2),
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
    'This document was electronically signed using RocketSign. All parties listed below',
    'have agreed to use electronic signatures pursuant to applicable electronic signature',
    'laws. Each action below was logged with a timestamp for legal verification purposes.',
    'This audit trail provides a tamper-evident record of all signing activity.',
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
    // Check if we need a new page
    if (yPos < margin + 40) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      yPos = pageHeight - margin
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
    const dateStr = dt.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
    const timeStr = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })

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
    page.drawText(sanitize(userName), {
      x: 220,
      y: yPos,
      size: 9,
      font: fontBold,
      color: rgb(0.15, 0.15, 0.15),
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
    if (entry.metadata) {
      const sanitized = sanitize(entry.metadata)
      if (sanitized.trim()) {
        page.drawText(sanitized, {
          x: margin + 10,
          y: yPos - smallLine,
          size: 8,
          font: font,
          color: rgb(0.5, 0.5, 0.5),
        })
      }
    }

    // Separator line
    page.drawLine({
      start: { x: margin, y: yPos - smallLine * 2 - 6 },
      end: { x: pageWidth - margin, y: yPos - smallLine * 2 - 6 },
      thickness: 0.3,
      color: rgb(0.9, 0.9, 0.9),
    })
    yPos -= smallLine * 2 + 12
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
    page.drawText('This audit trail was automatically generated by RocketSign and constitutes', {
      x: margin,
      y: yPos,
      size: 8,
      font: font,
      color: rgb(0.45, 0.45, 0.45),
    })
    yPos -= smallLine
    page.drawText('a legally binding record of all electronic signature activity for this document.', {
      x: margin,
      y: yPos,
      size: 8,
      font: font,
      color: rgb(0.45, 0.45, 0.45),
    })
  }

  const pdfBytes = await pdfDoc.save()
  return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
}
