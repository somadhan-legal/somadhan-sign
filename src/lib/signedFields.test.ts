import { describe, expect, it } from 'vitest'
import { mapPlacementsToSignedFields } from './signedFields'

describe('mapPlacementsToSignedFields', () => {
  const field = {
    id: 'field-a',
    document_id: 'document-a',
    field_type: 'signature',
    page_number: 2,
    x: 10,
    y: 20,
    width: 30,
    height: 8,
  }

  it('maps the latest placement value to its PDF coordinates', () => {
    expect(mapPlacementsToSignedFields('document-a', [field], [{
      document_id: 'document-a',
      field_id: 'field-a',
      signature_id: 'data:image/png;base64,current',
    }])).toEqual([{
      field_type: 'signature',
      page_number: 2,
      x_percent: 10,
      y_percent: 20,
      width_percent: 30,
      height_percent: 8,
      signature_id: 'data:image/png;base64,current',
    }])
  })

  it('does not mix fields or placements from another document', () => {
    expect(mapPlacementsToSignedFields('document-a', [
      field,
      { ...field, id: 'field-b', document_id: 'document-b' },
    ], [
      { document_id: 'document-b', field_id: 'field-b', signature_id: 'other' },
    ])).toEqual([])
  })

  it('ignores orphaned placements instead of inventing coordinates', () => {
    expect(mapPlacementsToSignedFields('document-a', [field], [{
      document_id: 'document-a',
      field_id: 'missing-field',
      signature_id: 'orphaned',
    }])).toEqual([])
  })
})
