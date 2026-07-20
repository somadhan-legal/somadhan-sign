export function safePdfFilename(title: string, suffix = ''): string {
  const printableTitle = Array.from(title).filter((character) => character.charCodeAt(0) >= 32).join('')
  const safeTitle = printableTitle.replace(/[|<>:"/\\?*]/g, '_').trim() || 'Document'
  return `${safeTitle}${suffix}.pdf`
}

export async function downloadPdfUrl(url: string, filename: string): Promise<void> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('The PDF could not be downloaded')
  const blob = await response.blob()
  if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('The downloaded file is not a valid PDF')
  downloadBlob(blob, filename)
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
    // Safari can cancel a download if its blob URL is revoked in the same task.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  }
}
