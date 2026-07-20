export interface DraftFieldShape {
  document_id: string
  page_number: number
  x: number
  y: number
  width: number
  height: number
  assigned_to_email: string
  field_type: string
  label: string | null
}

export const getFieldDraftFingerprint = (
  fields: DraftFieldShape[],
  documentId: string
) => JSON.stringify(
  fields
    .filter((field) => field.document_id === documentId)
    .map((field) => ({
      page_number: field.page_number,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      assigned_to_email: field.assigned_to_email.trim().toLowerCase(),
      field_type: field.field_type,
      label: field.label,
    }))
)
