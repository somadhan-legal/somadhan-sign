import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import somadhanLogo from '@/assets/somadhan.png'

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
  // Fetch the original PDF
  const response = await fetch(originalPdfUrl)
  if (!response.ok) throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`)
  const originalBytes = await response.arrayBuffer()
  const pdfDoc = await PDFDocument.load(originalBytes, { ignoreEncryption: true })
  
  // If no audit entries, just return the original PDF
  if (!auditEntries || auditEntries.length === 0) {
    const pdfBytes = await pdfDoc.save()
    return new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' })
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
  const accentColor = rgb(0.91, 0.46, 0.38) // #e87461

  // PNG Logo (if available)
  if (logoImage) {
    const logoHeight = 40
    const logoWidth = logoImage.width * (logoHeight / logoImage.height)
    page.drawImage(logoImage, {
      x: margin,
      y: yPos - logoHeight,
      width: logoWidth,
      height: logoHeight,
    })
    yPos -= (logoHeight + 12)
  }

  // Text: "Somadhan" in brand color + "Sign" in accent color
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique)
  const somadhanWidth = fontBold.widthOfTextAtSize('Somadhan', 24)
  page.drawText('Somadhan', { x: margin, y: yPos, size: 24, font: fontBold, color: brandColor })
  page.drawText('Sign', { x: margin + somadhanWidth, y: yPos, size: 24, font: fontItalic, color: accentColor })

  // Tagline
  page.drawText('Powered by Somadhan', {
    x: margin,
    y: yPos - 18,
    size: 9,
    font: font,
    color: rgb(0.5, 0.5, 0.5),
  })

  yPos -= 40

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
    'This document was electronically signed using SomadhanSign. All parties listed below',
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
      
      // Add logo to continuation page
      if (logoImage) {
        const logoHeight = 40
        const logoWidth = logoImage.width * (logoHeight / logoImage.height)
        page.drawImage(logoImage, {
          x: margin,
          y: yPos - logoHeight,
          width: logoWidth,
          height: logoHeight,
        })
        yPos -= (logoHeight + 12)
      }
      
      // Text branding
      const somadhanWidth = fontBold.widthOfTextAtSize('Somadhan', 24)
      page.drawText('Somadhan', { x: margin, y: yPos, size: 24, font: fontBold, color: brandColor })
      page.drawText('Sign', { x: margin + somadhanWidth, y: yPos, size: 24, font: fontItalic, color: accentColor })
      page.drawText('Powered by Somadhan', {
        x: margin,
        y: yPos - 18,
        size: 9,
        font: font,
        color: rgb(0.5, 0.5, 0.5),
      })
      yPos -= 40
      
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
    page.drawText('This audit trail was automatically generated by SomadhanSign and constitutes', {
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
