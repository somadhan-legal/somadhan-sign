import type { Document, DocumentSigner } from '@/types/database'

export interface SigningDispatchContext {
  document: Document
  signers: DocumentSigner[]
}

export function getSigningDispatchContext(
  documentId: string,
  currentDocument: Document | null,
  signers: DocumentSigner[],
): SigningDispatchContext {
  if (!currentDocument || currentDocument.id !== documentId) {
    throw new Error('The document could not be loaded.')
  }

  const documentSigners = signers.filter((signer) => signer.document_id === documentId)
  if (documentSigners.length === 0) {
    throw new Error('Add at least one signer before sending the document.')
  }

  return {
    document: { ...currentDocument },
    signers: documentSigners.map((signer) => ({ ...signer })),
  }
}
