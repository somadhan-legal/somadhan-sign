const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function getFinalPdfStoragePath(ownerId: unknown, documentId: unknown, nonce: unknown): string {
  const owner = String(ownerId || '')
  const document = String(documentId || '')
  const uniquePart = String(nonce || '')
  if (!UUID_PATTERN.test(owner) || !UUID_PATTERN.test(document) || !UUID_PATTERN.test(uniquePart)) {
    throw new Error('The completed document storage reference is invalid')
  }
  return `${owner}/signed/${document}_${uniquePart}.pdf`
}
