export type DocumentLoadFailure = 'not-found' | 'load-failed'

interface ErrorLike {
  code?: string
  details?: string
  message?: string
}

export function classifyDocumentLoadFailure(error: unknown): DocumentLoadFailure {
  if (!error || typeof error !== 'object') return 'load-failed'

  const { code, details, message } = error as ErrorLike
  const description = `${message || ''} ${details || ''}`.toLowerCase()
  if (
    code === 'PGRST116'
    || description.includes('0 rows')
    || description.includes('no rows')
  ) {
    return 'not-found'
  }

  return 'load-failed'
}
