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
} from '@/types/database'

interface SignatureFieldLocal extends Omit<SignatureField, 'id' | 'created_at'> {
  id: string
  created_at?: string
  isNew?: boolean
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
  deleteDocument: (id: string) => Promise<void>
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

  fetchPlacements: (documentId: string) => Promise<void>
  addPlacement: (placement: Omit<SignaturePlacement, 'id' | 'signed_at'>) => Promise<void>

  fetchSignerByToken: (token: string) => Promise<(DocumentSigner & { documents: { title: string; original_pdf_url: string; status: string } }) | null>
  updateSignerStatus: (signerId: string, status: 'pending' | 'viewed' | 'signed') => Promise<void>

  fetchAuditTrail: (documentId: string) => Promise<void>
  addAuditEntry: (documentId: string, action: string, userEmail: string, userName?: string | null, metadata?: string) => Promise<void>

  sendForSigning: (documentId: string, senderName?: string, message?: string, ccEmails?: string[]) => Promise<void>
  sendReminder: (documentId: string, senderName?: string) => Promise<{ sent: number; failed: number }>
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
    set({ currentDocument: data as Document, loading: false })

    await Promise.all([
      get().fetchSignatureFields(id),
      get().fetchSigners(id),
      get().fetchPlacements(id),
    ])
  },

  createDocument: async (doc: DocumentInsert, file: File) => {
    set({ loading: true })
    try {
      // Get current user ID for folder organization (required by RLS policy)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Sanitize filename: remove special characters that cause storage issues
      const sanitizedName = file.name.replace(/[|<>:"/\\?*]/g, '_')
      // Organize files by user ID folder to match RLS deletion policy
      const fileName = `${user.id}/${Date.now()}_${sanitizedName}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file, { contentType: 'application/pdf', upsert: true })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      const { data, error } = await supabase
        .from('documents')
        .insert({ ...doc, original_pdf_url: urlData.publicUrl })
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
      set({ loading: false })
      return null
    }
  },

  deleteDocument: async (id: string) => {
    const doc = get().documents.find((d) => d.id === id)
    
    // Helper: extract storage file path from any Supabase storage URL format
    const extractStoragePath = (rawUrl: string): string | null => {
      try {
        const url = new URL(rawUrl)
        // Handles: /storage/v1/object/public/documents/... AND /storage/v1/object/sign/documents/...
        const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign)\/documents\/(.+)/)
        if (match?.[1]) return decodeURIComponent(match[1])
        return null
      } catch { return null }
    }

    // Delete original PDF from storage
    if (doc?.original_pdf_url) {
      const filePath = extractStoragePath(doc.original_pdf_url)
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([filePath])
        if (storageError) console.error('[deleteDocument] Storage delete error:', storageError)
      } else {
        console.warn('[deleteDocument] Could not parse file path from URL:', doc.original_pdf_url)
      }
    }

    // Delete final signed PDF from storage if it exists
    if (doc && (doc as Record<string, unknown>).final_pdf_url) {
      const finalPath = extractStoragePath((doc as Record<string, unknown>).final_pdf_url as string)
      if (finalPath) {
        await supabase.storage.from('documents').remove([finalPath])
      }
    }
    
    // Delete related records explicitly (cascade should handle, but be thorough)
    await supabase.from('signature_placements').delete().eq('document_id', id)
    await supabase.from('signature_fields').delete().eq('document_id', id)
    await supabase.from('audit_trail').delete().eq('document_id', id)
    await supabase.from('document_signers').delete().eq('document_id', id)
    
    // Delete document record (this also cascades all FK references)
    const { error } = await supabase.from('documents').delete().eq('id', id)
    if (error) {
      console.error('[deleteDocument] Error deleting document:', error)
      return
    }
    
    // Check if user folder is empty and delete it
    if (doc?.original_pdf_url) {
      const filePath = extractStoragePath(doc.original_pdf_url)
      if (filePath) {
        // Extract user folder from path (e.g., "userId/timestamp_file.pdf" -> "userId")
        const userFolder = filePath.split('/')[0]
        if (userFolder) {
          // List all files in user's folder
          const { data: files } = await supabase.storage
            .from('documents')
            .list(userFolder)
          
          // If folder is empty, remove it
          if (files && files.length === 0) {
            await supabase.storage.from('documents').remove([userFolder])
          }
        }
      }
    }
    
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      currentDocument: state.currentDocument?.id === id ? null : state.currentDocument,
    }))
  },

  updateDocumentStatus: async (id: string, status: Document['status']) => {
    const { error } = await supabase
      .from('documents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) {
      console.error('Error updating document status:', error)
      return
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

    await supabase
      .from('signature_fields')
      .delete()
      .eq('document_id', documentId)

    if (fields.length === 0) return

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

    const { error } = await supabase.from('signature_fields').insert(inserts)
    if (error) console.error('Error saving fields:', error)
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
    const { data, error } = await supabase
      .from('document_signers')
      .insert({
        document_id: documentId,
        signer_email: email,
        signer_name: name || null,
      })
      .select()
      .single()
    if (error) {
      console.error('Error adding signer:', error)
      return
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
    const newEmail = updates.signer_email

    // Update the signer
    const { data, error } = await supabase
      .from('document_signers')
      .update(updates)
      .eq('id', signerId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating signer:', error)
      return
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
    const { error } = await supabase
      .from('document_signers')
      .delete()
      .eq('id', signerId)
    if (error) {
      console.error('Error removing signer:', error)
      return
    }
    set((state) => ({
      signers: state.signers.filter((s) => s.id !== signerId),
    }))
  },

  fetchPlacements: async (documentId: string) => {
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

  addPlacement: async (placement) => {
    const { data, error } = await supabase
      .from('signature_placements')
      .insert(placement)
      .select()
      .single()
    if (error) {
      console.error('Error adding placement:', error)
      return
    }
    set((state) => ({
      placements: [...state.placements, data as SignaturePlacement],
    }))
  },

  fetchSignerByToken: async (token: string) => {
    const { data, error } = await (supabase as any)
      .rpc('get_signer_by_token', { p_token: token })
    if (error || !data) {
      console.error('Error fetching signer by token:', error)
      return null
    }
    return data as any
  },

  updateSignerStatus: async (signerId: string, status: 'pending' | 'viewed' | 'signed') => {
    const { error } = await (supabase as any)
      .rpc('update_signer_status_by_id', { p_signer_id: signerId, p_status: status })
    if (error) {
      console.error('Error updating signer status:', error)
    }
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

  addAuditEntry: async (documentId: string, action: string, userEmail: string, userName?: string | null, metadata?: string) => {
    let ipAddress: string | null = null
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const json = await res.json()
      ipAddress = json.ip || null
    } catch {
      // silently fail
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
      return
    }
    set((state) => ({
      auditTrail: [...state.auditTrail, data as AuditTrailEntry],
    }))
  },

  sendForSigning: async (documentId: string, senderName?: string, message?: string, ccEmails?: string[]) => {
    await get().saveSignatureFields(documentId)
    await get().updateDocumentStatus(documentId, 'pending')
    
    // Store CC emails in document metadata for completion emails (not for invitations)
    if (ccEmails && ccEmails.length > 0) {
      await supabase
        .from('documents')
        .update({ cc_metadata: JSON.stringify({ ccEmails }) } as any)
        .eq('id', documentId)
    }
    
    // Send emails to all signers (NOT to CC recipients)
    const signers = get().signers
    const doc = get().currentDocument
    
    if (!doc) return
    
    for (const signer of signers) {
      try {
        const signingLink = `${window.location.origin}/sign/${signer.signing_token}`
        

        const { error } = await supabase.functions.invoke('send-signing-email', {
          body: {
            to: signer.signer_email,
            documentTitle: doc.title,
            signingLink,
            senderName: senderName || 'A user',
            message: message || '',
          },
        })

        if (error) {
          console.error(`Failed to send email to ${signer.signer_email}:`, error)
        }
      } catch (error) {
        console.error(`Error sending email to ${signer.signer_email}:`, error)
      }
    }
    
    // Send view-only notification emails to CC recipients
    if (ccEmails && ccEmails.length > 0) {
      const viewLink = `${window.location.origin}/view/${documentId}`
      const signeeEmails = signers.map(s => s.signer_email)
      for (const ccEmail of ccEmails) {
        try {
          const { error: ccErr } = await supabase.functions.invoke('send-signing-email', {
            body: {
              to: ccEmail,
              documentTitle: doc.title,
              signingLink: '',
              senderName: senderName || 'A user',
              message: message || '',
              type: 'cc-notification',
              viewLink,
              signeeEmails,
            },
          })
          if (ccErr) {
            console.error(`Failed to send CC notification to ${ccEmail}:`, ccErr)
          }
        } catch (err) {
          console.error(`Error sending CC notification to ${ccEmail}:`, err)
        }
      }
    }
  },

  sendReminder: async (documentId: string, senderName?: string) => {
    // Fetch signers who haven't completed signing
    const { data: signersList } = await supabase
      .from('document_signers')
      .select('*')
      .eq('document_id', documentId)
      .neq('status', 'signed')

    if (!signersList || signersList.length === 0) return { sent: 0, failed: 0 }

    // Get document title
    const { data: doc } = await supabase
      .from('documents')
      .select('title')
      .eq('id', documentId)
      .single()

    if (!doc) return { sent: 0, failed: 0 }

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
