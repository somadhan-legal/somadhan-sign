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

type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown'
type FieldBounds = { x: number; y: number; width: number; height: number }

export function adjustFieldWithKeyboard(
  field: FieldBounds,
  key: ArrowKey,
  resize: boolean,
  fineAdjustment: boolean,
): FieldBounds {
  const step = fineAdjustment ? 0.25 : 1
  if (resize) {
    const widthDelta = key === 'ArrowRight' ? step : key === 'ArrowLeft' ? -step : 0
    const heightDelta = key === 'ArrowDown' ? step : key === 'ArrowUp' ? -step : 0
    return {
      x: field.x,
      y: field.y,
      width: Math.max(4, Math.min(50, 100 - field.x, field.width + widthDelta)),
      height: Math.max(3, Math.min(30, 100 - field.y, field.height + heightDelta)),
    }
  }

  const xDelta = key === 'ArrowRight' ? step : key === 'ArrowLeft' ? -step : 0
  const yDelta = key === 'ArrowDown' ? step : key === 'ArrowUp' ? -step : 0
  return {
    x: Math.max(0, Math.min(100 - field.width, field.x + xDelta)),
    y: Math.max(0, Math.min(100 - field.height, field.y + yDelta)),
    width: field.width,
    height: field.height,
  }
}
