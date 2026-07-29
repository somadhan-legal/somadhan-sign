const safePdfBase = (title: string): string => {
  const printableTitle = Array.from(String(title ?? ""))
    .filter((character) => {
      const code = character.charCodeAt(0)
      return code >= 32 && code !== 127
    })
    .join("")
  const cleaned = printableTitle
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/[. ]+$/g, "")
  return cleaned || "Document"
}

export const getSignedPdfFilename = (title: string): string =>
  `${safePdfBase(title)}_Somadhan_Sign.pdf`
