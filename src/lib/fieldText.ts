export interface FittedFieldText {
  text: string
  size: number
}

export const normalizeFieldText = (value: string) =>
  value.replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim()

export function fitSingleLineFieldText(
  value: string,
  measureWidth: (text: string, size: number) => number,
  maxWidth: number,
  preferredSize: number,
  minimumSize = 6,
): FittedFieldText {
  const normalized = normalizeFieldText(value)
  if (!normalized || maxWidth <= 0) return { text: '', size: Math.max(minimumSize, preferredSize) }

  let size = Math.max(minimumSize, preferredSize)
  while (size > minimumSize && measureWidth(normalized, size) > maxWidth) {
    size = Math.max(minimumSize, size - 0.5)
  }
  if (measureWidth(normalized, size) <= maxWidth) return { text: normalized, size }

  let fitted = normalized
  while (fitted.length > 1 && measureWidth(`${fitted}...`, size) > maxWidth) {
    fitted = fitted.slice(0, -1)
  }
  return { text: `${fitted}...`, size }
}
