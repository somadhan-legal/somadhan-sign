export function safePdfFilename(title: string, suffix = ''): string {
  const printableTitle = Array.from(title).filter((character) => character.charCodeAt(0) >= 32).join('')
  const safeTitle = printableTitle.replace(/[|<>:"/\\?*]/g, '_').trim() || 'Document'
  return `${safeTitle}${suffix}.pdf`
}

export async function downloadPdfUrl(url: string, filename: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('The PDF could not be downloaded')
  downloadBlob(await response.blob(), filename)
}

export function downloadBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const link = window.document.createElement('a')
  try {
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
  } finally {
    link.remove()
    URL.revokeObjectURL(objectUrl)
  }
}
