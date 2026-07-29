const TOKEN_VERSION = "v1"
const TOKEN_BYTES = 32
const TOKEN_PATTERN = /^v1\.[A-Za-z0-9_-]{43}$/
const TOKEN_DIGEST_DOMAIN = "somadhan-sign:document-verification-token:v1:"
const EVIDENCE_DOMAIN = "somadhan-sign:completion-evidence:v1:"

const encoder = new TextEncoder()

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("")

const bytesToBase64Url = (bytes: Uint8Array) => {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "")
}

export const sha256Hex = async (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value
  const digestInput = Uint8Array.from(bytes).buffer
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", digestInput)))
}

export const createDocumentVerificationToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(TOKEN_BYTES))
  return `${TOKEN_VERSION}.${bytesToBase64Url(bytes)}`
}

export const isDocumentVerificationToken = (value: unknown): value is string =>
  typeof value === "string" && TOKEN_PATTERN.test(value)

export const getDocumentVerificationTokenDigest = async (token: string) => {
  if (!isDocumentVerificationToken(token)) throw new Error("Invalid document verification token")
  return sha256Hex(`${TOKEN_DIGEST_DOMAIN}${token}`)
}

export const getDocumentVerificationReference = (tokenDigest: string) => {
  if (!/^[0-9a-f]{64}$/.test(tokenDigest)) throw new Error("Invalid verification token digest")
  const visible = tokenDigest.slice(0, 12).toUpperCase()
  return `SS-${visible.slice(0, 4)}-${visible.slice(4, 8)}-${visible.slice(8, 12)}`
}

const stableSerialize = (value: unknown): string => {
  if (value === undefined) return "null"
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null"
  if (Array.isArray(value)) {
    const items = value.map(stableSerialize).sort()
    return `[${items.join(",")}]`
  }
  const object = value as Record<string, unknown>
  const entries = Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableSerialize(object[key])}`)
  return `{${entries.join(",")}}`
}

const normalizeEvidenceValue = async (value: unknown, key = ""): Promise<unknown> => {
  if (key === "signature_id" && typeof value === "string") {
    return { sha256: await sha256Hex(value) }
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((entry) => normalizeEvidenceValue(entry)))
  }
  if (value && typeof value === "object") {
    const normalized: Record<string, unknown> = {}
    for (const [entryKey, entryValue] of Object.entries(value as Record<string, unknown>)) {
      if (["final_pdf_url", "original_pdf_url"].includes(entryKey)) continue
      normalized[entryKey] = await normalizeEvidenceValue(entryValue, entryKey)
    }
    return normalized
  }
  return value
}

export const getCompletionAuditSnapshot = (data: Record<string, unknown>, completedAt: string) => {
  const audit = Array.isArray(data.audit_trail) ? data.audit_trail : []
  return audit.filter((entry) => {
    if (!entry || typeof entry !== "object") return false
    const record = entry as Record<string, unknown>
    if (record.action === "Completion Emails Sent") return false
    const timestamp = Date.parse(String(record.created_at || ""))
    return !Number.isFinite(timestamp) || timestamp <= Date.parse(completedAt)
  })
}

export const getCompletionEvidenceSha256 = async (
  documentId: string,
  originalPdfBytes: Uint8Array,
  completionData: Record<string, unknown>,
  completedAt: string,
) => {
  const originalPdfSha256 = await sha256Hex(originalPdfBytes)
  const source = {
    version: 1,
    documentId,
    completedAt,
    originalPdfSha256,
    completion: {
      ...completionData,
      audit_trail: getCompletionAuditSnapshot(completionData, completedAt),
    },
  }
  const normalized = await normalizeEvidenceValue(source)
  return sha256Hex(`${EVIDENCE_DOMAIN}${stableSerialize(normalized)}`)
}
