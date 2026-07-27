import { describe, expect, it } from 'vitest'
import type { Document, DocumentSigner } from '@/types/database'
import { getSigningDispatchContext } from './signingDispatch'

const document = {
  id: 'document-a',
  title: 'Agreement',
} as Document

const signer = {
  id: 'signer-a',
  document_id: 'document-a',
  signer_email: 'signer@example.com',
} as DocumentSigner

describe('getSigningDispatchContext', () => {
  it('captures only signers belonging to the requested document', () => {
    const otherSigner = {
      ...signer,
      id: 'signer-b',
      document_id: 'document-b',
      signer_email: 'other@example.com',
    }

    const context = getSigningDispatchContext(document.id, document, [signer, otherSigner])

    expect(context.document).toEqual(document)
    expect(context.document).not.toBe(document)
    expect(context.signers).toEqual([signer])
    expect(context.signers[0]).not.toBe(signer)
  })

  it('rejects a stale active document before any sending work starts', () => {
    expect(() => getSigningDispatchContext('document-b', document, [signer]))
      .toThrow('The document could not be loaded.')
  })

  it('rejects a document without a matching signer', () => {
    expect(() => getSigningDispatchContext(document.id, document, []))
      .toThrow('Add at least one signer')
  })
})
