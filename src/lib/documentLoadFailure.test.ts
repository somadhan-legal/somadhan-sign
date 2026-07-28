import { describe, expect, it } from 'vitest'
import { classifyDocumentLoadFailure } from './documentLoadFailure'

describe('classifyDocumentLoadFailure', () => {
  it('classifies a missing PostgREST row as not found', () => {
    expect(classifyDocumentLoadFailure({
      code: 'PGRST116',
      message: 'JSON object requested, multiple (or no) rows returned',
      details: 'The result contains 0 rows',
    })).toBe('not-found')
  })

  it('classifies no-row messages without a code as not found', () => {
    expect(classifyDocumentLoadFailure(new Error('The result contains no rows'))).toBe('not-found')
  })

  it('classifies network and unknown failures as retryable load failures', () => {
    expect(classifyDocumentLoadFailure(new Error('Failed to fetch'))).toBe('load-failed')
    expect(classifyDocumentLoadFailure(null)).toBe('load-failed')
  })
})
