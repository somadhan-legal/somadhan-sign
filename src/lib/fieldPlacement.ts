export type FieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox'

const FIELD_SIZE_PERCENTAGES: Record<FieldType, { width: number; height: number }> = {
  signature: { width: 22, height: 7 },
  initials: { width: 12, height: 5 },
  date: { width: 16, height: 5 },
  text: { width: 20, height: 5 },
  checkbox: { width: 4, height: 4 },
}

export type FieldBounds = { x: number; y: number; width: number; height: number }
export type PositionedField = FieldBounds & { id: string; page_number: number }

export function getFieldPlacement(
  type: FieldType,
  pointerX: number,
  pointerY: number,
  pageWidth: number,
  pageHeight: number
) {
  const defaultSize = FIELD_SIZE_PERCENTAGES[type]
  // Percentage units have different physical dimensions on a portrait PDF.
  // Derive the checkbox width from the rendered page so it stays square.
  const checkboxPixels = Math.max(24, Math.min(36, Math.min(pageWidth, pageHeight) * 0.05))
  const size = type === 'checkbox'
    ? {
        width: (checkboxPixels / pageWidth) * 100,
        height: (checkboxPixels / pageHeight) * 100,
      }
    : defaultSize
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

export function fieldsOverlap(first: FieldBounds, second: FieldBounds): boolean {
  return (
    first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y
  )
}

export function getOverlappingField(
  fields: PositionedField[],
  candidate: FieldBounds & { page_number: number },
  excludeFieldId?: string,
): PositionedField | undefined {
  return fields.find((field) =>
    field.id !== excludeFieldId
    && field.page_number === candidate.page_number
    && fieldsOverlap(field, candidate)
  )
}

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
