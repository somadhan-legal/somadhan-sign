export const MAX_DOCUMENT_TITLE_LENGTH = 160

export function normalizeDocumentTitle(value: string): string {
  return value.trim()
}

export function getSuggestedDocumentTitle(filename: string): string {
  return filename
    .trim()
    .replace(/\.pdf$/i, '')
    .trim()
    .slice(0, MAX_DOCUMENT_TITLE_LENGTH)
}
