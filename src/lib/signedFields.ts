import type { SignedField } from './signedPdf'

interface FieldSource {
  id: string
  document_id: string
  field_type: string
  page_number: number
  x: number
  y: number
  width: number
  height: number
}

interface PlacementSource {
  document_id: string
  field_id: string
  signature_id: string
}

export function mapPlacementsToSignedFields(
  documentId: string,
  fields: FieldSource[],
  placements: PlacementSource[],
): SignedField[] {
  const fieldsMap = new Map(
    fields
      .filter((field) => field.document_id === documentId)
      .map((field) => [field.id, field]),
  )

  return placements
    .filter((placement) => placement.document_id === documentId)
    .flatMap((placement) => {
      const field = fieldsMap.get(placement.field_id)
      if (!field) return []
      return [{
        field_type: field.field_type,
        page_number: field.page_number,
        x_percent: field.x,
        y_percent: field.y,
        width_percent: field.width,
        height_percent: field.height,
        signature_id: placement.signature_id,
      }]
    })
}
