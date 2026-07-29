export const MAX_VERIFICATION_PDF_BYTES = 30_000_000
const TOKEN_PATTERN = /^v1\.[A-Za-z0-9_-]{43}$/

export interface ActiveVerificationRecord {
  schemaVersion: 1
  status: 'active'
  issuer: 'Somadhan Sign'
  referenceCode: string
  evidenceSha256: string
  artifactSha256: string
  artifactSize: number
  hashScheme: 'raw-pdf-bytes-v1'
  completedAt: string
  issuedAt: string
}

export type VerificationResult =
  | { status: 'active'; record: ActiveVerificationRecord }
  | { status: 'revoked'; referenceCode?: string }
  | { status: 'not_found' }
  | { status: 'unavailable' }

export function readVerificationToken(hash: string): string | null {
  const value = hash.replace(/^#/, '')
  return TOKEN_PATTERN.test(value) ? value : null
}

const isActiveRecord = (value: unknown): value is ActiveVerificationRecord => {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return record.schemaVersion === 1
    && record.status === 'active'
    && record.issuer === 'Somadhan Sign'
    && typeof record.referenceCode === 'string'
    && /^[0-9a-f]{64}$/.test(String(record.evidenceSha256))
    && /^[0-9a-f]{64}$/.test(String(record.artifactSha256))
    && Number.isSafeInteger(record.artifactSize)
    && Number(record.artifactSize) > 0
    && Number(record.artifactSize) <= MAX_VERIFICATION_PDF_BYTES
    && record.hashScheme === 'raw-pdf-bytes-v1'
    && Number.isFinite(Date.parse(String(record.completedAt)))
    && Number.isFinite(Date.parse(String(record.issuedAt)))
}

export async function fetchDocumentVerification(token: string): Promise<VerificationResult> {
  if (!TOKEN_PATTERN.test(token)) return { status: 'not_found' }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string
  if (!supabaseUrl || !supabaseAnonKey) return { status: 'unavailable' }

  let response: Response
  try {
    response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/functions/v1/verify-document`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    })
  } catch {
    return { status: 'unavailable' }
  }

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return { status: 'unavailable' }
  }
  if (response.ok && isActiveRecord(body)) return { status: 'active', record: body }
  if (response.status === 410 && body && typeof body === 'object') {
    const referenceCode = (body as Record<string, unknown>).referenceCode
    return { status: 'revoked', referenceCode: typeof referenceCode === 'string' ? referenceCode : undefined }
  }
  if (response.status === 404) return { status: 'not_found' }
  return { status: 'unavailable' }
}

export async function hashVerificationPdf(file: File): Promise<string> {
  if (
    file.size <= 0 ||
    file.size > MAX_VERIFICATION_PDF_BYTES ||
    (file.type && file.type !== 'application/pdf')
  ) {
    throw new Error('invalid_pdf')
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== '%PDF-') {
    throw new Error('invalid_pdf')
  }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
  return Array.from(digest).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const formatVerificationFingerprint = (value: string) =>
  value.match(/.{1,8}/g)?.join(' ') || value
