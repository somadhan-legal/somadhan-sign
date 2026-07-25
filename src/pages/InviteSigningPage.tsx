import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  PenTool,
  Type,
  Calendar,
  SquareCheck,
  History,
  Download,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import PdfViewer from '@/components/PdfViewer'
import SignaturePad from '@/components/SignaturePad'
import AuditTrailModal from '@/components/AuditTrailModal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import type { SignedField } from '@/lib/signedPdf'
import { supabase } from '@/lib/supabase'
import SomadhanLogoLight from '@/assets/sign_Somadhan_light.svg'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'
import { useThemeStore } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import { formatSigningDate } from '@/lib/utils'
import { getNextUnsignedField } from '@/lib/fieldNavigation'
import { downloadBlob, safePdfFilename } from '@/lib/download'
import { Moon, Sun, HelpCircle } from 'lucide-react'
import type { DocumentCompletionResult } from '@/types/database'
import { useResponsivePanel } from '@/hooks/useResponsivePanel'

const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader()
  reader.onerror = () => reject(reader.error || new Error('The completed PDF could not be read.'))
  reader.onload = () => {
    const result = typeof reader.result === 'string' ? reader.result : ''
    const separatorIndex = result.indexOf(',')
    if (separatorIndex < 0) reject(new Error('The completed PDF could not be encoded.'))
    else resolve(result.slice(separatorIndex + 1))
  }
  reader.readAsDataURL(blob)
})

const isMissingRpc = (error: { code?: string; message?: string } | null) =>
  error?.code === 'PGRST202' || error?.message?.includes('Could not find the function') === true

const CONSENT_VERSION = 'somadhan-esign-consent-v1'

const fieldTypeIcons: Record<string, React.ReactNode> = {
  signature: <PenTool className="w-3 h-3" />,
  initials: <Type className="w-3 h-3" />,
  date: <Calendar className="w-3 h-3" />,
  text: <Type className="w-3 h-3" />,
  checkbox: <SquareCheck className="w-3 h-3" />,
}

interface SignerData {
  id: string
  document_id: string
  signer_email: string
  signer_name: string | null
  status: string
  documents: {
    title: string
    original_pdf_url: string
    status: string
    final_pdf_available?: boolean
  }
}

export default function InviteSigningPage() {
  const { token } = useParams<{ token: string }>()
  const { lang, toggle: toggleLang, t } = useLanguageStore()
  const {
    signatureFields,
    placements,
    fetchPlacements,
    fetchSignerByToken,
    updateSignerStatus,
    addPlacement,
    addAuditEntry,
  } = useDocumentStore()

  const [signerData, setSignerData] = useState<SignerData | null>(null)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const [showInitialsModal, setShowInitialsModal] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(null)
  const [initialsData, setInitialsData] = useState<string | null>(null)
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0)
  const [tappedFieldId, setTappedFieldId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [datePickerFieldId, setDatePickerFieldId] = useState<string | null>(null)
  const [textInputFieldId, setTextInputFieldId] = useState<string | null>(null)
  const [textInputValue, setTextInputValue] = useState('')
  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const [finished, setFinished] = useState(false)
  const [documentCompleted, setDocumentCompleted] = useState(false)
  const [hasConsented, setHasConsented] = useState(false)
  const [savingConsent, setSavingConsent] = useState(false)
  const [completionDeliveryFailed, setCompletionDeliveryFailed] = useState(false)
  const [retryingCompletion, setRetryingCompletion] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [auditPdfUrl, setAuditPdfUrl] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const hasLoggedView = useRef(false)
  const { isDark, toggle } = useThemeStore()
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useResponsivePanel()
  const [countdown, setCountdown] = useState<number | null>(null)

  useEffect(() => {
    if (!token) return
    const load = async () => {
      setPageLoading(true)
      const data = await fetchSignerByToken(token)
      if (!data) {
        setError(t('signee.docNotFoundDesc'))
        setPageLoading(false)
        return
      }
      setSignerData(data as unknown as SignerData)
      setDocumentCompleted(data.documents.status === 'completed')
      if (data.documents.status === 'completed' && typeof data.documents.final_pdf_available === 'boolean') {
        const completionDeliveryRecorded = useDocumentStore.getState().auditTrail.some((entry) => {
          if (entry.action !== 'Completion Emails Sent') return false
          try {
            return JSON.parse(entry.metadata || '{}').source === 'send-signing-email'
          } catch {
            return false
          }
        })
        setCompletionDeliveryFailed(!data.documents.final_pdf_available || !completionDeliveryRecorded)
      }
      setHasConsented(useDocumentStore.getState().auditTrail.some((entry) =>
        entry.action === 'Electronic Signature Consent Given'
        && entry.user_email.trim().toLowerCase() === data.signer_email.trim().toLowerCase()
      ))

      // If signer already signed, show finished state
      if (data.status === 'signed') {
        setFinished(true)
        setPageLoading(false)
        return
      }

      if (data.status === 'pending') {
        await updateSignerStatus(data.id, 'viewed', token)
      }

      setPageLoading(false)
    }
    load()
  }, [token, fetchSignerByToken, updateSignerStatus, t])

  useEffect(() => {
    if (signerData && !hasLoggedView.current) {
      hasLoggedView.current = true
      addAuditEntry(signerData.document_id, 'Document Viewed', signerData.signer_email, signerData.signer_name, undefined, token)
    }
  }, [signerData, addAuditEntry, token])

  useEffect(() => () => {
    if (auditPdfUrl) URL.revokeObjectURL(auditPdfUrl)
  }, [auditPdfUrl])

  const userEmail = signerData?.signer_email || ''
  const userName = signerData?.signer_name || null
  const documentId = signerData?.document_id || ''

  const requireConsent = () => {
    if (hasConsented) return true
    setActionError(t('signee.consentRequired'))
    setLeftPanelCollapsed(false)
    return false
  }

  const handleConsent = async () => {
    if (!documentId || !signerData || hasConsented || savingConsent) return
    setSavingConsent(true)
    setActionError('')
    const recorded = await addAuditEntry(
      documentId,
      'Electronic Signature Consent Given',
      userEmail,
      userName,
      JSON.stringify({
        version: CONSENT_VERSION,
        statement: t('signee.consentDescription'),
        language: lang,
        source: 'signing-interface',
      }),
      token,
    )
    if (recorded) setHasConsented(true)
    else setActionError(t('signee.consentSaveFailed'))
    setSavingConsent(false)
  }

  const myFields = signatureFields.filter(
    (f) => f.document_id === documentId && f.assigned_to_email === userEmail
  )
  const myInitialsFields = myFields.filter((f) => f.field_type === 'initials')
  const signedFieldIds = new Set(placements.map((p) => p.field_id))
  const myUnsignedInitialsFields = myInitialsFields.filter((f) => !signedFieldIds.has(f.id))
  const mySignedFields = myFields.filter((f) => signedFieldIds.has(f.id))
  const allMyUnsigned = myFields.filter((f) => !signedFieldIds.has(f.id))
  const currentField = allMyUnsigned[currentFieldIndex] || null

  const scrollToField = useCallback((field: { id: string; page_number: number }) => {
    const revealField = () => {
      const pageEl = document.querySelector(`[data-page-number="${field.page_number}"]`)
      if (pageEl) pageEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
      const fieldEl = document.querySelector(`[data-field-id="${field.id}"]`)
      if (fieldEl) fieldEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }

    if (window.matchMedia('(max-width: 1023px)').matches && !leftPanelCollapsed) {
      setLeftPanelCollapsed(true)
      window.setTimeout(revealField, 100)
      return
    }

    revealField()
  }, [leftPanelCollapsed, setLeftPanelCollapsed])

  const navigateToField = (index: number) => {
    if (index >= 0 && index < allMyUnsigned.length) {
      setCurrentFieldIndex(index)
      scrollToField(allMyUnsigned[index])
    }
  }

  const handleSaveSignature = (dataUrl: string) => {
    setSignatureData(dataUrl)
    setShowSignatureModal(false)
  }

  const handleSaveInitials = (dataUrl: string) => {
    setInitialsData(dataUrl)
    setShowInitialsModal(false)
    // If tapping a specific field, just set data. UI will show ADD THIS / ADD EVERYWHERE.
    // If drawing from sidebar (no tappedFieldId), also just set data and let user choose
  }

  const mySignatureFields = myFields.filter((f) => f.field_type === 'signature')
  const myUnsignedSignatureFields = mySignatureFields.filter((f) => !signedFieldIds.has(f.id))

  const handleAutoFillSignatures = async (data: string) => {
    if (!documentId || !signerData || !requireConsent()) return
    setSubmitting(true)
    setActionError('')
    setShowSignatureModal(false)
    setTappedFieldId(null)
    for (const field of myUnsignedSignatureFields) {
      const saved = await addPlacement({
        document_id: documentId,
        field_id: field.id,
        signer_id: null,
        signer_email: userEmail,
        signature_id: data,
      }, token)
      if (!saved) {
        setActionError(t('signee.fieldSaveFailed'))
        await fetchPlacements(documentId, token)
        setSubmitting(false)
        return
      }
    }
    setSignatureData(data)
    await addAuditEntry(documentId, 'Signature Applied', userEmail, userName, `Auto-filled ${myUnsignedSignatureFields.length} signature fields`, token)
    setSubmitting(false)
    await checkCompletion()
  }

  const handleAutoFillInitials = async (data: string) => {
    if (!documentId || !signerData || !requireConsent()) return
    setSubmitting(true)
    setActionError('')
    setTappedFieldId(null)
    for (const field of myUnsignedInitialsFields) {
      const saved = await addPlacement({
        document_id: documentId,
        field_id: field.id,
        signer_id: null,
        signer_email: userEmail,
        signature_id: data,
      }, token)
      if (!saved) {
        setActionError(t('signee.fieldSaveFailed'))
        await fetchPlacements(documentId, token)
        setSubmitting(false)
        return
      }
    }
    setInitialsData(data)
    await addAuditEntry(documentId, 'Initials Added', userEmail, userName, `Auto-filled ${myUnsignedInitialsFields.length} initials fields`, token)
    setSubmitting(false)
    await checkCompletion()
  }

  const handleTapToSign = async (fieldId: string) => {
    if (!requireConsent()) return
    const field = signatureFields.find((f) => f.id === fieldId)
    const isInitials = field?.field_type === 'initials'
    const dataToUse = isInitials ? initialsData : signatureData

    if (!dataToUse || !documentId || !signerData) {
      return
    }
    setSubmitting(true)
    setActionError('')

    const saved = await addPlacement({
      document_id: documentId,
      field_id: fieldId,
      signer_id: null,
      signer_email: userEmail,
      signature_id: dataToUse,
    }, token)
    if (!saved) {
      setActionError(t('signee.fieldSaveFailed'))
      await fetchPlacements(documentId, token)
      setSubmitting(false)
      return
    }

    await addAuditEntry(documentId, isInitials ? 'Initials Added' : 'Signature Applied', userEmail, userName, `${isInitials ? 'Initials' : 'Signature'} placed on page ${field?.page_number}`, token)

    setTappedFieldId(null)
    setSubmitting(false)

    await checkCompletion(fieldId)
  }

  const handleDateField = async (fieldId: string, dateValue: string) => {
    if (!documentId || !signerData || !dateValue || !requireConsent()) return
    setSubmitting(true)
    setActionError('')
    setDatePickerFieldId(null)
    const saved = await addPlacement({
      document_id: documentId,
      field_id: fieldId,
      signer_id: null,
      signer_email: userEmail,
      signature_id: dateValue,
    }, token)
    if (!saved) {
      setActionError(t('signee.fieldSaveFailed'))
      await fetchPlacements(documentId, token)
      setSubmitting(false)
      return
    }
    const field = signatureFields.find((f) => f.id === fieldId)
    await addAuditEntry(documentId, 'Date Filled', userEmail, userName, `Date ${dateValue} on page ${field?.page_number}`, token)
    setSubmitting(false)
    await checkCompletion(fieldId)
  }

  const handleCheckboxField = async (fieldId: string) => {
    if (!documentId || !signerData || !requireConsent()) return
    setSubmitting(true)
    setActionError('')
    const saved = await addPlacement({
      document_id: documentId,
      field_id: fieldId,
      signer_id: null,
      signer_email: userEmail,
      signature_id: 'checkbox:checked',
    }, token)
    if (!saved) {
      setActionError(t('signee.fieldSaveFailed'))
      await fetchPlacements(documentId, token)
      setSubmitting(false)
      return
    }
    const field = signatureFields.find((f) => f.id === fieldId)
    await addAuditEntry(documentId, 'Checkbox Checked', userEmail, userName, `Checkbox on page ${field?.page_number}`, token)
    setSubmitting(false)
    await checkCompletion(fieldId)
  }

  const handleTextFieldSubmit = async (fieldId: string) => {
    if (!documentId || !signerData || !textInputValue.trim() || !requireConsent()) return
    setSubmitting(true)
    setActionError('')
    setTextInputFieldId(null)
    const saved = await addPlacement({
      document_id: documentId,
      field_id: fieldId,
      signer_id: null,
      signer_email: userEmail,
      signature_id: textInputValue.trim(),
    }, token)
    if (!saved) {
      setActionError(t('signee.fieldSaveFailed'))
      await fetchPlacements(documentId, token)
      setSubmitting(false)
      return
    }
    const field = signatureFields.find((f) => f.id === fieldId)
    await addAuditEntry(documentId, 'Text Entered', userEmail, userName, `Text on page ${field?.page_number}`, token)
    setTextInputValue('')
    setSubmitting(false)
    await checkCompletion(fieldId)
  }

  const checkCompletion = async (completedFieldId?: string) => {
    if (!documentId || !signerData) return
    // Re-fetch placements to get accurate count
    await fetchPlacements(documentId, token)
    const latestPlacements = useDocumentStore.getState().placements
    const latestSignedIds = new Set(latestPlacements.map((p) => p.field_id))
    const remaining = myFields.filter((f) => !latestSignedIds.has(f.id))
    const nextField = getNextUnsignedField(myFields, latestSignedIds, completedFieldId)
    if (nextField) {
      setCurrentFieldIndex(remaining.findIndex((field) => field.id === nextField.id))
      scrollToField(nextField)
      return
    }

    if (remaining.length === 0) {
      const statusUpdated = await updateSignerStatus(signerData.id, 'signed', token)
      if (!statusUpdated) {
        setActionError(t('signee.completionConfirmFailed'))
        return
      }
      await addAuditEntry(documentId, 'All Fields Signed', userEmail, userName, undefined, token)
      
      // Use RPC because unauthenticated signers cannot read document_signers through RLS.
      // Retry up to 3 times with increasing delay to handle race conditions
      let allSigned = false
      for (let attempt = 1; attempt <= 3; attempt++) {
        await new Promise(r => setTimeout(r, attempt * 1500))
        let { data, error: checkErr } = await supabase
          .rpc('check_all_signers_signed_by_token', { p_token: token || '' })
        if (isMissingRpc(checkErr)) {
          const legacyResult = await supabase
            .rpc('check_all_signers_signed', { p_document_id: documentId, p_current_signer_id: signerData.id })
          data = legacyResult.data
          checkErr = legacyResult.error
        }
        if (data) {
          allSigned = true
          break
        }
        if (checkErr) {
          console.error('[checkCompletion] Error checking all signers signed:', checkErr)
          break
        }
      }
      
      if (!allSigned) {
        console.warn('[checkCompletion] All retries exhausted. Other signers may not have completed yet.')
      }
      
      if (allSigned) {
        let { error: rpcError } = await supabase
          .rpc('mark_document_completed_by_token', { p_token: token || '' })
        if (isMissingRpc(rpcError)) {
          const legacyResult = await supabase
            .rpc('mark_document_completed', { p_document_id: documentId })
          rpcError = legacyResult.error
        }
        
        if (rpcError) {
          console.error('RPC mark_document_completed failed:', rpcError)
          setActionError(t('signee.finalizeFailed'))
          return
        }
        setDocumentCompleted(true)
        // Get all document data via RPC (bypasses RLS)
        let completionData: DocumentCompletionResult | null = null
        try {
          let { data, error: completionError } = await supabase
            .rpc('get_document_for_completion_by_token', { p_token: token || '' })
          if (isMissingRpc(completionError)) {
            const legacyResult = await supabase
              .rpc('get_document_for_completion', { p_document_id: documentId })
            data = legacyResult.data
            completionError = legacyResult.error
          }
          if (completionError) throw completionError
          completionData = data
        } catch (rpcErr) {
          console.error('[completion] RPC get_document_for_completion failed:', rpcErr)
          setCompletionDeliveryFailed(true)
        }
        
        const downloadUrl = ''
        let pdfBase64 = ''
        
        // Generate signed PDF + audit trail combined (non-blocking for email)
        if (signerData.documents.original_pdf_url && completionData?.fields && completionData?.placements) {
          try {
            const refreshedAccess = token ? await fetchSignerByToken(token) : null
            const completionPdfUrl = refreshedAccess?.documents.original_pdf_url || signerData.documents.original_pdf_url
            const signedFields: SignedField[] = completionData.placements.map((p) => {
              const field = completionData.fields?.find((candidate) => candidate.id === p.field_id)
              return {
                field_type: field?.field_type || 'signature',
                page_number: field?.page_number || 1,
                x_percent: field?.x || 0,
                y_percent: field?.y || 0,
                width_percent: field?.width || 10,
                height_percent: field?.height || 5,
                signature_id: p.signature_id,
              }
            })
            
            const { generateSignedPdf } = await import('@/lib/signedPdf')
            const signedBlob = await generateSignedPdf(completionPdfUrl, signedFields)
            
            let finalBlob = signedBlob
            if (completionData.audit_trail && completionData.audit_trail.length > 0) {
              const signedUrl = URL.createObjectURL(signedBlob)
              try {
                const { generateAuditPdf } = await import('@/lib/auditPdf')
                finalBlob = await generateAuditPdf(signedUrl, completionData.audit_trail, completionData.title || 'Document')
              } finally {
                URL.revokeObjectURL(signedUrl)
              }
            }
            
            pdfBase64 = await blobToBase64(finalBlob)
          } catch (pdfErr) {
            console.error('[completion] PDF generation error:', pdfErr)
          }
        }
        
        // Attempt the completion email even if PDF generation failed.
        try {
          const directRecipients: string[] = []
          
          if (completionData?.signers) {
            completionData.signers.forEach((signer) => { if (signer.signer_email) directRecipients.push(signer.signer_email) })
          }
          
          if (completionData?.owner_email) {
            directRecipients.push(completionData.owner_email)
          }
          
          // Extract CC emails from audit trail metadata
          let ccEmails: string[] = []
          if (completionData?.cc_metadata) {
            try {
              const meta = typeof completionData.cc_metadata === 'string'
                ? JSON.parse(completionData.cc_metadata)
                : completionData.cc_metadata
              if (meta.ccEmails && Array.isArray(meta.ccEmails)) {
                ccEmails = meta.ccEmails
              }
            } catch { /* not JSON */ }
          }
          
          const uniqueRecipients = [...new Set(directRecipients)]
          
          if (uniqueRecipients.length > 0) {
            const { error: emailFnErr } = await supabase.functions.invoke('send-signing-email', {
              body: {
                to: uniqueRecipients,
                documentTitle: completionData?.title || 'Document',
                signingLink: '',
                signingToken: token,
                senderName: 'SomadhanSign',
                type: 'completion',
                downloadUrl,
                pdfBase64,
                ccEmails: ccEmails.length > 0 ? ccEmails : undefined,
              },
            })
            if (emailFnErr) {
              console.error('[completion] Edge function error:', emailFnErr)
              setCompletionDeliveryFailed(true)
            } else {
              setCompletionDeliveryFailed(false)
            }
          } else {
            setCompletionDeliveryFailed(true)
          }
        } catch (emailErr) {
          console.error('[completion] Error sending completion email:', emailErr)
          setCompletionDeliveryFailed(true)
        }
      }
      
      // Start countdown before transitioning to finished
      setCountdown(3)
      
      // Wait for countdown to finish, then transition
      setTimeout(() => {
        setFinished(true)
      }, 3000)
    }
  }
  
  // Countdown timer effect
  useEffect(() => {
    if (countdown === null || countdown <= 0) return
    
    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)
    
    return () => clearTimeout(timer)
  }, [countdown])

  const getPageFields = (pageNumber: number) => signatureFields.filter(
    (f) => f.document_id === documentId && f.page_number === pageNumber
  )

  if (pageLoading) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[hsl(var(--background))]" role="status" aria-live="polite">
        <a href="/">
          <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 mb-6 cursor-pointer" />
        </a>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true" />
          <p className="text-[hsl(var(--muted-foreground))]">{t('signee.loadingDoc')}</p>
        </div>
      </div>
    )
  }

  if (error || !signerData) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[hsl(var(--background))]">
        <a href="/">
          <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 mb-6 cursor-pointer" />
        </a>
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--destructive))]/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">!</span>
          </div>
          <h2 className="text-xl font-bold mb-2">{t('signee.docNotFound')}</h2>
          <p className="text-[hsl(var(--muted-foreground))]">
            {error || t('signee.docNotFoundDesc')}
          </p>
        </div>
      </div>
    )
  }

  const fetchSignedFields = (): SignedField[] => {
    if (!documentId) return []
    const fieldsMap = new Map(signatureFields.map(f => [f.id, f]))
    return placements
      .filter(p => fieldsMap.has(p.field_id))
      .map(p => {
        const field = fieldsMap.get(p.field_id)!
        return {
          field_type: field.field_type,
          page_number: field.page_number,
          x_percent: field.x,
          y_percent: field.y,
          width_percent: field.width,
          height_percent: field.height,
          signature_id: p.signature_id,
        }
      })
  }

  const buildSignedAuditPdf = async (): Promise<Blob> => {
    const refreshedSigner = token ? await fetchSignerByToken(token) : null
    if (refreshedSigner?.documents.final_pdf_url) {
      const response = await fetch(refreshedSigner.documents.final_pdf_url)
      if (!response.ok) throw new Error('The final PDF could not be downloaded.')
      return response.blob()
    }
    const pdfUrl = refreshedSigner?.documents.original_pdf_url || signerData!.documents.original_pdf_url
    const title = signerData!.documents.title

    // Step 1: Generate signed PDF with overlays
    const signedFields = fetchSignedFields()
    let basePdfUrl = pdfUrl
    if (signedFields.length > 0) {
      const { generateSignedPdf } = await import('@/lib/signedPdf')
      const signedBlob = await generateSignedPdf(pdfUrl, signedFields)
      basePdfUrl = URL.createObjectURL(signedBlob)
    }

    const filteredAudit = useDocumentStore.getState().auditTrail
      .filter(entry => entry.document_id === signerData!.document_id)

    // Step 3: Append audit trail pages to the signed PDF
    const { generateAuditPdf } = await import('@/lib/auditPdf')
    try {
      return await generateAuditPdf(basePdfUrl, filteredAudit, title)
    } finally {
      if (basePdfUrl !== pdfUrl) URL.revokeObjectURL(basePdfUrl)
    }
  }

  const handleViewDocument = async () => {
    if (!signerData || !documentId) return
    setGeneratingPdf(true)
    setPdfError('')
    try {
      const blob = await buildSignedAuditPdf()
      const url = URL.createObjectURL(blob)
      setAuditPdfUrl(url)
      setShowPreview(true)
    } catch (err) {
      console.error('Error generating PDF:', err)
      setPdfError(t('signee.signedDocumentGenerateFailed'))
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!signerData || !documentId) return
    setPdfError('')
    try {
      const blob = await buildSignedAuditPdf()
      downloadBlob(blob, safePdfFilename(signerData.documents.title, ' - Signed'))
    } catch (err) {
      console.error('Error generating signed PDF:', err)
      setPdfError(t('signee.signedPdfGenerateFailed'))
    }
  }

  const handleRetryCompletion = async () => {
    if (retryingCompletion) return
    setRetryingCompletion(true)
    await checkCompletion()
    setRetryingCompletion(false)
  }

  const pdfErrorNotice = pdfError ? (
    <div role="alert" className="fixed bottom-5 left-1/2 z-[70] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl bg-[hsl(var(--destructive))] px-4 py-3 text-sm font-medium text-white shadow-xl">
      {pdfError}
    </div>
  ) : null

  if (finished && showPreview && auditPdfUrl) {
    return (
      <div className="flex h-dvh flex-col bg-[hsl(var(--background))]">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] shadow-sm sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <a href="/">
              <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 cursor-pointer" />
            </a>
            <div className="w-px h-6 bg-[hsl(var(--border))]" />
            <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
            <h2 className="truncate font-semibold">{signerData?.documents.title} | Signed</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-1" />
              {t('signee.downloadPdf')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setShowPreview(false); setAuditPdfUrl(null) }}>
              {t('signee.close')}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto flex justify-center p-3 sm:p-6">
          <PdfViewer
            fileUrl={auditPdfUrl}
          />
        </div>
        {pdfErrorNotice}
      </div>
    )
  }

  if (finished) {
    return (
      <div className="min-h-dvh flex flex-col bg-[hsl(var(--background))]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <a href="/">
            <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 cursor-pointer" />
          </a>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleLang} aria-label={t(lang === 'en' ? 'common.switchToBangla' : 'common.switchToEnglish')} title={lang === 'en' ? 'বাংলা' : 'English'}>
              <span className="text-xs font-bold">{lang === 'en' ? 'বাং' : 'EN'}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} aria-label={isDark ? t('nav.lightMode') : t('nav.darkMode')} title={isDark ? t('nav.lightMode') : t('nav.darkMode')}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md p-8">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--primary))] mb-3">
              {documentCompleted ? t('signee.signingComplete') : t('signee.yourPartComplete')}
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-8">
              {t('signee.thankYou')} <strong className="text-[hsl(var(--foreground))]">{userName || userEmail}</strong>. {t('signee.allFieldsSigned')}
            </p>
            {documentCompleted ? (
            <div className="space-y-3">
              {completionDeliveryFailed && (
                <div role="alert" className="rounded-xl border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/10 p-4 text-sm text-[hsl(var(--foreground))]">
                  <p className="mb-3">{t('signee.deliveryNeedsRetry')}</p>
                  <Button variant="outline" className="w-full" onClick={handleRetryCompletion} disabled={retryingCompletion}>
                    {retryingCompletion ? t('signee.retryingDelivery') : t('signee.retryDelivery')}
                  </Button>
                </div>
              )}
              <Button className="w-full" onClick={handleDownloadPdf} disabled={generatingPdf}>
                {generatingPdf ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    {t('signee.generatingPdf')}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t('signee.downloadSigned')}
                  </>
                )}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleViewDocument} disabled={generatingPdf}>
                {t('signee.viewSigned')}
              </Button>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {t('signee.downloadIncludesAudit')}
              </p>
            </div>
            ) : (
              <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/60 p-4 text-sm text-[hsl(var(--muted-foreground))]">
                {t('signee.waitingForOthers')}
              </div>
            )}
          </div>
        </div>
        {pdfErrorNotice}
      </div>
    )
  }

  return (
    <div className="relative flex h-dvh min-w-0">
      {!leftPanelCollapsed && (
        <button
          type="button"
          aria-label={t('signee.collapsePanel')}
          onClick={() => setLeftPanelCollapsed(true)}
          className="fixed inset-0 z-40 bg-black/35 lg:hidden"
        />
      )}
      {/* Sidebar */}
      {!leftPanelCollapsed && (
      <div className="absolute inset-y-0 left-0 z-50 w-[min(20rem,88vw)] border-r border-[hsl(var(--border))] bg-[hsl(var(--background))] shadow-xl overflow-y-auto flex flex-col lg:static lg:z-auto lg:w-80 lg:shadow-none">
        <div className="p-3 border-b border-[hsl(var(--border))] flex items-center">
          <a href="/">
            <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 cursor-pointer" />
          </a>
        </div>
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg truncate">{signerData.documents.title}</h2>
            <button
              type="button"
              onClick={() => setShowAuditTrail(true)}
              aria-label={t('signee.openAuditTrail')}
              className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] cursor-pointer"
              title={t('audit.title')}
            >
              <History className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="warning">{t('signee.signingAs')}</Badge>
            <span className="text-sm text-[hsl(var(--muted-foreground))] truncate">{userEmail}</span>
          </div>
        </div>

        <div className="border-b border-[hsl(var(--border))] p-4">
          <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-3 text-sm">
            <input
              id="electronic-signature-consent"
              type="checkbox"
              checked={hasConsented}
              disabled={hasConsented || savingConsent}
              onChange={() => void handleConsent()}
              className="mt-0.5 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
            />
            <label htmlFor="electronic-signature-consent" className="cursor-pointer">
              <span className="block font-semibold">{t('signee.consentTitle')}</span>
              <span className="mt-1 block text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">
                {savingConsent ? t('signee.savingConsent') : t('signee.consentDescription')}
              </span>
            </label>
          </div>
        </div>

        {/* Signature Setup */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h3 className="font-medium text-sm mb-3">{t('signee.yourSignature')}</h3>
          {signatureData ? (
            <div className="space-y-2">
              <div className="border border-[hsl(var(--border))] rounded-lg p-3 bg-white">
                <img src={signatureData} alt={t('signee.yourSignature')} className="max-h-16 mx-auto" />
              </div>
              {myUnsignedSignatureFields.length === 0 ? (
                <p className="text-xs text-[hsl(var(--success))] text-center">{t('signee.allSignaturesFilled') || 'All signatures filled'}</p>
              ) : (
                <div className="space-y-1.5">
                  <Button size="sm" className="w-full" disabled={!hasConsented} onClick={() => handleAutoFillSignatures(signatureData)}>
                    {t('signee.applyToAllSignatures')} ({myUnsignedSignatureFields.length})
                  </Button>
                  <Button variant="outline" size="sm" className="w-full" disabled={!hasConsented} onClick={() => setShowSignatureModal(true)}>
                    {t('signee.changeSignature')}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Button className="w-full" disabled={!hasConsented} onClick={() => setShowSignatureModal(true)}>
              <PenTool className="w-4 h-4 mr-2" />
              {t('signee.createSignature')}
            </Button>
          )}
        </div>

        {/* Initials Setup */}
        {myInitialsFields.length > 0 && (
          <div className="p-4 border-b border-[hsl(var(--border))]">
            <h3 className="font-medium text-sm mb-3">
              {t('signee.yourInitials')}
              <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">
                ({myInitialsFields.length} {t('signee.places')})
              </span>
            </h3>
            {initialsData ? (
              <div className="space-y-2">
                <div className="border border-[hsl(var(--border))] rounded-lg p-3 bg-white">
                  <img src={initialsData} alt="Your initials" className="max-h-12 mx-auto" />
                </div>
                {myUnsignedInitialsFields.length === 0 ? (
                  <p className="text-xs text-[hsl(var(--success))] text-center">{t('signee.allInitialsFilled')}</p>
                ) : (
                  <div className="space-y-1.5">
                    <Button size="sm" className="w-full" disabled={!hasConsented} onClick={() => handleAutoFillInitials(initialsData)}>
                      {t('signee.applyToAllInitials')} ({myUnsignedInitialsFields.length})
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" disabled={!hasConsented} onClick={() => setShowInitialsModal(true)}>
                      {t('signee.changeInitials')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="secondary" className="w-full" disabled={!hasConsented} onClick={() => setShowInitialsModal(true)}>
                <Type className="w-4 h-4 mr-2" />
                {t('signee.addInitials')} ({myUnsignedInitialsFields.length} {t('signee.places')})
              </Button>
            )}
          </div>
        )}

        {/* Fields Progress */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h3 className="font-medium text-sm mb-3">
            {t('signee.yourFields')} ({mySignedFields.length}/{myFields.length} {t('signee.signed')})
          </h3>
          <div
            className="w-full h-2 bg-[hsl(var(--muted))] rounded-full mb-3"
            role="progressbar"
                  aria-label={t('signee.signingProgress')}
            aria-valuemin={0}
            aria-valuemax={Math.max(myFields.length, 1)}
            aria-valuenow={mySignedFields.length}
          >
            <div
              className="h-full bg-[hsl(var(--success))] rounded-full transition-all"
              style={{
                width: `${myFields.length > 0 ? (mySignedFields.length / myFields.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {myFields.map((field, index) => {
              const isSigned = signedFieldIds.has(field.id)
              const isSelected = currentField?.id === field.id
              const icon = fieldTypeIcons[field.field_type] || fieldTypeIcons.signature
              return (
                <button
                  key={field.id}
                  className={`flex items-center gap-2 w-full p-2 rounded-lg text-left text-sm transition-all cursor-pointer ${
                    isSigned
                      ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]'
                      : isSelected
                      ? 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))] ring-2 ring-[hsl(var(--primary))] font-bold animate-field-pulse'
                      : 'hover:bg-[hsl(var(--muted))]'
                  }`}
                onClick={() => {
                  if (!hasConsented) {
                    requireConsent()
                    return
                  }
                  if (!isSigned) {
                      const unsignedIdx = allMyUnsigned.findIndex((f) => f.id === field.id)
                      if (unsignedIdx >= 0) setCurrentFieldIndex(unsignedIdx)
                    }
                    scrollToField(field)
                  }}
                >
                  {isSigned ? (
                    <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))] shrink-0" />
                  ) : isSelected ? (
                    <div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/20 shrink-0 animate-pulse" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--border))] shrink-0" />
                  )}
                  <span className="flex items-center gap-1">
                    {icon}
                    {field.field_type === 'initials' ? 'Initials' : field.field_type === 'signature' ? 'Sign' : field.field_type.charAt(0).toUpperCase() + field.field_type.slice(1)} {index + 1} | Pg {field.page_number}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Help Guide */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center gap-1.5 mb-2">
            <HelpCircle className="w-3.5 h-3.5 text-[hsl(var(--primary))]" />
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('signee.helpTitle')}</h3>
          </div>
          <ol className="space-y-1.5 text-[11px] text-[hsl(var(--muted-foreground))] leading-relaxed">
            <li>{t('signee.help1')}</li>
            <li>{t('signee.help2')}</li>
            <li>{t('signee.help3')}</li>
            <li>{t('signee.help4')}</li>
            <li>{t('signee.help5')}</li>
          </ol>
        </div>

        {/* Navigation */}
        <div className="p-4 mt-auto sticky bottom-0 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] space-y-2">
          {allMyUnsigned.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t('signee.previousUnsignedField')}
                  onClick={() => navigateToField(currentFieldIndex - 1)}
                  disabled={currentFieldIndex <= 0}
                  className="h-9 w-9"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium flex-1 text-center">
                  {currentFieldIndex + 1} / {allMyUnsigned.length}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label={t('signee.nextUnsignedField')}
                  onClick={() => navigateToField(currentFieldIndex + 1)}
                  disabled={currentFieldIndex >= allMyUnsigned.length - 1}
                  className="h-9 w-9"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
                {t('signee.tapAnyField')}
              </p>
            </div>
          )}

          {allMyUnsigned.length === 0 && myFields.length > 0 && (
            <div className="text-center">
              {countdown !== null && countdown > 0 ? (
                <div className="w-10 h-10 mx-auto mb-2 rounded-full border-4 border-[hsl(var(--success))] flex items-center justify-center">
                  <span className="text-2xl font-bold text-[hsl(var(--success))]">{countdown}</span>
                </div>
              ) : (
                <CheckCircle2 className="w-10 h-10 mx-auto text-[hsl(var(--success))] mb-2" />
              )}
              <p className="text-sm font-medium text-[hsl(var(--success))]">
                {t('signee.allYourFieldsSigned')}
              </p>
            </div>
          )}
          
          {/* Collapse button */}
          <button
            type="button"
            aria-label={t('signee.collapsePanel')}
            onClick={() => setLeftPanelCollapsed(true)}
            className="w-full py-2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded-lg transition-colors flex items-center justify-center cursor-pointer mt-2"
            title={t('signee.collapsePanel')}
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>
      </div>
      )}
      
      {/* Expand button when collapsed */}
      {leftPanelCollapsed && (
        <button
          type="button"
          aria-label={t('signee.expandPanel')}
          onClick={() => setLeftPanelCollapsed(false)}
          className="w-11 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center justify-center cursor-pointer"
          title={t('signee.expandPanel')}
        >
          <PanelLeftOpen className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </button>
      )}

      {/* PDF Viewer */}
      <div className="min-w-0 flex-1 overflow-auto bg-[hsl(var(--muted))] p-3 sm:p-6 flex justify-center relative">
        {/* Language & Theme toggles - top right */}
        <div className="fixed top-3 right-4 z-40 flex items-center gap-1 bg-[hsl(var(--card))]/90 backdrop-blur rounded-lg border border-[hsl(var(--border))] px-1 py-0.5 shadow-sm">
          <Button variant="ghost" size="icon" onClick={toggleLang} aria-label={t(lang === 'en' ? 'common.switchToBangla' : 'common.switchToEnglish')} title={lang === 'en' ? 'বাংলা' : 'English'} className="h-11 w-11">
            <span className="text-xs font-bold">{lang === 'en' ? 'বাং' : 'EN'}</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggle} aria-label={isDark ? t('nav.lightMode') : t('nav.darkMode')} title={isDark ? t('nav.lightMode') : t('nav.darkMode')} className="h-11 w-11">
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
        </div>
        <PdfViewer
          fileUrl={signerData.documents.original_pdf_url}
          renderPageOverlay={(pageNumber) => {
            const pageFields = getPageFields(pageNumber)
            return (
            <>
              {pageFields.map((field) => {
                const isMine = field.assigned_to_email === userEmail
                const placement = placements.find((p) => p.field_id === field.id)
                const isSigned = !!placement
                const isCurrentNav = currentField?.id === field.id
                const isTapped = tappedFieldId === field.id
                const isInitials = field.field_type === 'initials'
                const isDate = field.field_type === 'date'
                const isCheckbox = field.field_type === 'checkbox'
                const isText = field.field_type === 'text'
                const isSignatureType = field.field_type === 'signature' || isInitials

                const sigData = isInitials ? initialsData : signatureData
                const activateUnsignedField = () => {
                  if (!isMine || isSigned || submitting) return
                  if (!requireConsent()) return
                  if (isCheckbox) {
                    handleCheckboxField(field.id)
                  } else if (isDate) {
                    setDatePickerFieldId(field.id)
                  } else if (isText) {
                    setTextInputFieldId(field.id)
                    setTextInputValue('')
                  } else if (isInitials && initialsData) {
                    setTappedFieldId(field.id)
                  } else if (isInitials) {
                    setTappedFieldId(field.id)
                    setShowInitialsModal(true)
                  } else if (signatureData) {
                    setTappedFieldId(field.id)
                  } else {
                    setTappedFieldId(field.id)
                    setShowSignatureModal(true)
                  }
                }

                return (
                  <div
                    key={field.id}
                    data-field-id={field.id}
                    className={`absolute transition-all ${isTapped ? 'overflow-visible' : ''}`}
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      width: `${field.width}%`,
                      height: `${field.height}%`,
                      zIndex: isTapped ? 50 : isCurrentNav ? 20 : 10,
                    }}
                  >
                    {/* Signed states use raw content without borders. */}
                    {isSigned && placement && (isSignatureType || placement.signature_id.startsWith('data:image')) ? (
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <img src={placement.signature_id} alt={t('signee.signedValue')} className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : isSigned && placement && (isDate || placement.signature_id.startsWith('date:')) ? (
                      <div className="w-full h-full flex items-end">
                        <span className="text-sm font-bold text-black leading-tight">{formatSigningDate(placement.signature_id)}</span>
                      </div>
                    ) : isSigned && placement && (isCheckbox || placement.signature_id === 'checkbox:checked') ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-[70%] h-[70%] text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    ) : isSigned && placement && (isText || placement.signature_id.startsWith('text:')) ? (
                      <div className="w-full h-full flex items-end">
                        <span className="text-sm font-bold text-black leading-tight">{placement.signature_id.replace('text:', '')}</span>
                      </div>

                    ) : isTapped && isSignatureType && sigData ? (
                      /* Tapped signature or initials: Apply to this / Apply to All popover. */
                      <div className="relative w-full h-full">
                        {/* Field highlight with signature preview */}
                        <div className="w-full h-full rounded border-2 border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/10 overflow-hidden flex items-center justify-center">
                          <img src={sigData} alt={t('signee.signaturePreview')} className="max-w-full max-h-full object-contain opacity-40" />
                        </div>
                        {/* Popover buttons below the field */}
                        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 flex gap-1 whitespace-nowrap" style={{ zIndex: 100 }}>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleTapToSign(field.id); }}
                            disabled={submitting}
                            className="px-3 py-1.5 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] bg-[hsl(var(--card))] text-[10px] rounded-md font-semibold hover:bg-[hsl(var(--primary))]/10 cursor-pointer shadow-lg"
                          >
                            {submitting ? '...' : t('signee.applyToThis')}
                          </button>
                          {(isInitials ? myUnsignedInitialsFields.length > 1 : myUnsignedSignatureFields.length > 1) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (isInitials) handleAutoFillInitials(initialsData!)
                                else handleAutoFillSignatures(signatureData!)
                              }}
                              disabled={submitting}
                              className="px-3 py-1.5 bg-[hsl(var(--primary))] text-white text-[10px] rounded-md font-semibold hover:opacity-90 cursor-pointer shadow-lg"
                            >
                              {submitting ? '...' : t('signee.applyToEveryField')}
                            </button>
                          )}
                        </div>
                      </div>

                    ) : datePickerFieldId === field.id && isDate && isMine ? (
                      /* === DATE PICKER ACTIVE === */
                      <div className="w-full h-full flex items-center justify-center">
                        <input
                          type="date"
                          aria-label={t('signee.signingDate')}
                          className="text-[11px] border border-[hsl(var(--primary))] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                          onChange={(e) => {
                            if (e.target.value) {
                              handleDateField(field.id, e.target.value)
                            }
                          }}
                          onBlur={() => setDatePickerFieldId(null)}
                        />
                      </div>

                    ) : textInputFieldId === field.id && isText && isMine ? (
                      /* === TEXT INPUT ACTIVE === */
                      <div className="w-full h-full flex items-center">
                        <input
                          type="text"
                          aria-label={t('signee.fieldText')}
                          value={textInputValue}
                          onChange={(e) => setTextInputValue(e.target.value)}
                          maxLength={1000}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleTextFieldSubmit(field.id) }}
                          onBlur={() => { if (textInputValue.trim()) handleTextFieldSubmit(field.id); else setTextInputFieldId(null) }}
                          placeholder={t('signee.typeHere')}
                          className="w-full h-full text-[11px] font-medium text-black bg-white border-b border-[hsl(var(--primary))] outline-none px-1"
                        />
                      </div>

                    ) : (
                      /* === UNSIGNED / DEFAULT === */
                      <div
                        className={`w-full h-full rounded flex items-center justify-center text-xs font-medium transition-all ${
                          isCheckbox
                            ? isMine
                              ? 'border border-[hsl(var(--border))] bg-[hsl(var(--card))] cursor-pointer hover:border-[hsl(var(--primary))]'
                              : 'border border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 opacity-50'
                            : isDate || isText
                            ? isMine
                              ? 'border-b border-dashed border-[hsl(var(--border))] cursor-pointer hover:border-[hsl(var(--primary))]'
                              : 'border-b border-dashed border-gray-300 dark:border-gray-600 opacity-50'
                            : isCurrentNav && isMine
                            ? 'border-2 border-dashed border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/20 ring-4 ring-[hsl(var(--primary))]/30 animate-field-pulse cursor-pointer'
                            : isMine
                            ? 'border-2 border-dashed border-[hsl(var(--accent-coral))] bg-[hsl(var(--accent-coral))]/10 hover:bg-[hsl(var(--accent-coral))]/20 cursor-pointer'
                            : 'border-2 border-dashed border-gray-300 dark:border-gray-600 bg-gray-100/60 dark:bg-gray-800/30 opacity-40'
                        }`}
                        style={undefined}
                        onClick={activateUnsignedField}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            activateUnsignedField()
                          }
                        }}
                        role={isMine && !isSigned ? 'button' : undefined}
                        tabIndex={isMine && !isSigned ? 0 : undefined}
                        aria-label={isMine && !isSigned ? `${t(`editor.${field.field_type}`)}. ${t('signee.activateField')}` : undefined}
                      >
                        {isMine ? (
                          isCheckbox ? (
                            <div className="w-3.5 h-3.5 border border-gray-500 rounded-sm" />
                          ) : isDate ? (
                            <span className="text-[10px] text-black">{isCurrentNav ? t('signee.tapToAddDate') : t('editor.date')}</span>
                          ) : isText ? (
                            <span className="text-[10px] text-black">{isCurrentNav ? t('signee.tapToEnterText') : t('editor.text')}</span>
                          ) : (
                            <>
                              <span className="text-black">{fieldTypeIcons[field.field_type]}</span>
                              <span className="text-[10px] ml-1 text-black">
                                {isCurrentNav ? t('signee.tapToSign') : isInitials ? t('editor.initials') : t('signee.yourSignature')}
                              </span>
                            </>
                          )
                        ) : (
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {field.assigned_to_email.split('@')[0]}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </>
            )
          }}
        />
      </div>

      {/* Signature Modal */}
      <Modal isOpen={showSignatureModal} onClose={() => setShowSignatureModal(false)} title={t('signee.createYourSignature')} size="md">
        <SignaturePad
          onSave={handleSaveSignature}
          saveLabel={t('signee.saveSignature')}
          showApplyAll={myUnsignedSignatureFields.length > 0}
          onApplyToAll={handleAutoFillSignatures}
          applyAllLabel={t('signee.applyToAllCount').replace('{count}', String(myUnsignedSignatureFields.length))}
        />
      </Modal>

      {/* Initials Modal */}
      <Modal isOpen={showInitialsModal} onClose={() => setShowInitialsModal(false)} title={t('signee.addYourInitials')} size="md">
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          {t('signee.drawInitialsHint')}
        </p>
        <SignaturePad
          onSave={handleSaveInitials}
          saveLabel={t('signee.saveInitials')}
          showApplyAll={myUnsignedInitialsFields.length > 0}
          onApplyToAll={(data) => { setInitialsData(data); setShowInitialsModal(false); handleAutoFillInitials(data) }}
          applyAllLabel={t('signee.applyToAllCount').replace('{count}', String(myUnsignedInitialsFields.length))}
        />
      </Modal>

      {/* Audit Trail */}
      {documentId && (
        <AuditTrailModal isOpen={showAuditTrail} onClose={() => setShowAuditTrail(false)} documentId={documentId} signingToken={token} />
      )}
      {pdfErrorNotice}
      {actionError && (
        <div role="alert" className="fixed bottom-5 left-1/2 z-[70] flex w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 items-center justify-between gap-3 rounded-xl bg-[hsl(var(--destructive))] px-4 py-3 text-sm font-medium text-white shadow-xl">
          <span>{actionError}</span>
          {allMyUnsigned.length === 0 && (
            <button type="button" onClick={() => checkCompletion()} className="shrink-0 rounded-lg bg-white/15 px-3 py-2 hover:bg-white/25">
              {t('viewer.tryAgain')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
