export const isMissingEdgeFunction = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false

  const context = (error as { context?: unknown }).context
  return Boolean(
    context
    && typeof context === 'object'
    && 'status' in context
    && (context as { status?: unknown }).status === 404
  )
}
