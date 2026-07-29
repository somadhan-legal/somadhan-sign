import type { Document } from '@/types/database'

export function getDashboardDocumentRoute(
  document: Pick<Document, 'id' | 'status'>,
): string {
  return document.status === 'draft'
    ? `/document/${document.id}/edit`
    : `/document/${document.id}`
}
