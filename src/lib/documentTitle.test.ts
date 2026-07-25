import { describe, expect, it } from 'vitest'
import {
  getSuggestedDocumentTitle,
  MAX_DOCUMENT_TITLE_LENGTH,
  normalizeDocumentTitle,
} from './documentTitle'

describe('document titles', () => {
  it('removes the PDF extension and surrounding whitespace', () => {
    expect(getSuggestedDocumentTitle('  Agreement.PDF  ')).toBe('Agreement')
    expect(normalizeDocumentTitle('  Agreement  ')).toBe('Agreement')
  })

  it('limits filename-derived titles before they reach email workflows', () => {
    const title = getSuggestedDocumentTitle(`${'a'.repeat(220)}.pdf`)
    expect(title).toHaveLength(MAX_DOCUMENT_TITLE_LENGTH)
  })
})
