import { describe, expect, it } from 'vitest'
import { getDashboardDocumentRoute } from './dashboardDocumentRoute'

describe('dashboard document-card route', () => {
  it('opens drafts in the editor', () => {
    expect(getDashboardDocumentRoute({ id: 'draft-id', status: 'draft' }))
      .toBe('/document/draft-id/edit')
  })

  it.each(['pending', 'completed', 'cancelled'] as const)(
    'opens %s documents in the document view',
    (status) => {
      expect(getDashboardDocumentRoute({ id: 'document-id', status }))
        .toBe('/document/document-id')
    },
  )
})
