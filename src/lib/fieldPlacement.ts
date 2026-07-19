export type FieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox'

const FIELD_SIZE_PERCENTAGES: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 20, height: 6 },
  initials: { width: 10, height: 5 },
  date: { width: 14, height: 4 },
  text: { width: 18, height: 4 },
  checkbox: { width: 4, height: 4 },
}

export function getFieldPlacement(
  type: FieldType,
  pointerX: number,
  pointerY: number,
  pageWidth: number,
  pageHeight: number
) {
  const size = FIELD_SIZE_PERCENTAGES[type]
  const pointerXPercent = (pointerX / pageWidth) * 100
  const pointerYPercent = (pointerY / pageHeight) * 100

  return {
    x: Math.max(0, Math.min(100 - size.width, pointerXPercent - size.width / 2)),
    y: Math.max(0, Math.min(100 - size.height, pointerYPercent - size.height / 2)),
    width: size.width,
    height: size.height,
  }
}
