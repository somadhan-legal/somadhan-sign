import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams } from 'react-router-dom'
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
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import PdfViewer from '@/components/PdfViewer'
import SignaturePad from '@/components/SignaturePad'
import AuditTrailModal from '@/components/AuditTrailModal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { generateColor } from '@/lib/utils'
import { generateAuditPdf } from '@/lib/auditPdf'
import { generateSignedPdf, type SignedField } from '@/lib/signedPdf'
import { supabase } from '@/lib/supabase'
import SomadhanLogoLight from '@/assets/sign_Somadhan_light.svg'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'
import { useThemeStore } from '@/stores/themeStore'
import { useLanguageStore } from '@/stores/languageStore'
import { Moon, Sun, HelpCircle } from 'lucide-react'

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
  }
}

export default function InviteSigningPage() {
  const { token } = useParams<{ token: string }>()
  const { lang, toggle: toggleLang, t } = useLanguageStore()
  const {
    signatureFields,
    placements,
    fetchSignatureFields,
    fetchPlacements,
    fetchSignerByToken,
    updateSignerStatus,
    updateDocumentStatus,
    fetchSigners,
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
  const [datePickerFieldId, setDatePickerFieldId] = useState<string | null>(null)
  const [textInputFieldId, setTextInputFieldId] = useState<string | null>(null)
  const [textInputValue, setTextInputValue] = useState('')
  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const [finished, setFinished] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [auditPdfUrl, setAuditPdfUrl] = useState<string | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const hasLoggedView = useRef(false)
  const { isDark, toggle } = useThemeStore()

  useEffect(() => {
    if (!token) return
    const load = async () => {
      setPageLoading(true)
      const data = await fetchSignerByToken(token)
      if (!data) {
        setError('The document you\'re looking for was not found. It may have been deleted or the link is invalid.')
        setPageLoading(false)
        return
      }
      setSignerData(data as unknown as SignerData)
      await fetchSignatureFields(data.document_id)
      await fetchPlacements(data.document_id)

      // If signer already signed, show finished state
      if (data.status === 'signed') {
        setFinished(true)
        setPageLoading(false)
        return
      }

      if (data.status === 'pending') {
        await updateSignerStatus(data.id, 'viewed')
      }

      setPageLoading(false)
    }
    load()
  }, [token, fetchSignerByToken, fetchSignatureFields, fetchPlacements, updateSignerStatus])

  useEffect(() => {
    if (signerData && !hasLoggedView.current) {
      hasLoggedView.current = true
      addAuditEntry(signerData.document_id, 'Document Viewed', signerData.signer_email, signerData.signer_name)
    }
  }, [signerData, addAuditEntry])

  const userEmail = signerData?.signer_email || ''
  const userName = signerData?.signer_name || null
  const documentId = signerData?.document_id || ''

  const myFields = signatureFields.filter(
    (f) => f.document_id === documentId && f.assigned_to_email === userEmail
  )
  const myInitialsFields = myFields.filter((f) => f.field_type === 'initials')
  const signedFieldIds = new Set(placements.map((p) => p.field_id))
  const myUnsignedInitialsFields = myInitialsFields.filter((f) => !signedFieldIds.has(f.id))
  const mySignedFields = myFields.filter((f) => signedFieldIds.has(f.id))
  const allMyUnsigned = myFields.filter((f) => !signedFieldIds.has(f.id))
  const currentField = allMyUnsigned[currentFieldIndex] || null

  const navigateToField = useCallback(
    (index: number) => {
      if (index >= 0 && index < allMyUnsigned.length) {
        setCurrentFieldIndex(index)
      }
    },
    [allMyUnsigned]
  )

  const handleSaveSignature = (dataUrl: string) => {
    setSignatureData(dataUrl)
    setShowSignatureModal(false)
  }

  const handleSaveInitials = (dataUrl: string) => {
    setInitialsData(dataUrl)
    setShowInitialsModal(false)
    // If tapping a specific field, just set data — UI will show ADD THIS / ADD EVERYWHERE
    // If drawing from sidebar (no tappedFieldId), also just set data and let user choose
  }

  const handleAutoFillInitials = async (data: string) => {
    if (!documentId || !signerData) return
    setSubmitting(true)
    for (const field of myUnsignedInitialsFields) {
      await addPlacement({
        document_id: documentId,
        field_id: field.id,
        signer_id: null,
        signer_email: userEmail,
        signature_id: data,
      })
    }
    await addAuditEntry(documentId, 'Initials Added', userEmail, userName, `Auto-filled ${myUnsignedInitialsFields.length} initials fields`)
    setSubmitting(false)
    await checkCompletion()
  }

  const handleTapToSign = async (fieldId: string) => {
    const field = signatureFields.find((f) => f.id === fieldId)
    const isInitials = field?.field_type === 'initials'
    const dataToUse = isInitials ? initialsData : signatureData

    if (!dataToUse || !documentId || !signerData) return
    setSubmitting(true)

    await addPlacement({
      document_id: documentId,
      field_id: fieldId,
      signer_id: null,
      signer_email: userEmail,
      signature_id: dataToUse,
    })

    await addAuditEntry(documentId, isInitials ? 'Initials Added' : 'Signature Applied', userEmail, userName, `${isInitials ? 'Initials' : 'Signature'} placed on page ${field?.page_number}`)

    setTappedFieldId(null)
    setSubmitting(false)

    // Re-fetch placements to find accurate next unsigned
    await fetchPlacements(documentId)
    const latestPlacements = useDocumentStore.getState().placements
    const latestSignedIds = new Set(latestPlacements.map((p) => p.field_id))
    const remainingUnsigned = myFields.filter((f) => !latestSignedIds.has(f.id) && f.field_type === 'signature')
    if (remainingUnsigned.length > 0) {
      const nextField = remainingUnsigned[0]
      const nextIdx = allMyUnsigned.findIndex((f) => f.id === nextField.id)
      if (nextIdx >= 0) navigateToField(nextIdx)
    }

    await checkCompletion()
  }

  const handleDateField = async (fieldId: string, dateValue: string) => {
    if (!documentId || !signerData || !dateValue) return
    setSubmitting(true)
    setDatePickerFieldId(null)
    await addPlacement({
      document_id: documentId,
      field_id: fieldId,
      signer_id: null,
      signer_email: userEmail,
      signature_id: dateValue,
    })
    const field = signatureFields.find((f) => f.id === fieldId)
    await addAuditEntry(documentId, 'Date Filled', userEmail, userName, `Date ${dateValue} on page ${field?.page_number}`)
    setSubmitting(false)
    await checkCompletion()
  }

  const handleCheckboxField = async (fieldId: string) => {
    if (!documentId || !signerData) return
    setSubmitting(true)
    await addPlacement({
      document_id: documentId,
      field_id: fieldId,
      signer_id: null,
      signer_email: userEmail,
      signature_id: 'checkbox:checked',
    })
    const field = signatureFields.find((f) => f.id === fieldId)
    await addAuditEntry(documentId, 'Checkbox Checked', userEmail, userName, `Checkbox on page ${field?.page_number}`)
    setSubmitting(false)
    await checkCompletion()
  }

  const handleTextFieldSubmit = async (fieldId: string) => {
    if (!documentId || !signerData || !textInputValue.trim()) return
    setSubmitting(true)
    setTextInputFieldId(null)
    await addPlacement({
      document_id: documentId,
      field_id: fieldId,
      signer_id: null,
      signer_email: userEmail,
      signature_id: textInputValue.trim(),
    })
    const field = signatureFields.find((f) => f.id === fieldId)
    await addAuditEntry(documentId, 'Text Entered', userEmail, userName, `Text on page ${field?.page_number}`)
    setTextInputValue('')
    setSubmitting(false)
    await checkCompletion()
  }

  const checkCompletion = async () => {
    if (!documentId || !signerData) return
    // Re-fetch placements to get accurate count
    await fetchPlacements(documentId)
    const latestPlacements = useDocumentStore.getState().placements
    const latestSignedIds = new Set(latestPlacements.map((p) => p.field_id))
    const remaining = myFields.filter((f) => !latestSignedIds.has(f.id))
    if (remaining.length === 0) {
      await updateSignerStatus(signerData.id, 'signed')
      await addAuditEntry(documentId, 'All Fields Signed', userEmail, userName)
      
      // Check if ALL signers have signed, then update document status
      await fetchSigners(documentId)
      const allSigners = useDocumentStore.getState().signers
      const allDone = allSigners.length > 0 && allSigners.every(s => s.status === 'signed' || s.id === signerData.id)
      if (allDone) {
        await updateDocumentStatus(documentId, 'completed')
      }
      
      setFinished(true)
    }
  }

  const getPageFields = (pageNumber: number) => signatureFields.filter(
    (f) => f.document_id === documentId && f.page_number === pageNumber
  )

  if (pageLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))]">
        <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 mb-6" />
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[hsl(var(--muted-foreground))]">{t('signee.loadingDoc')}</p>
        </div>
      </div>
    )
  }

  if (error || !signerData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[hsl(var(--background))]">
        <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14 mb-6" />
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
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

  const fetchSignedFields = async (): Promise<SignedField[]> => {
    if (!documentId) return []
    
    // Fetch placements
    const { data: placementsData, error: pErr } = await supabase
      .from('signature_placements')
      .select('*')
      .eq('document_id', documentId)
    
    if (pErr) { console.error('Error fetching placements:', pErr); return [] }
    if (!placementsData || placementsData.length === 0) return []

    // Fetch corresponding fields
    const fieldIds = placementsData.map(p => p.field_id)
    const { data: fieldsData, error: fErr } = await supabase
      .from('signature_fields')
      .select('*')
      .in('id', fieldIds)

    if (fErr) { console.error('Error fetching fields:', fErr); return [] }
    if (!fieldsData) return []

    const fieldsMap = new Map(fieldsData.map(f => [f.id, f]))

    return placementsData
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
    // Fetch document fresh from Supabase to avoid stale data
    const docId = signerData!.document_id
    const { data: freshDoc } = await supabase
      .from('documents')
      .select('*')
      .eq('id', docId)
      .single()

    const pdfUrl = freshDoc?.original_pdf_url || signerData!.documents.original_pdf_url
    const title = freshDoc?.title || signerData!.documents.title

    // Step 1: Generate signed PDF with overlays
    const signedFields = await fetchSignedFields()
    let basePdfUrl = pdfUrl
    if (signedFields.length > 0) {
      const signedBlob = await generateSignedPdf(pdfUrl, signedFields)
      basePdfUrl = URL.createObjectURL(signedBlob)
    }

    // Step 2: Fetch audit trail for THIS document ONLY using the exact document ID
    console.log('[InviteSigningPage] Fetching audit trail for doc_id:', docId, 'title:', title)
    const { data: auditData, error: auditErr } = await supabase
      .from('audit_trail')
      .select('*')
      .eq('document_id', docId)
      .order('created_at', { ascending: true })

    if (auditErr) console.error('[InviteSigningPage] Audit trail error:', auditErr)
    console.log('[InviteSigningPage] Audit entries returned:', auditData?.length,
      'doc_ids in result:', [...new Set(auditData?.map(e => e.document_id) || [])])
    console.log('[InviteSigningPage] Full audit data:', JSON.stringify(auditData?.map(e => ({ 
      action: e.action, 
      doc_id: e.document_id, 
      user: e.user_email 
    })), null, 2))

    // EXTRA SAFETY: Filter client-side in case Supabase RLS returns extra rows
    const filteredAudit = (auditData || []).filter(e => e.document_id === docId)
    console.log('[InviteSigningPage] After client-side filter:', filteredAudit.length)
    console.log('[InviteSigningPage] Filtered audit data:', JSON.stringify(filteredAudit.map(e => ({ 
      action: e.action, 
      doc_id: e.document_id, 
      user: e.user_email 
    })), null, 2))

    // Step 3: Append audit trail pages to the signed PDF
    const finalBlob = await generateAuditPdf(basePdfUrl, filteredAudit, title)

    // Cleanup temp blob URL
    if (basePdfUrl !== pdfUrl) URL.revokeObjectURL(basePdfUrl)

    return finalBlob
  }

  const handleViewDocument = async () => {
    if (!signerData || !documentId) return
    setGeneratingPdf(true)
    try {
      const blob = await buildSignedAuditPdf()
      const url = URL.createObjectURL(blob)
      setAuditPdfUrl(url)
      setShowPreview(true)
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Error generating document. Please try again.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!signerData || !documentId) return
    try {
      const blob = await buildSignedAuditPdf()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${signerData.documents.title} - Signed.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating signed PDF:', err)
      alert('Error generating PDF. Please try again.')
    }
  }


  if (finished && showPreview && auditPdfUrl) {
    return (
      <div className="flex flex-col h-screen bg-[hsl(var(--background))]">
        <div className="flex items-center justify-between px-6 py-3 bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] shadow-sm">
          <div className="flex items-center gap-3">
            <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14" />
            <div className="w-px h-6 bg-[hsl(var(--border))]" />
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold">{signerData?.documents.title} — Signed</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
              <Download className="w-4 h-4 mr-1" />
              {t('signee.downloadPdf')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowPreview(false)}>
              {t('signee.close')}
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-auto flex justify-center p-6">
          <PdfViewer
            fileUrl={auditPdfUrl}
          />
        </div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="min-h-screen flex flex-col bg-[hsl(var(--background))]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))]">
          <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14" />
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={toggleLang} title={lang === 'en' ? 'বাংলা' : 'English'}>
              <span className="text-xs font-bold">{lang === 'en' ? 'বাং' : 'EN'}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} title={isDark ? t('nav.lightMode') : t('nav.darkMode')}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md p-8">
            <div className="w-20 h-20 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-[hsl(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[hsl(var(--primary))] mb-3">{t('signee.signingComplete')}</h2>
            <p className="text-[hsl(var(--muted-foreground))] mb-8">
              {t('signee.thankYou')} <strong className="text-[hsl(var(--foreground))]">{userName || userEmail}</strong>. {t('signee.allFieldsSigned')}
            </p>
            <div className="space-y-3">
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
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-80 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-y-auto flex flex-col">
        <div className="p-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
          <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14" />
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleLang} title={lang === 'en' ? 'বাংলা' : 'English'}>
              <span className="text-xs font-bold">{lang === 'en' ? 'বাং' : 'EN'}</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={toggle} title={isDark ? t('nav.lightMode') : t('nav.darkMode')}>
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg truncate">{signerData.documents.title}</h2>
            <button
              onClick={() => setShowAuditTrail(true)}
              className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] cursor-pointer"
              title="Audit Trail"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="warning">{t('signee.signingAs')}</Badge>
            <span className="text-sm text-[hsl(var(--muted-foreground))] truncate">{userEmail}</span>
          </div>
        </div>

        {/* Signature Setup */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h3 className="font-medium text-sm mb-3">{t('signee.yourSignature')}</h3>
          {signatureData ? (
            <div className="space-y-2">
              <div className="border border-[hsl(var(--border))] rounded-lg p-3 bg-[hsl(var(--muted))]">
                <img src={signatureData} alt="Your signature" className="max-h-16 mx-auto" />
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSignatureModal(true)}>
                {t('signee.changeSignature')}
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={() => setShowSignatureModal(true)}>
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
                <div className="border border-[hsl(var(--border))] rounded-lg p-3 bg-[hsl(var(--muted))]">
                  <img src={initialsData} alt="Your initials" className="max-h-12 mx-auto" />
                </div>
                {myUnsignedInitialsFields.length === 0 ? (
                  <p className="text-xs text-green-600 text-center">{t('signee.allInitialsFilled')}</p>
                ) : (
                  <div className="space-y-1.5">
                    <Button size="sm" className="w-full" onClick={() => handleAutoFillInitials(initialsData)}>
                      {t('signee.applyToAll')} ({myUnsignedInitialsFields.length})
                    </Button>
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setShowInitialsModal(true)}>
                      {t('signee.changeInitials')}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setShowInitialsModal(true)}>
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
          <div className="w-full h-2 bg-[hsl(var(--muted))] rounded-full mb-3">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{
                width: `${myFields.length > 0 ? (mySignedFields.length / myFields.length) * 100 : 0}%`,
              }}
            />
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {myFields.map((field, index) => {
              const isSigned = signedFieldIds.has(field.id)
              const icon = fieldTypeIcons[field.field_type] || fieldTypeIcons.signature
              return (
                <button
                  key={field.id}
                  className={`flex items-center gap-2 w-full p-2 rounded-lg text-left text-sm transition-colors cursor-pointer ${
                    isSigned
                      ? 'bg-green-50 text-green-700'
                      : currentField?.id === field.id
                      ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]'
                      : 'hover:bg-[hsl(var(--muted))]'
                  }`}
                  onClick={() => {
                    if (!isSigned) {
                      const unsignedIdx = allMyUnsigned.findIndex((f) => f.id === field.id)
                      if (unsignedIdx >= 0) setCurrentFieldIndex(unsignedIdx)
                    }
                  }}
                >
                  {isSigned ? (
                    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-[hsl(var(--border))] shrink-0" />
                  )}
                  <span className="flex items-center gap-1">
                    {icon}
                    {field.field_type === 'initials' ? 'Initials' : field.field_type === 'signature' ? 'Sign' : field.field_type.charAt(0).toUpperCase() + field.field_type.slice(1)} {index + 1} — Pg {field.page_number}
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
                  onClick={() => navigateToField(currentFieldIndex + 1)}
                  disabled={currentFieldIndex >= allMyUnsigned.length - 1}
                  className="h-9 w-9"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-center text-[hsl(var(--muted-foreground))]">
                {lang === 'bn' ? 'পূরণ করতে PDF-এ যেকোনো ক্ষেত্রে ট্যাপ করুন' : 'Tap any field on the PDF to fill it'}
              </p>
            </div>
          )}

          {allMyUnsigned.length === 0 && myFields.length > 0 && (
            <div className="text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-2" />
              <p className="text-sm font-medium text-green-700">
                {lang === 'bn' ? 'আপনার সব ক্ষেত্র স্বাক্ষরিত হয়েছে!' : 'All your fields are signed!'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6 flex justify-center">
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

                return (
                  <div
                    key={field.id}
                    className={`absolute transition-all ${isCurrentNav ? 'z-20' : 'z-10'}`}
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      width: `${field.width}%`,
                      height: `${field.height}%`,
                    }}
                  >
                    {/* === SIGNED STATES — no borders, raw content === */}
                    {isSigned && placement && (isSignatureType || placement.signature_id.startsWith('data:image')) ? (
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <img src={placement.signature_id} alt="Signed" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : isSigned && placement && (isDate || placement.signature_id.startsWith('date:')) ? (
                      <div className="w-full h-full flex items-end">
                        <span className="text-sm font-bold text-black leading-tight">{placement.signature_id.replace('date:', '')}</span>
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
                      /* === TAPPED SIGNATURE/INITIALS — confirm buttons === */
                      <div className="w-full h-full rounded border-2 border-[hsl(var(--primary))] bg-[hsl(var(--card))] flex flex-col items-center justify-center gap-1 shadow-lg">
                        <img src={sigData} alt="Preview" className="max-w-[80%] max-h-[50%] object-contain opacity-60" />
                        {isInitials && myUnsignedInitialsFields.length > 1 ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => { handleTapToSign(field.id); }}
                              disabled={submitting}
                              className="px-2.5 py-1 border border-[hsl(var(--primary))] text-[hsl(var(--primary))] text-[9px] rounded-md font-semibold hover:bg-[hsl(var(--primary))]/10 cursor-pointer"
                            >
                              {submitting ? '...' : 'ADD THIS'}
                            </button>
                            <button
                              onClick={() => handleAutoFillInitials(initialsData!)}
                              disabled={submitting}
                              className="px-2.5 py-1 bg-[hsl(var(--primary))] text-white text-[9px] rounded-md font-semibold hover:opacity-90 cursor-pointer"
                            >
                              {submitting ? '...' : 'ADD EVERYWHERE'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleTapToSign(field.id)}
                            disabled={submitting}
                            className="px-3 py-1 bg-[hsl(var(--primary))] text-white text-[10px] rounded-md font-medium hover:opacity-90 cursor-pointer"
                          >
                            {submitting ? '...' : 'Confirm Sign'}
                          </button>
                        )}
                      </div>

                    ) : datePickerFieldId === field.id && isDate && isMine ? (
                      /* === DATE PICKER ACTIVE === */
                      <div className="w-full h-full flex items-center justify-center">
                        <input
                          type="date"
                          autoFocus
                          className="text-[11px] border border-[hsl(var(--primary))] rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-[hsl(var(--primary))]"
                          onChange={(e) => {
                            if (e.target.value) {
                              const d = new Date(e.target.value + 'T00:00:00')
                              const formatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
                              handleDateField(field.id, formatted)
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
                          autoFocus
                          value={textInputValue}
                          onChange={(e) => setTextInputValue(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleTextFieldSubmit(field.id) }}
                          onBlur={() => { if (textInputValue.trim()) handleTextFieldSubmit(field.id); else setTextInputFieldId(null) }}
                          placeholder="Type here..."
                          className="w-full h-full text-[11px] font-medium text-gray-800 bg-transparent border-b border-[hsl(var(--primary))] outline-none px-1"
                        />
                      </div>

                    ) : (
                      /* === UNSIGNED / DEFAULT === */
                      <div
                        className={`w-full h-full rounded flex items-center justify-center text-xs font-medium transition-all ${
                          isCheckbox
                            ? isMine
                              ? 'border border-gray-400 bg-[hsl(var(--card))] cursor-pointer hover:border-blue-500'
                              : 'border border-gray-300 bg-gray-50'
                            : isDate || isText
                            ? isMine
                              ? 'border-b border-dashed border-gray-400 cursor-pointer hover:border-blue-500'
                              : 'border-b border-dashed border-gray-300'
                            : isCurrentNav && isMine
                            ? 'border-2 border-dashed border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/20 ring-4 ring-[hsl(var(--primary))]/30 animate-pulse cursor-pointer'
                            : isMine
                            ? 'border-2 border-dashed border-amber-400 bg-amber-50/80 hover:bg-amber-100 cursor-pointer'
                            : 'border-2 border-dashed border-gray-300 bg-gray-50/80'
                        }`}
                        style={
                          !isMine && isSignatureType
                            ? { borderColor: generateColor(field.assigned_to_email), backgroundColor: `${generateColor(field.assigned_to_email)}15` }
                            : undefined
                        }
                        onClick={() => {
                          if (!isMine || isSigned || submitting) return
                          if (isCheckbox) {
                            handleCheckboxField(field.id)
                          } else if (isDate) {
                            setDatePickerFieldId(field.id)
                          } else if (isText) {
                            setTextInputFieldId(field.id)
                            setTextInputValue('')
                          } else if (isInitials && initialsData) {
                            setTappedFieldId(field.id)
                          } else if (isInitials && !initialsData) {
                            setTappedFieldId(field.id)
                            setShowInitialsModal(true)
                          } else if (!isInitials && signatureData) {
                            setTappedFieldId(field.id)
                          } else if (!isInitials && !signatureData) {
                            setTappedFieldId(field.id)
                            setShowSignatureModal(true)
                          }
                        }}
                      >
                        {isMine ? (
                          isCheckbox ? (
                            <div className="w-3.5 h-3.5 border border-gray-400 rounded-sm" />
                          ) : isDate ? (
                            <span className="text-[10px] text-gray-400">{isCurrentNav ? 'Tap to add date' : 'Date'}</span>
                          ) : isText ? (
                            <span className="text-[10px] text-gray-400">{isCurrentNav ? 'Tap to enter text' : 'Text'}</span>
                          ) : (
                            <>
                              {fieldTypeIcons[field.field_type]}
                              <span className="text-[10px] ml-1">
                                {isCurrentNav ? 'Tap to sign' : isInitials ? 'Initials' : 'Your signature'}
                              </span>
                            </>
                          )
                        ) : (
                          <span className="text-[10px] opacity-60" style={{ color: generateColor(field.assigned_to_email) }}>
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
      <Modal isOpen={showSignatureModal} onClose={() => setShowSignatureModal(false)} title="Create Your Signature" size="md">
        <SignaturePad onSave={handleSaveSignature} onCancel={() => setShowSignatureModal(false)} />
      </Modal>

      {/* Initials Modal */}
      <Modal isOpen={showInitialsModal} onClose={() => setShowInitialsModal(false)} title="Add Your Initials" size="md">
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
          Draw your initials below. You can apply to individual fields or all at once.
        </p>
        <SignaturePad onSave={handleSaveInitials} onCancel={() => setShowInitialsModal(false)} />
      </Modal>

      {/* Audit Trail */}
      {documentId && (
        <AuditTrailModal isOpen={showAuditTrail} onClose={() => setShowAuditTrail(false)} documentId={documentId} />
      )}
    </div>
  )
}
