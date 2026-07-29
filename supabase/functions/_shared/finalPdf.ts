import { initWasm, Resvg } from "resvg"
// @deno-types="npm:@types/qrcode@1.5.6"
import QRCode from "qrcode"
import {
  degrees,
  PDFDocument,
  type PDFFont,
  type PDFPage,
  rgb,
  StandardFonts,
} from "pdf-lib"

type FieldType = "signature" | "initials" | "date" | "text" | "checkbox"

interface CompletionField {
  id: string
  field_type: FieldType
  page_number: number
  x: number
  y: number
  width: number
  height: number
}

interface CompletionPlacement {
  field_id: string
  signature_id: string
}

interface AuditEntry {
  action: string
  user_email: string
  user_name?: string | null
  created_at: string
  metadata?: string | null
  ip_address?: string | null
}

export interface CompletionPdfData {
  title?: string | null
  fields?: CompletionField[] | null
  placements?: CompletionPlacement[] | null
  audit_trail?: AuditEntry[] | null
  verification?: {
    url: string
    reference: string
    evidence_sha256: string
  } | null
}

interface PlacementRect {
  x: number
  y: number
  width: number
  height: number
  rotation: 0 | 90 | 180 | 270
}

interface PdfFonts {
  regular: PDFFont
  bold: PDFFont
  complexTextCache: Map<string, Promise<RenderedComplexText | null>>
}

interface RenderedComplexText {
  png: Uint8Array
  width: number
  height: number
}

const BENGALI_FONT_URLS = [
  "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-bengali@5.2.9/files/noto-sans-bengali-bengali-400-normal.woff2",
  "https://unpkg.com/@fontsource/noto-sans-bengali@5.2.9/files/noto-sans-bengali-bengali-400-normal.woff2",
]
const BENGALI_FONT_SHA256 = "630ee7c0247ed5d5e7d14da9df7f498a81a02e64dd5c9ddb855232f19a834dc5"
const LATIN_FONT_URLS = [
  "https://cdn.jsdelivr.net/npm/@fontsource/noto-sans-bengali@5.2.9/files/noto-sans-bengali-latin-400-normal.woff2",
  "https://unpkg.com/@fontsource/noto-sans-bengali@5.2.9/files/noto-sans-bengali-latin-400-normal.woff2",
]
const LATIN_FONT_SHA256 = "54af14501d94a41ce1c424a76d3cdd3b88bc313271ef90bde9cb1a85cd194747"
const RESVG_WASM_URLS = [
  "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm",
  "https://unpkg.com/@resvg/resvg-wasm@2.6.2/index_bg.wasm",
]
const RESVG_WASM_SHA256 = "22bf6e9f9a100d972da0411a69c5ba504367fc1fa87b3b64e3f35e53926d2d70"
const MAX_ORIGINAL_PDF_BYTES = 25_000_000
const MAX_FINAL_PDF_BYTES = 30_000_000
const MAX_SIGNATURE_BYTES = 2_300_000
const MAX_SIGNATURE_DIMENSION = 4096
const MAX_SIGNATURE_PIXELS = 8_000_000
const UNSAFE_PDF_FEATURE = /\/(?:AA|EmbeddedFiles|ImportData|JavaScript|JS|Launch|Movie|OpenAction|Rendition|RichMedia|Sound|SubmitForm|XFA)(?=[\s<>[\]()/]|$)/

let bengaliFontBytesPromise: Promise<Uint8Array> | null = null
let latinFontBytesPromise: Promise<Uint8Array> | null = null
let resvgReadyPromise: Promise<void> | null = null

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("")

const fetchVerifiedBytes = async (urls: string[], expectedHash: string, label: string) => {
  let lastError: unknown = null
  for (const url of urls) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (!response.ok) throw new Error(`${label} request failed with status ${response.status}`)
      const bytes = new Uint8Array(await response.arrayBuffer())
      const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
      if (bytesToHex(digest) !== expectedHash) {
        throw new Error(`${label} integrity verification failed`)
      }
      return bytes
    } catch (error) {
      lastError = error
    }
  }
  throw new Error(`${label} could not be loaded`, { cause: lastError })
}

const loadBengaliFontBytes = () => {
  bengaliFontBytesPromise ??= fetchVerifiedBytes(
    BENGALI_FONT_URLS,
    BENGALI_FONT_SHA256,
    "The Bengali PDF font",
  )
  return bengaliFontBytesPromise
}

const loadLatinFontBytes = () => {
  latinFontBytesPromise ??= fetchVerifiedBytes(
    LATIN_FONT_URLS,
    LATIN_FONT_SHA256,
    "The Latin PDF font",
  )
  return latinFontBytesPromise
}

const prepareResvg = () => {
  resvgReadyPromise ??= (async () => {
    const wasm = await fetchVerifiedBytes(
      RESVG_WASM_URLS,
      RESVG_WASM_SHA256,
      "The PDF text rendering engine",
    )
    await initWasm(wasm)
  })()
  return resvgReadyPromise
}

const renderVerificationQr = async (url: string) => {
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 512,
    color: {
      dark: "#075056",
      light: "#FFFFFF",
    },
  })
  const encoded = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)?.[1]
  if (!encoded) throw new Error("The verification QR code could not be rendered")
  const binary = atob(encoded)
  return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

const hasBengali = (value: unknown) => /[\u0951-\u0952\u0964-\u0965\u0980-\u09FE]/u.test(String(value ?? ""))

const normalizeRotation = (angle: number): 0 | 90 | 180 | 270 => {
  const normalized = ((angle % 360) + 360) % 360
  return normalized === 90 || normalized === 180 || normalized === 270 ? normalized : 0
}

const getPlacementRect = (page: PDFPage, field: CompletionField): PlacementRect => {
  const crop = page.getCropBox()
  const rotation = normalizeRotation(page.getRotation().angle)
  const displayWidth = rotation === 90 || rotation === 270 ? crop.height : crop.width
  const displayHeight = rotation === 90 || rotation === 270 ? crop.width : crop.height
  const left = (field.x / 100) * displayWidth
  const top = (field.y / 100) * displayHeight
  const width = (field.width / 100) * displayWidth
  const height = (field.height / 100) * displayHeight

  switch (rotation) {
    case 90:
      return { x: crop.x + top + height, y: crop.y + left, width, height, rotation }
    case 180:
      return { x: crop.x + crop.width - left, y: crop.y + top + height, width, height, rotation }
    case 270:
      return {
        x: crop.x + crop.width - top - height,
        y: crop.y + crop.height - left,
        width,
        height,
        rotation,
      }
    default:
      return {
        x: crop.x + left,
        y: crop.y + crop.height - top - height,
        width,
        height,
        rotation,
      }
  }
}

const offsetPlacementPoint = (rect: PlacementRect, horizontal: number, vertical: number) => {
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

const cleanLine = (value: unknown) => String(value ?? "")
  .replace(/[\r\n\t]+/g, " ")
  .replace(/\s+/g, " ")
  .trim()

const fitLatinText = (value: string, font: PDFFont, maxWidth: number, preferredSize: number) => {
  let size = Math.max(6, preferredSize)
  let text = cleanLine(value).replace(/[^\x20-\x7E]/g, "")
  while (size > 6 && font.widthOfTextAtSize(text, size) > maxWidth) size -= 0.5
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return { text, size }
  while (text.length > 1 && font.widthOfTextAtSize(`${text}...`, size) > maxWidth) {
    text = text.slice(0, -1)
  }
  return { text: `${text}...`, size }
}

const escapeXml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;")

const renderComplexText = async (
  value: string,
  preferredSize: number,
  maxWidth: number,
  color: ReturnType<typeof rgb>,
) => {
  await prepareResvg()
  const [bengaliFontBytes, latinFontBytes] = await Promise.all([
    loadBengaliFontBytes(),
    loadLatinFontBytes(),
  ])
  const renderScale = 4

  const renderAtSize = (size: number) => {
    const canvasHeight = Math.max(96, Math.ceil(size * renderScale * 2.4))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="4096" height="${canvasHeight}">
      <text x="12" y="${Math.ceil(size * renderScale * 1.45)}"
        font-family="Noto Sans Bengali" font-size="${size * renderScale}"
        fill="rgb(${Math.round(color.red * 255)},${Math.round(color.green * 255)},${Math.round(color.blue * 255)})">${escapeXml(cleanLine(value))}</text>
    </svg>`
    const renderer = new Resvg(svg, {
      font: {
        fontBuffers: [bengaliFontBytes, latinFontBytes],
        defaultFontFamily: "Noto Sans Bengali",
      },
      textRendering: 1,
    })
    const bbox = renderer.innerBBox()
    if (!bbox || bbox.width <= 0 || bbox.height <= 0) {
      renderer.free()
      return null
    }
    const width = bbox.width / renderScale
    const height = bbox.height / renderScale
    renderer.cropByBBox(bbox)
    const rendered = renderer.render()
    const png = rendered.asPng()
    rendered.free()
    renderer.free()
    return { png, width, height }
  }

  let size = Math.max(6, preferredSize)
  let rendered = renderAtSize(size)
  if (!rendered) return null
  if (rendered.width > maxWidth && size > 6) {
    size = Math.max(6, size * maxWidth / rendered.width)
    rendered = renderAtSize(size)
  }
  if (!rendered) return null
  const scale = rendered.width > maxWidth ? maxWidth / rendered.width : 1
  return {
    png: rendered.png,
    width: rendered.width * scale,
    height: rendered.height * scale,
  }
}

const drawFittedText = async (
  pdfDoc: PDFDocument,
  page: PDFPage,
  value: string,
  fonts: PdfFonts,
  options: {
    x: number
    y: number
    maxWidth: number
    preferredSize: number
    rotation?: 0 | 90 | 180 | 270
    color?: ReturnType<typeof rgb>
    bold?: boolean
  },
) => {
  const rotation = options.rotation ?? 0
  const color = options.color ?? rgb(0, 0, 0)
  if (hasBengali(value)) {
    const maxWidth = Math.max(options.maxWidth, 8)
    const cacheKey = JSON.stringify([
      cleanLine(value),
      options.preferredSize,
      maxWidth,
      color.red,
      color.green,
      color.blue,
    ])
    let renderPromise = fonts.complexTextCache.get(cacheKey)
    if (!renderPromise) {
      renderPromise = renderComplexText(value, options.preferredSize, maxWidth, color)
      if (fonts.complexTextCache.size < 128) {
        fonts.complexTextCache.set(cacheKey, renderPromise)
      }
    }
    const rendered = await renderPromise
    if (!rendered) return
    const image = await pdfDoc.embedPng(rendered.png)
    page.drawImage(image, {
      x: options.x,
      y: options.y - rendered.height * 0.15,
      width: rendered.width,
      height: rendered.height,
      rotate: degrees(rotation),
    })
    return
  }
  const font = options.bold ? fonts.bold : fonts.regular
  const { text, size } = fitLatinText(value, font, Math.max(options.maxWidth, 8), options.preferredSize)
  if (text) {
    page.drawText(text, {
      x: options.x,
      y: options.y,
      size,
      font,
      color: options.color ?? rgb(0, 0, 0),
      rotate: degrees(rotation),
    })
  }
}

const decodeSignaturePng = (value: string) => {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=\s]+)$/i.exec(value)
  if (!match) throw new Error("A completed signature has an invalid image format")
  let binary: string
  try {
    binary = atob(match[1].replace(/\s+/g, ""))
  } catch (error) {
    throw new Error("A completed signature has invalid image data", { cause: error })
  }
  if (binary.length === 0 || binary.length > MAX_SIGNATURE_BYTES) {
    throw new Error("A completed signature has an invalid image size")
  }
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  const pngHeader = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  if (!pngHeader.every((byte, index) => bytes[index] === byte)) {
    throw new Error("A completed signature is not a valid PNG")
  }
  if (
    bytes.length < 24 ||
    String.fromCharCode(...bytes.slice(12, 16)) !== "IHDR"
  ) {
    throw new Error("A completed signature has an invalid PNG header")
  }
  const dimensions = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = dimensions.getUint32(16)
  const height = dimensions.getUint32(20)
  if (
    width < 1 ||
    height < 1 ||
    width > MAX_SIGNATURE_DIMENSION ||
    height > MAX_SIGNATURE_DIMENSION ||
    width * height > MAX_SIGNATURE_PIXELS
  ) {
    throw new Error("A completed signature has invalid image dimensions")
  }
  return bytes
}

const formatSigningDate = (value: string) => {
  const dateValue = value.startsWith("date:") ? value.slice(5) : value
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue)
  return match ? `${match[3]}/${match[2]}/${match[1]}` : dateValue
}

const formatSigningText = (value: string) =>
  value.startsWith("text:") ? value.slice(5) : value

const formatAuditMetadata = (metadata: string | null | undefined) => {
  const value = cleanLine(metadata)
  if (!value) return null
  const normalizeCount = (candidate: unknown) => {
    const count = Number(candidate)
    return Number.isInteger(count) && count >= 0 ? count : null
  }
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return null
    if (typeof parsed.version === "string" && typeof parsed.language === "string") {
      return `Consent version: ${cleanLine(parsed.version)} | Language: ${
        parsed.language === "bn" ? "Bangla" : "English"
      }`
    }
    const sent = normalizeCount(parsed.sent)
    const failed = normalizeCount(parsed.failed)
    if (sent !== null || failed !== null) return `Sent: ${sent ?? 0} | Failed: ${failed ?? 0}`
    const signerCount = normalizeCount(parsed.signerCount)
    const viewerCount = Array.isArray(parsed.ccEmails) ? parsed.ccEmails.length : null
    if (signerCount !== null || viewerCount !== null) {
      return `Signers: ${signerCount ?? 0} | Viewers: ${viewerCount ?? 0}`
    }
    const recipientCount = normalizeCount(parsed.recipientCount)
    if (recipientCount !== null) return `Completion recipients: ${recipientCount}`
    return null
  } catch {
    return value.slice(0, 300)
  }
}

const drawBrand = (page: PDFPage, fonts: PdfFonts, y: number) => {
  const brandColor = rgb(0.02, 0.31, 0.33)
  page.drawText("Somadhan", {
    x: 50,
    y,
    size: 20,
    font: fonts.bold,
    color: brandColor,
  })
  const brandWidth = fonts.bold.widthOfTextAtSize("Somadhan", 20)
  page.drawText("Sign", {
    x: 50 + brandWidth + 2,
    y,
    size: 20,
    font: fonts.bold,
    color: rgb(0.98, 0.35, 0.26),
  })
  page.drawText("Powered by Somadhan", {
    x: 50,
    y: y - 15,
    size: 8.5,
    font: fonts.regular,
    color: rgb(0.5, 0.5, 0.5),
  })
  page.drawLine({
    start: { x: 50, y: y - 28 },
    end: { x: 545.28, y: y - 28 },
    thickness: 1.5,
    color: brandColor,
  })
}

const appendAuditCertificate = async (
  pdfDoc: PDFDocument,
  fonts: PdfFonts,
  entries: AuditEntry[],
  documentTitle: string,
  generatedAt: Date,
  verification?: NonNullable<CompletionPdfData["verification"]>,
) => {
  if (entries.length === 0 && !verification) return
  const pageWidth = 595.28
  const pageHeight = 841.89
  const margin = 50
  const smallLine = 13
  let page = pdfDoc.addPage([pageWidth, pageHeight])
  let y = pageHeight - margin

  drawBrand(page, fonts, y - 20)
  y -= 92
  page.drawText("CERTIFICATE OF COMPLETION", {
    x: margin,
    y,
    size: 18,
    font: fonts.bold,
    color: rgb(0.1, 0.1, 0.1),
  })
  y -= 28
  page.drawText("Electronic Signature Audit Trail", {
    x: margin,
    y,
    size: 11,
    font: fonts.regular,
    color: rgb(0.4, 0.4, 0.4),
  })
  y -= 24
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8),
  })
  y -= 20
  page.drawText("Document:", {
    x: margin,
    y,
    size: 10,
    font: fonts.bold,
    color: rgb(0.2, 0.2, 0.2),
  })
  await drawFittedText(pdfDoc, page, documentTitle, fonts, {
    x: margin + 70,
    y,
    preferredSize: 10,
    maxWidth: pageWidth - margin * 2 - 70,
    color: rgb(0.2, 0.2, 0.2),
  })
  y -= 16
  page.drawText("Generated:", {
    x: margin,
    y,
    size: 10,
    font: fonts.bold,
    color: rgb(0.2, 0.2, 0.2),
  })
  const generated = generatedAt.toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })
  page.drawText(`${generated} UTC`, {
    x: margin + 70,
    y,
    size: 10,
    font: fonts.regular,
    color: rgb(0.2, 0.2, 0.2),
  })
  y -= 24
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 0.5,
    color: rgb(0.85, 0.85, 0.85),
  })
  y -= 16
  const notice = [
    "This document was processed using Somadhan Sign. The events below are the activity",
    "records captured by the service, including any electronic-signature consent event.",
    "This certificate is an activity summary and does not independently determine the legal",
    "validity or enforceability of the document in any particular jurisdiction.",
  ]
  for (const line of notice) {
    page.drawText(line, {
      x: margin,
      y,
      size: 8.5,
      font: fonts.regular,
      color: rgb(0.45, 0.45, 0.45),
    })
    y -= smallLine
  }
  y -= 8

  if (verification) {
    const verificationUrl = new URL(verification.url)
    if (
      verificationUrl.protocol !== "https:" ||
      verificationUrl.hostname !== "sign.somadhan.com" ||
      verificationUrl.pathname !== "/verify" ||
      verificationUrl.search ||
      !/^#v1\.[A-Za-z0-9_-]{43}$/.test(verificationUrl.hash) ||
      !/^SS-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/.test(verification.reference) ||
      !/^[0-9a-f]{64}$/.test(verification.evidence_sha256)
    ) {
      throw new Error("The document verification record is invalid")
    }

    const blockHeight = 112
    const qrSize = 84
    page.drawRectangle({
      x: margin,
      y: y - blockHeight,
      width: pageWidth - margin * 2,
      height: blockHeight,
      color: rgb(0.965, 0.975, 0.975),
      borderColor: rgb(0.82, 0.87, 0.87),
      borderWidth: 0.8,
    })
    const qrImage = await pdfDoc.embedPng(await renderVerificationQr(verification.url))
    page.drawImage(qrImage, {
      x: margin + 14,
      y: y - blockHeight + 14,
      width: qrSize,
      height: qrSize,
    })

    const textX = margin + 116
    page.drawText("VERIFY THIS COMPLETION RECORD", {
      x: textX,
      y: y - 25,
      size: 9,
      font: fonts.bold,
      color: rgb(0.02, 0.31, 0.33),
    })
    page.drawText("Scan the QR code to open the Somadhan Sign verification record.", {
      x: textX,
      y: y - 42,
      size: 8.2,
      font: fonts.regular,
      color: rgb(0.28, 0.32, 0.32),
    })
    page.drawText(`Reference: ${verification.reference}`, {
      x: textX,
      y: y - 61,
      size: 8.2,
      font: fonts.bold,
      color: rgb(0.18, 0.22, 0.22),
    })
    page.drawText("Evidence fingerprint (SHA-256):", {
      x: textX,
      y: y - 78,
      size: 7.4,
      font: fonts.regular,
      color: rgb(0.45, 0.48, 0.48),
    })
    page.drawText(verification.evidence_sha256.slice(0, 32), {
      x: textX,
      y: y - 91,
      size: 6.6,
      font: fonts.regular,
      color: rgb(0.32, 0.35, 0.35),
    })
    page.drawText(verification.evidence_sha256.slice(32), {
      x: textX,
      y: y - 102,
      size: 6.6,
      font: fonts.regular,
      color: rgb(0.32, 0.35, 0.35),
    })
    y -= blockHeight + 18
  }

  const drawColumnHeader = () => {
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    })
    y -= 20
    for (const [label, x] of [["ACTION", margin], ["USER", 220], ["DATE & TIME", 400]] as const) {
      page.drawText(label, {
        x,
        y,
        size: 8,
        font: fonts.bold,
        color: rgb(0.4, 0.4, 0.4),
      })
    }
    y -= 12
  }
  drawColumnHeader()

  for (const entry of entries) {
    const metadata = formatAuditMetadata(entry.metadata)
    const rowHeight = metadata || entry.ip_address ? smallLine * 3 + 12 : smallLine * 2 + 12
    if (y < margin + rowHeight) {
      page = pdfDoc.addPage([pageWidth, pageHeight])
      y = pageHeight - margin
      drawBrand(page, fonts, y - 20)
      y -= 92
      page.drawText("AUDIT TRAIL (continued)", {
        x: margin,
        y,
        size: 14,
        font: fonts.bold,
        color: rgb(0.1, 0.1, 0.1),
      })
      y -= 22
      drawColumnHeader()
    }

    const date = new Date(entry.created_at)
    const validDate = Number.isFinite(date.getTime()) ? date : generatedAt
    const dateText = validDate.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    })
    const timeText = validDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "UTC",
    })

    await drawFittedText(pdfDoc, page, entry.action, fonts, {
      x: margin,
      y,
      preferredSize: 9,
      maxWidth: 155,
      color: rgb(0.15, 0.15, 0.15),
      bold: true,
    })
    await drawFittedText(pdfDoc, page, entry.user_name || entry.user_email.split("@")[0], fonts, {
      x: 220,
      y,
      preferredSize: 9,
      maxWidth: 165,
      color: rgb(0.15, 0.15, 0.15),
      bold: true,
    })
    await drawFittedText(pdfDoc, page, entry.user_email, fonts, {
      x: 220,
      y: y - smallLine,
      preferredSize: 8,
      maxWidth: 165,
      color: rgb(0.5, 0.5, 0.5),
    })
    page.drawText(dateText, {
      x: 400,
      y,
      size: 9,
      font: fonts.regular,
      color: rgb(0.15, 0.15, 0.15),
    })
    page.drawText(`${timeText} UTC`, {
      x: 400,
      y: y - smallLine,
      size: 8,
      font: fonts.regular,
      color: rgb(0.5, 0.5, 0.5),
    })
    if (entry.ip_address) {
      await drawFittedText(pdfDoc, page, entry.ip_address, fonts, {
        x: 400,
        y: y - smallLine * 2,
        preferredSize: 8,
        maxWidth: 145,
        color: rgb(0.5, 0.5, 0.5),
      })
    }
    if (metadata) {
      await drawFittedText(pdfDoc, page, metadata, fonts, {
        x: margin + 10,
        y: y - smallLine * 2,
        preferredSize: 8,
        maxWidth: 330,
        color: rgb(0.5, 0.5, 0.5),
      })
    }
    page.drawLine({
      start: { x: margin, y: y - rowHeight + 6 },
      end: { x: pageWidth - margin, y: y - rowHeight + 6 },
      thickness: 0.3,
      color: rgb(0.9, 0.9, 0.9),
    })
    y -= rowHeight
  }

  if (y > margin + 45) {
    y -= 12
    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    })
    y -= 16
    page.drawText("This audit trail was automatically generated by Somadhan Sign as a summary of", {
      x: margin,
      y,
      size: 8,
      font: fonts.regular,
      color: rgb(0.45, 0.45, 0.45),
    })
    page.drawText("the electronic signature activity recorded by the service for this document.", {
      x: margin,
      y: y - smallLine,
      size: 8,
      font: fonts.regular,
      color: rgb(0.45, 0.45, 0.45),
    })
  }
}

export async function generateAuthoritativeFinalPdf(
  originalPdfBytes: Uint8Array,
  data: CompletionPdfData,
  generatedAt = new Date(),
) {
  if (
    originalPdfBytes.length === 0 ||
    originalPdfBytes.length > MAX_ORIGINAL_PDF_BYTES ||
    new TextDecoder().decode(originalPdfBytes.slice(0, 5)) !== "%PDF-"
  ) {
    throw new Error("The original document is not a valid supported PDF")
  }
  const fields = Array.isArray(data.fields) ? data.fields : []
  const placements = Array.isArray(data.placements) ? data.placements : []
  const placementByField = new Map(placements.map((placement) => [placement.field_id, placement]))
  if (fields.length === 0 || fields.some((field) => !placementByField.has(field.id))) {
    throw new Error("The completed document does not contain every required field")
  }

  const pdfDoc = await PDFDocument.load(originalPdfBytes, { ignoreEncryption: true })
  if (
    pdfDoc.context.enumerateIndirectObjects()
      .some(([, object]) => UNSAFE_PDF_FEATURE.test(object.toString()))
  ) {
    throw new Error("The original document contains unsupported active content")
  }
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fonts: PdfFonts = { regular, bold, complexTextCache: new Map() }

  for (const field of fields) {
    if (
      !Number.isInteger(field.page_number) ||
      field.page_number < 1 ||
      field.page_number > pdfDoc.getPageCount() ||
      ![field.x, field.y, field.width, field.height].every(Number.isFinite) ||
      field.x < 0 ||
      field.y < 0 ||
      field.width <= 0 ||
      field.height <= 0 ||
      field.x + field.width > 100.001 ||
      field.y + field.height > 100.001
    ) {
      throw new Error("The completed document contains an invalid field position")
    }
    const placement = placementByField.get(field.id)
    if (!placement) throw new Error("The completed document is missing a field value")
    const page = pdfDoc.getPage(field.page_number - 1)
    const rect = getPlacementRect(page, field)

    if (field.field_type === "signature" || field.field_type === "initials") {
      const image = await pdfDoc.embedPng(decodeSignaturePng(placement.signature_id))
      const scale = Math.min(rect.width / image.width, rect.height / image.height)
      const width = image.width * scale
      const height = image.height * scale
      const point = offsetPlacementPoint(
        rect,
        (rect.width - width) / 2,
        (rect.height - height) / 2,
      )
      page.drawImage(image, {
        x: point.x,
        y: point.y,
        width,
        height,
        rotate: degrees(rect.rotation),
      })
    } else if (field.field_type === "date") {
      await drawFittedText(pdfDoc, page, formatSigningDate(placement.signature_id), fonts, {
        x: rect.x,
        y: rect.y,
        maxWidth: rect.width,
        preferredSize: Math.min(11, Math.max(7, rect.height * 0.55)),
        rotation: rect.rotation,
      })
    } else if (field.field_type === "checkbox") {
      if (placement.signature_id === "checked" || placement.signature_id === "checkbox:checked") {
        await drawFittedText(pdfDoc, page, "X", fonts, {
          x: rect.x,
          y: rect.y,
          maxWidth: rect.width,
          preferredSize: Math.min(11, Math.max(7, rect.height * 0.55)),
          rotation: rect.rotation,
          bold: true,
        })
      }
    } else if (field.field_type === "text") {
      await drawFittedText(pdfDoc, page, formatSigningText(placement.signature_id), fonts, {
        x: rect.x,
        y: rect.y,
        maxWidth: rect.width,
        preferredSize: Math.min(11, Math.max(7, rect.height * 0.55)),
        rotation: rect.rotation,
      })
    } else {
      throw new Error("The completed document contains an unsupported field type")
    }
  }

  await appendAuditCertificate(
    pdfDoc,
    fonts,
    Array.isArray(data.audit_trail) ? data.audit_trail : [],
    cleanLine(data.title) || "Document",
    generatedAt,
    data.verification || undefined,
  )
  const finalBytes = await pdfDoc.save()
  if (finalBytes.length > MAX_FINAL_PDF_BYTES) {
    throw new Error("The completed PDF is too large")
  }
  return finalBytes
}
