import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type {
  Document,
  DocumentInsert,
  SignatureField,
  SignatureFieldInsert,
  DocumentSigner,
  SignaturePlacement,
  AuditTrailEntry,
  SignerByTokenResult,
  SigningPackageResult,
} from '@/types/database'
import { validatePdfFile } from '@/lib/fileValidation'
import { createOwnerDocumentUrl, getDocumentStoragePath } from '@/lib/documentStorage'

interface SignatureFieldLocal extends Omit<SignatureField, 'id' | 'created_at'> {
  id: string
  created_at?: string
  isNew?: boolean
}

export interface SendForSigningResult {
  sent: number
  failed: number
  ccSent: number
  ccFailed: number
}

interface DocumentState {
  documents: Document[]
  currentDocument: Document | null
  signatureFields: SignatureFieldLocal[]
  signers: DocumentSigner[]
  placements: SignaturePlacement[]
  auditTrail: AuditTrailEntry[]
  loading: boolean
  currentPage: number
  totalPages: number

  setCurrentPage: (page: number) => void
  setTotalPages: (total: number) => void
  setLoading: (loading: boolean) => void

  fetchDocuments: () => Promise<void>
  fetchDocument: (id: string) => Promise<void>
  createDocument: (doc: DocumentInsert, file: File) => Promise<Document | null>
  deleteDocument: (id: string) => Promise<boolean>
  updateDocumentStatus: (id: string, status: Document['status']) => Promise<void>

  addSignatureField: (field: SignatureFieldLocal) => void
  updateSignatureField: (id: string, updates: Partial<SignatureFieldLocal>) => void
  removeSignatureField: (id: string) => void
  saveSignatureFields: (documentId: string) => Promise<void>
  fetchSignatureFields: (documentId: string) => Promise<void>

  addSigner: (documentId: string, email: string, name?: string) => Promise<void>
  updateSigner: (signerId: string, updates: Partial<{ signer_email: string; signer_name: string }>) => Promise<void>
  fetchSigners: (documentId: string) => Promise<void>
  removeSigner: (signerId: string) => Promise<void>

  fetchPlacements: (documentId: string, signingToken?: string) => Promise<void>
  addPlacement: (placement: Omit<SignaturePlacement, 'id' | 'signed_at'>, signingToken?: string) => Promise<boolean>

  fetchSignerByToken: (token: string) => Promise<SignerByTokenResult | null>
  updateSignerStatus: (signerId: string, status: 'pending' | 'viewed' | 'signed', signingToken?: string) => Promise<boolean>

  fetchAuditTrail: (documentId: string) => Promise<void>
  addAuditEntry: (documentId: string, action: string, userEmail: string, userName?: string | null, metadata?: string, signingToken?: string) => Promise<boolean>

  sendForSigning: (documentId: string, senderName?: string, message?: string, ccEmails?: string[]) => Promise<SendForSigningResult>
  sendReminder: (documentId: string, senderName?: string) => Promise<{ sent: number; failed: number }>
}

let cachedIpAddress: string | null = null
let ipFetchAttempted = false

const isMissingRpc = (error: { code?: string; message?: string } | null) =>
  error?.code === 'PGRST202' || error?.message?.includes('Could not find the function') === true

const isMissingEdgeFunction = (error: unknown) => {
  const status = (error as { context?: { status?: number } } | null)?.context?.status
  return status === 404 || (error instanceof Error && /not found/i.test(error.message))
}

const fetchSigningAccessPackage = async (token: string): Promise<SigningPackageResult | null | undefined> => {
  const { data, error } = await supabase.functions.invoke('get-document-access', {
    body: { signingToken: token },
  })
  if (!error) return data?.signerPackage || null
  if (isMissingEdgeFunction(error)) return undefined
  console.error('Error fetching secure document access:', error)
  return null
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  currentDocument: null,
  signatureFields: [],
  signers: [],
  placements: [],
  auditTrail: [],
  loading: false,
  currentPage: 1,
  totalPages: 0,

  setCurrentPage: (page) => set({ currentPage: page }),
  setTotalPages: (total) => set({ totalPages: total }),
  setLoading: (loading) => set({ loading }),

  fetchDocuments: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('Error fetching documents:', error)
      set({ loading: false })
      return
    }
    set({ documents: (data as Document[]) || [], loading: false })
  },

  fetchDocument: async (id: string) => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()
    if (error) {
      console.error('Error fetching document:', error)
      set({ loading: false })
      return
    }
    try {
      const document = data as Document
      const [originalPdfUrl, finalPdfUrl] = await Promise.all([
        createOwnerDocumentUrl(document.original_pdf_url),
        document.final_pdf_url ? createOwnerDocumentUrl(document.final_pdf_url) : Promise.resolve(null),
      ])
      set({
        currentDocument: {
          ...document,
          original_pdf_url: originalPdfUrl,
          final_pdf_url: finalPdfUrl,
        },
        loading: false,
      })
    } catch (documentUrlError) {
      console.error('Error creating document access URL:', documentUrlError)
      set({ currentDocument: null, loading: false })
      return
    }

    await Promise.all([
      get().fetchSignatureFields(id),
      get().fetchSigners(id),
      get().fetchPlacements(id),
    ])
  },

  createDocument: async (doc: DocumentInsert, file: File) => {
    set({ loading: true })
    let uploadedPath: string | null = null
    try {
      const validationError = await validatePdfFile(file)
      if (validationError) throw new Error(validationError)

      // Get current user ID for folder organization (required by RLS policy)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Sanitize filename: remove special characters that cause storage issues
      const sanitizedName = file.name.replace(/[|<>:"/\\?*]/g, '_')
      // Organize files by user ID folder to match RLS deletion policy
      const fileName = `${user.id}/${Date.now()}_${sanitizedName}`
      uploadedPath = fileName
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { contentType: 'application/pdf', upsert: true })
      if (uploadError) throw uploadError

      const { data, error } = await supabase
        .from('documents')
        .insert({ ...doc, original_pdf_url: fileName })
        .select()
        .single()
      if (error) throw error

      const newDoc = data as Document
      set((state) => ({
        documents: [newDoc, ...state.documents],
        loading: false,
      }))
      return newDoc
    } catch (error) {
      console.error('Error creating document:', error)
      if (uploadedPath) {
        await supabase.storage.from('documents').remove([uploadedPath])
      }
      set({ loading: false })
      return null
    }
  },

  deleteDocument: async (id: string) => {
    const doc = get().documents.find((d) => d.id === id)
    
    // Delete the database record first. Related records are removed atomically by FK cascades.
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) {
      console.error('[deleteDocument] Error deleting document:', error)
      return false
    }

    const storagePaths = [doc?.original_pdf_url, doc?.final_pdf_url]
      .filter((url): url is string => Boolean(url))
      .map(getDocumentStoragePath)
      .filter((path): path is string => Boolean(path))
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage.from('documents').remove(storagePaths)
      if (storageError) console.error('[deleteDocument] Storage cleanup error:', storageError)
    }
    
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
    }))
    return true
  },

  updateDocumentStatus: async (id: string, status: Document['status']) => {
    const { error } = await supabase
      .from('documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      console.error('Error updating document status:', error)
      throw error
    }
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, status } : d
      ),
      currentDocument:
        state.currentDocument?.id === id
          ? { ...state.currentDocument, status }
          : state.currentDocument,
    }))
  },

  addSignatureField: (field) => {
    set((state) => ({
      signatureFields: [...state.signatureFields, field],
    }))
  },

  updateSignatureField: (id, updates) => {
    set((state) => ({
      signatureFields: state.signatureFields.map((f) =>
        f.id === id ? { ...f, ...updates } : f
      ),
    }))
  },

  removeSignatureField: (id) => {
    set((state) => ({
      signatureFields: state.signatureFields.filter((f) => f.id !== id),
    }))
  },

  saveSignatureFields: async (documentId: string) => {
    const fields = get().signatureFields.filter(
      (f) => f.document_id === documentId
    )

    const inserts: SignatureFieldInsert[] = fields.map((f, index) => ({
      document_id: f.document_id,
      page_number: f.page_number,
      x: f.x,
      y: f.y,
      width: f.width,
      height: f.height,
      assigned_to_email: f.assigned_to_email,
      field_type: f.field_type,
      field_order: index + 1,
      label: f.label,
    }))

    const { data: replacedFields, error: replaceError } = await supabase.rpc('replace_signature_fields', {
      p_document_id: documentId,
      p_fields: inserts,
    })
    if (!replaceError) {
      set({ signatureFields: (replacedFields as SignatureFieldLocal[]) || [] })
      return
    }
    if (!isMissingRpc(replaceError)) throw replaceError

    const { data: previousFields, error: backupError } = await supabase
      .from('signature_fields')
      .select('*')
      .eq('document_id', documentId)
    if (backupError) throw backupError

    const { error: deleteError } = await supabase
      .from('signature_fields')
      .delete()
      .eq('document_id', documentId)
    if (deleteError) throw deleteError

    if (fields.length === 0) return

    const { error } = await supabase.from('signature_fields').insert(inserts)
    if (error) {
      console.error('Error saving fields:', error)
      if (previousFields && previousFields.length > 0) {
        await supabase.from('signature_fields').insert(previousFields)
      }
      throw error
    }
  },

  fetchSignatureFields: async (documentId: string) => {
    const { data, error } = await supabase
      .from('signature_fields')
      .select('*')
      .eq('document_id', documentId)
      .order('field_order')
    if (error) {
      console.error('Error fetching fields:', error)
      return
    }
    set({ signatureFields: (data as SignatureFieldLocal[]) || [] })
  },

  addSigner: async (documentId: string, email: string, name?: string) => {
    const normalizedEmail = email.trim().toLowerCase()
    const duplicate = get().signers.some(
      (signer) => signer.document_id === documentId && signer.signer_email.trim().toLowerCase() === normalizedEmail
    )
    if (duplicate) throw new Error('DUPLICATE_SIGNER_EMAIL')

    const { data, error } = await supabase
      .from('document_signers')
      .insert({
        document_id: documentId,
        signer_email: normalizedEmail,
        signer_name: name || null,
      })
      .select()
      .single()
    if (error) {
      console.error('Error adding signer:', error)
      throw error
    }
    set((state) => ({
      signers: [...state.signers, data as DocumentSigner],
    }))
  },

  updateSigner: async (signerId: string, updates: Partial<{ signer_email: string; signer_name: string }>) => {
    // First, get the current signer to know their old email
    const currentSigner = get().signers.find(s => s.id === signerId)
    if (!currentSigner) {
      console.error('Signer not found')
      return
    }

    const oldEmail = currentSigner.signer_email
    const newEmail = updates.signer_email?.trim().toLowerCase()
    if (newEmail && get().signers.some(
      (signer) => signer.id !== signerId && signer.document_id === currentSigner.document_id && signer.signer_email.trim().toLowerCase() === newEmail
    )) throw new Error('DUPLICATE_SIGNER_EMAIL')

    const normalizedUpdates = newEmail ? { ...updates, signer_email: newEmail } : updates

    if (newEmail) {
      const { data: updatedSigner, error: transactionError } = await supabase.rpc('update_document_signer_with_fields', {
        p_signer_id: signerId,
        p_signer_email: newEmail,
        p_signer_name: updates.signer_name || null,
      })
      if (!transactionError) {
        set((state) => ({
          signers: state.signers.map((signer) => signer.id === signerId ? updatedSigner as DocumentSigner : signer),
          signatureFields: state.signatureFields.map((field) =>
            field.document_id === currentSigner.document_id && field.assigned_to_email === oldEmail
              ? { ...field, assigned_to_email: newEmail }
              : field
          ),
        }))
        return
      }
      if (!isMissingRpc(transactionError)) throw transactionError
    }

    // Update the signer
    const { data, error } = await supabase
      .from('document_signers')
      .update(normalizedUpdates)
      .eq('id', signerId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating signer:', error)
      throw error
    }

    // If email changed, update all signature fields assigned to the old email
    if (newEmail && newEmail !== oldEmail) {
      const { error: fieldsError } = await supabase
        .from('signature_fields')
        .update({ assigned_to_email: newEmail })
        .eq('document_id', currentSigner.document_id)
        .eq('assigned_to_email', oldEmail)

      if (fieldsError) {
        console.error('Error updating signature fields:', fieldsError)
        await supabase
          .from('document_signers')
          .update({ signer_email: oldEmail, signer_name: currentSigner.signer_name })
          .eq('id', signerId)
        throw fieldsError
      }
    }
    
    set((state) => ({
      signers: state.signers.map(s => s.id === signerId ? (data as DocumentSigner) : s),
    }))
  },

  fetchSigners: async (documentId: string) => {
    const { data, error } = await supabase
      .from('document_signers')
      .select('*')
      .eq('document_id', documentId)
    if (error) {
      console.error('Error fetching signers:', error)
      return
    }
    set({ signers: (data as DocumentSigner[]) || [] })
  },

  removeSigner: async (signerId: string) => {
    const signer = get().signers.find((candidate) => candidate.id === signerId)
    if (!signer) return

    const { error: transactionError } = await supabase.rpc('remove_document_signer_with_fields', {
      p_signer_id: signerId,
    })
    if (!transactionError) {
      set((state) => ({
        signers: state.signers.filter((candidate) => candidate.id !== signerId),
        signatureFields: state.signatureFields.filter((field) =>
          !(field.document_id === signer.document_id && field.assigned_to_email === signer.signer_email)
        ),
      }))
      return
    }
    if (!isMissingRpc(transactionError)) throw transactionError

    const { error: signerError } = await supabase
      .from('document_signers')
      .delete()
      .eq('id', signerId)
    if (signerError) throw signerError

    const { error: fieldsError } = await supabase
      .from('signature_fields')
      .delete()
      .eq('document_id', signer.document_id)
      .eq('assigned_to_email', signer.signer_email)
    if (fieldsError) {
      await supabase.from('document_signers').insert(signer)
      throw fieldsError
    }

    set((state) => ({
      signers: state.signers.filter((candidate) => candidate.id !== signerId),
      signatureFields: state.signatureFields.filter((field) =>
        !(field.document_id === signer.document_id && field.assigned_to_email === signer.signer_email)
      ),
    }))
  },

  fetchPlacements: async (documentId: string, signingToken?: string) => {
    if (signingToken) {
      const securePackage = await fetchSigningAccessPackage(signingToken)
      if (securePackage) {
        set({
          signatureFields: securePackage.fields || [],
          placements: securePackage.placements || [],
          auditTrail: securePackage.audit_trail || [],
        })
        return
      }
      if (securePackage === null) return

      const { data: signingPackage, error: packageError } = await supabase
        .rpc('get_signing_package', { p_token: signingToken })
      if (!packageError) {
        set({
          signatureFields: signingPackage?.fields || [],
          placements: signingPackage?.placements || [],
          auditTrail: signingPackage?.audit_trail || [],
        })
        return
      }
      if (!isMissingRpc(packageError)) {
        console.error('Error refreshing signing package:', packageError)
        return
      }
    }
    const { data, error } = await supabase
      .from('signature_placements')
      .select('*')
      .eq('document_id', documentId)
    if (error) {
      console.error('Error fetching placements:', error)
      return
    }
    set({ placements: (data as SignaturePlacement[]) || [] })
  },

  addPlacement: async (placement, signingToken) => {
    if (signingToken) {
      const { data, error } = await supabase.rpc('add_signature_placement_by_token', {
        p_token: signingToken,
        p_field_id: placement.field_id,
        p_signature_id: placement.signature_id,
      })
      if (!error) {
        set((state) => ({ placements: [...state.placements, data as SignaturePlacement] }))
        return true
      }
      if (!isMissingRpc(error)) {
        console.error('Error adding placement:', error)
        return false
      }
    }
    const { data, error } = await supabase
      .from('signature_placements')
      .insert(placement)
      .select()
      .single()
    if (error) {
      console.error('Error adding placement:', error)
      return false
    }
    set((state) => ({
      placements: [...state.placements, data as SignaturePlacement],
    }))
    return true
  },

  fetchSignerByToken: async (token: string) => {
    const securePackage = await fetchSigningAccessPackage(token)
    if (securePackage) {
      set({
        signatureFields: securePackage.fields || [],
        placements: securePackage.placements || [],
        auditTrail: securePackage.audit_trail || [],
      })
      return securePackage.signer
    }
    if (securePackage === null) return null

    const { data: signingPackage, error: packageError } = await supabase
      .rpc('get_signing_package', { p_token: token })
    if (!packageError) {
      if (!signingPackage?.signer) return null
      set({
        signatureFields: signingPackage.fields || [],
        placements: signingPackage.placements || [],
        auditTrail: signingPackage.audit_trail || [],
      })
      return signingPackage.signer
    }
    if (!isMissingRpc(packageError)) {
      console.error('Error fetching signing package:', packageError)
      return null
    }

    const { data, error } = await supabase
      .rpc('get_signer_by_token', { p_token: token })
    if (error) {
      console.error('Error fetching signer by token:', error)
      return null
    }
    if (!data) return null
    await Promise.all([
      get().fetchSignatureFields(data.document_id),
      get().fetchPlacements(data.document_id),
      get().fetchAuditTrail(data.document_id),
    ])
    return data
  },

  updateSignerStatus: async (signerId: string, status: 'pending' | 'viewed' | 'signed', signingToken?: string) => {
    if (signingToken) {
      const { error } = await supabase.rpc('update_signer_status_by_token', {
        p_token: signingToken,
        p_status: status,
      })
      if (!error) return true
      if (!isMissingRpc(error)) {
        console.error('Error updating signer status:', error)
        return false
      }
    }
    const { error } = await supabase
      .rpc('update_signer_status_by_id', { p_signer_id: signerId, p_status: status })
    if (error) {
      console.error('Error updating signer status:', error)
      return false
    }
    return true
  },

  fetchAuditTrail: async (documentId: string) => {
    // Clear existing audit trail first to avoid stale data
    set({ auditTrail: [] })
    
    const { data, error } = await supabase
      .from('audit_trail')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at', { ascending: true })
    if (error) {
      console.error('Error fetching audit trail:', error)
      return
    }
    
    set({ auditTrail: (data as AuditTrailEntry[]) || [] })
  },

  addAuditEntry: async (documentId: string, action: string, userEmail: string, userName?: string | null, metadata?: string, signingToken?: string) => {
    if (signingToken) {
      const { data, error } = await supabase.rpc('add_audit_entry_by_token', {
        p_token: signingToken,
        p_action: action,
        p_metadata: metadata || null,
      })
      if (!error) {
        set((state) => ({ auditTrail: [...state.auditTrail, data as AuditTrailEntry] }))
        return true
      }
      if (!isMissingRpc(error)) {
        console.error('Error adding audit entry:', error)
        return false
      }
    }
    let ipAddress: string | null = cachedIpAddress
    if (ipAddress === null && !ipFetchAttempted) {
      try {
        const res = await fetch('https://api.ipify.org?format=json')
        const json = await res.json()
        ipAddress = json.ip || null
        cachedIpAddress = ipAddress
      } catch {
        // silently fail
      }
      ipFetchAttempted = true
    }

    const { data, error } = await supabase
      .from('audit_trail')
      .insert({
        document_id: documentId,
        action,
        user_email: userEmail,
        user_name: userName || null,
        ip_address: ipAddress,
        metadata: metadata || null,
      })
      .select()
      .single()
    if (error) {
      console.error('Error adding audit entry:', error)
      return false
    }
    set((state) => ({
      auditTrail: [...state.auditTrail, data as AuditTrailEntry],
    }))
    return true
  },

  sendForSigning: async (documentId: string, senderName?: string, message?: string, ccEmails?: string[]) => {
    await get().saveSignatureFields(documentId)
    await get().updateDocumentStatus(documentId, 'pending')
    
    // Send emails to all signers (NOT to CC recipients)
    const signers = get().signers
    const doc = get().currentDocument
    
    if (!doc) throw new Error('The document could not be loaded.')

    let sent = 0
    let failed = 0
    let ccSent = 0
    let ccFailed = 0
    
    for (const signer of signers) {
      try {
        const signingLink = `${window.location.origin}/sign/${signer.signing_token}`
        

        const { error } = await supabase.functions.invoke('send-signing-email', {
          body: {
            to: signer.signer_email,
            documentTitle: doc.title,
            signingLink,
            signingToken: signer.signing_token,
            documentId,
            senderName: senderName || 'A user',
            message: message || '',
          },
        })

        if (error) {
          failed++
          console.error(`Failed to send email to ${signer.signer_email}:`, error)
        } else {
          sent++
        }
      } catch (error) {
        failed++
        console.error(`Error sending email to ${signer.signer_email}:`, error)
      }
    }
    
    // Send view-only notification emails to CC recipients
    if (ccEmails && ccEmails.length > 0) {
      const signeeEmails = signers.map(s => s.signer_email)
      for (const ccEmail of ccEmails) {
        try {
          const { data: viewerToken, error: viewerError } = await supabase.rpc('create_document_viewer', {
            p_document_id: documentId,
            p_viewer_email: ccEmail,
          })
          if (viewerError && !isMissingRpc(viewerError)) throw viewerError
          const viewLink = `${window.location.origin}/view/${viewerToken || documentId}`
          const { error: ccErr } = await supabase.functions.invoke('send-signing-email', {
            body: {
              to: ccEmail,
              documentTitle: doc.title,
              signingLink: '',
              senderName: senderName || 'A user',
              message: message || '',
              type: 'cc-notification',
              viewLink,
              viewerToken: viewerToken || null,
              documentId,
              signeeEmails,
            },
          })
          if (ccErr) {
            ccFailed++
            console.error(`Failed to send CC notification to ${ccEmail}:`, ccErr)
          } else {
            ccSent++
          }
        } catch (err) {
          ccFailed++
          console.error(`Error sending CC notification to ${ccEmail}:`, err)
        }
      }
    }

    if (sent === 0) {
      await get().updateDocumentStatus(documentId, 'draft')
      throw new Error('No invitation emails could be sent. Check the email service and try again.')
    }

    return { sent, failed, ccSent, ccFailed }
  },

  sendReminder: async (documentId: string, senderName?: string) => {
    // Fetch signers who haven't completed signing
    const { data: signersList, error: signersError } = await supabase
      .from('document_signers')
      .select('*')
      .eq('document_id', documentId)
      .neq('status', 'signed')

    if (signersError) {
      console.error('Error loading pending signers:', signersError)
      return { sent: 0, failed: 1 }
    }
    if (!signersList || signersList.length === 0) return { sent: 0, failed: 0 }

    // Get document title
    const { data: doc, error: documentError } = await supabase
      .from('documents')
      .select('title')
      .eq('id', documentId)
      .single()

    if (documentError || !doc) {
      console.error('Error loading document for reminder:', documentError)
      return { sent: 0, failed: signersList.length }
    }

    let sent = 0
    let failed = 0

    for (const signer of signersList) {
      try {
        const signingLink = `${window.location.origin}/sign/${signer.signing_token}`

        const { error } = await supabase.functions.invoke('send-signing-email', {
          body: {
            to: signer.signer_email,
            documentTitle: doc.title,
            signingLink,
            signingToken: signer.signing_token,
            documentId,
            senderName: senderName || 'A user',
            message: 'This is a friendly reminder to sign the document. Please review and sign at your earliest convenience.',
            ccEmails: [],
          },
        })

        if (error) {
          failed++
        } else {
          sent++
        }
      } catch {
        failed++
      }
    }

    return { sent, failed }
  },
}))
