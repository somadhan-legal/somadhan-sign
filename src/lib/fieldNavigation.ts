export function getNextUnsignedField<T extends { id: string }>(
  fields: T[],
  signedFieldIds: Set<string>,
  completedFieldId?: string,
): T | null {
  const remaining = fields.filter((field) => !signedFieldIds.has(field.id))
  if (remaining.length === 0) return null
  const completedIndex = completedFieldId
    ? fields.findIndex((field) => field.id === completedFieldId)
    : -1
  return remaining.find((field) => fields.indexOf(field) > completedIndex) || remaining[0]
}
