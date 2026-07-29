export function getFittedSignatureFontSize(
  text: string,
  measureAtSize: (size: number) => number,
  maxWidth: number,
  preferredSize = 64,
  minimumSize = 24,
): number {
  if (!text.trim() || maxWidth <= 0) return minimumSize

  let size = Math.max(preferredSize, minimumSize)
  while (size > minimumSize && measureAtSize(size) > maxWidth) {
    size -= 1
  }
  return Math.max(size, minimumSize)
}
