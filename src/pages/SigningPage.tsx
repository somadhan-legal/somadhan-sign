import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  PenTool,
  Type,
  Calendar,
  SquareCheck,
  History,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import { useAuthStore } from '@/stores/authStore'
import PdfViewer from '@/components/PdfViewer'
import SignaturePad from '@/components/SignaturePad'
import AuditTrailModal from '@/components/AuditTrailModal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import { generateColor } from '@/lib/utils'

const fieldTypeIcons: Record<string, React.ReactNode> = {
  signature: <PenTool className="w-3 h-3" />,
  initials: <Type className="w-3 h-3" />,
  date: <Calendar className="w-3 h-3" />,
  text: <Type className="w-3 h-3" />,
  checkbox: <SquareCheck className="w-3 h-3" />,
}

export default function SigningPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const {
    currentDocument,
    signatureFields,
    placements,
    fetchDocument,
    addPlacement,
    addAuditEntry,
    updateDocumentStatus,
    loading,
  } = useDocumentStore()

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
  const hasLoggedView = useRef(false)

  useEffect(() => {
    if (id) fetchDocument(id)
  }, [id, fetchDocument])

  useEffect(() => {
    if (id && user && currentDocument && !hasLoggedView.current) {
      hasLoggedView.current = true
      addAuditEntry(id, 'Document Viewed', user.email || '', user.user_metadata?.full_name)
    }
  }, [id, user, currentDocument, addAuditEntry])

  const userEmail = user?.email || ''
  const userName = user?.user_metadata?.full_name || null

  const myFields = signatureFields.filter(
    (f) => f.document_id === id && f.assigned_to_email === userEmail
  )
  const mySignatureFields = myFields.filter((f) => f.field_type === 'signature')
  const myInitialsFields = myFields.filter((f) => f.field_type === 'initials')

  const signedFieldIds = new Set(placements.map((p) => p.field_id))

  const myUnsignedSigFields = mySignatureFields.filter((f) => !signedFieldIds.has(f.id))
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

    // If they were tapping a specific initials field, just set tapped so UI shows ADD THIS / ADD EVERYWHERE
    if (tappedFieldId) {
      // tappedFieldId is already set, the UI will now show buttons with the new initialsData
    }
  }

  const handleAutoFillInitials = async (data: string) => {
    if (!id || !user) return
    setSubmitting(true)

    for (const field of myUnsignedInitialsFields) {
      await addPlacement({
        document_id: id,
        field_id: field.id,
        signer_id: user.id,
        signer_email: userEmail,
        signature_id: data,
      })
    }

    await addAuditEntry(id, 'Initials Added', userEmail, userName, `Auto-filled ${myUnsignedInitialsFields.length} initials fields`)
    setSubmitting(false)
    checkCompletion()
  }

  const handleTapToSign = async (fieldId: string, customData?: string) => {
    const field = signatureFields.find((f) => f.id === fieldId)
    const isInitials = field?.field_type === 'initials'
    const dataToUse = customData || (isInitials ? initialsData : signatureData)

    if (!dataToUse || !id || !user) return
    setSubmitting(true)

    await addPlacement({
      document_id: id,
      field_id: fieldId,
      signer_id: user.id,
      signer_email: userEmail,
      signature_id: dataToUse,
    })

    await addAuditEntry(id, 'Field Signed', userEmail, userName, `Signed ${isInitials ? 'initials' : 'signature'} field on page ${field?.page_number}`)

    setTappedFieldId(null)
    setSubmitting(false)
    advanceToNext(fieldId)
    checkCompletion()
  }

  const handleDateField = async (fieldId: string, dateValue: string) => {
    const field = signatureFields.find((f) => f.id === fieldId)
    if (!id || !user || !dateValue) return
    setSubmitting(true)
    setDatePickerFieldId(null)

    await addPlacement({
      document_id: id,
      field_id: fieldId,
      signer_id: user.id,
      signer_email: userEmail,
      signature_id: dateValue,
    })

    await addAuditEntry(id, 'Date Filled', userEmail, userName, `Date ${dateValue} on page ${field?.page_number}`)
    setSubmitting(false)
    advanceToNext(fieldId)
    checkCompletion()
  }

  const handleCheckboxField = async (fieldId: string) => {
    const field = signatureFields.find((f) => f.id === fieldId)
    if (!id || !user) return
    setSubmitting(true)

    await addPlacement({
      document_id: id,
      field_id: fieldId,
      signer_id: user.id,
      signer_email: userEmail,
      signature_id: 'checked',
    })

    await addAuditEntry(id, 'Checkbox Checked', userEmail, userName, `Checkbox on page ${field?.page_number}`)
    setSubmitting(false)
    advanceToNext(fieldId)
    checkCompletion()
  }

  const handleTextFieldSubmit = async (fieldId: string) => {
    const field = signatureFields.find((f) => f.id === fieldId)
    if (!id || !user || !textInputValue.trim()) return
    setSubmitting(true)
    setTextInputFieldId(null)

    await addPlacement({
      document_id: id,
      field_id: fieldId,
      signer_id: user.id,
      signer_email: userEmail,
      signature_id: textInputValue.trim(),
    })

    await addAuditEntry(id, 'Text Entered', userEmail, userName, `Text on page ${field?.page_number}`)
    setTextInputValue('')
    setSubmitting(false)
    advanceToNext(fieldId)
    checkCompletion()
  }

  const advanceToNext = (fieldId: string) => {
    const nextUnsignedIdx = allMyUnsigned.findIndex((f) => f.id !== fieldId && !signedFieldIds.has(f.id))
    if (nextUnsignedIdx >= 0) {
      navigateToField(nextUnsignedIdx)
    }
  }

  const checkCompletion = async () => {
    if (!id) return
    const allFields = signatureFields.filter((f) => f.document_id === id)
    const totalSigned = placements.length + 1
    if (totalSigned >= allFields.length) {
      await addAuditEntry(id, 'Document Completed', userEmail, userName)
      await updateDocumentStatus(id, 'completed')
    }
  }

  const handleFinishSigning = async () => {
    if (!id) return
    await addAuditEntry(id, 'Document Signed', userEmail, userName)
    const allFields = signatureFields.filter((f) => f.document_id === id)
    if (placements.length >= allFields.length) {
      await updateDocumentStatus(id, 'completed')
    }
    navigate('/dashboard')
  }

  const getPageFields = (pageNumber: number) => signatureFields.filter(
    (f) => f.document_id === id && f.page_number === pageNumber
  )

  if (loading && !currentDocument) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!currentDocument) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[hsl(var(--muted-foreground))]">Document not found</p>
      </div>
    )
  }

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-80 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-y-auto flex flex-col">
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg truncate">{currentDocument.title}</h2>
            <button
              onClick={() => setShowAuditTrail(true)}
              className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] cursor-pointer"
              title="Audit Trail"
            >
              <History className="w-4 h-4" />
            </button>
          </div>
          <Badge
            variant={
              currentDocument.status === 'completed'
                ? 'success'
                : currentDocument.status === 'pending'
                ? 'warning'
                : 'outline'
            }
            className="mt-2"
          >
            {currentDocument.status.charAt(0).toUpperCase() + currentDocument.status.slice(1)}
          </Badge>
        </div>

        {/* Signature Setup */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h3 className="font-medium text-sm mb-3">Your Signature</h3>
          {signatureData ? (
            <div className="space-y-2">
              <div className="border border-[hsl(var(--border))] rounded-lg p-3 bg-[hsl(var(--muted))]">
                <img src={signatureData} alt="Your signature" className="max-h-16 mx-auto" />
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowSignatureModal(true)}>
                Change Signature
              </Button>
            </div>
          ) : (
            <Button className="w-full" onClick={() => setShowSignatureModal(true)}>
              <PenTool className="w-4 h-4 mr-2" />
              Create Signature
            </Button>
          )}
        </div>

        {/* Initials Setup (only if there are initials fields) */}
        {myInitialsFields.length > 0 && (
          <div className="p-4 border-b border-[hsl(var(--border))]">
            <h3 className="font-medium text-sm mb-3">
              Your Initials
              <span className="text-xs text-[hsl(var(--muted-foreground))] ml-1">
                ({myInitialsFields.length} places)
              </span>
            </h3>
            {initialsData ? (
              <div className="space-y-2">
                <div className="border border-[hsl(var(--border))] rounded-lg p-3 bg-[hsl(var(--muted))]">
                  <img src={initialsData} alt="Your initials" className="max-h-12 mx-auto" />
                </div>
                {myUnsignedInitialsFields.length === 0 ? (
                  <p className="text-xs text-green-600 text-center">All initials fields filled</p>
                ) : (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => setShowInitialsModal(true)}>
                    Change Initials
                  </Button>
                )}
              </div>
            ) : (
              <Button variant="secondary" className="w-full" onClick={() => setShowInitialsModal(true)}>
                <Type className="w-4 h-4 mr-2" />
                Add Initials (auto-fills {myUnsignedInitialsFields.length} places)
              </Button>
            )}
          </div>
        )}

        {/* Fields Progress */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h3 className="font-medium text-sm mb-3">
            Your Fields ({mySignedFields.length}/{myFields.length} signed)
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

        {/* Navigation & Signing Actions */}
        <div className="p-4 mt-auto sticky bottom-0 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] space-y-2">
          {signatureData && allMyUnsigned.length > 0 && (
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
                  Field {currentFieldIndex + 1} of {allMyUnsigned.length}
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
                Tap a signature field on the PDF to sign it
              </p>
            </div>
          )}

          {!signatureData && myUnsignedSigFields.length > 0 && (
            <p className="text-xs text-center text-amber-600">
              Create your signature first to start signing
            </p>
          )}

          {allMyUnsigned.length === 0 && myFields.length > 0 && (
            <div className="text-center">
              <CheckCircle2 className="w-10 h-10 mx-auto text-green-500 mb-2" />
              <p className="text-sm font-medium text-green-700 mb-3">
                All your fields are signed!
              </p>
              <Button className="w-full" onClick={handleFinishSigning}>
                Finish & Return
              </Button>
            </div>
          )}

          {myFields.length === 0 && (
            <p className="text-sm text-center text-[hsl(var(--muted-foreground))]">
              No signature fields assigned to you.
            </p>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-50 p-6 flex justify-center">
        <PdfViewer
          fileUrl={currentDocument.original_pdf_url}
          renderPageOverlay={(pageNumber) => {
            const pageFields = getPageFields(pageNumber)
            return (
            <>
              {pageFields.map((field) => {
                const isMine = field.assigned_to_email === userEmail
                const isSigned = signedFieldIds.has(field.id)
                const isCurrentNav = currentField?.id === field.id
                const isTapped = tappedFieldId === field.id
                const isInitials = field.field_type === 'initials'
                const isDate = field.field_type === 'date'
                const isCheckbox = field.field_type === 'checkbox'
                const isText = field.field_type === 'text'
                const isSignatureType = field.field_type === 'signature' || isInitials

                const placement = placements.find((p) => p.field_id === field.id)
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
                    {/* === SIGNED STATES === */}
                    {isSigned && isSignatureType && placement ? (
                      <div className="w-full h-full flex items-center justify-center overflow-hidden">
                        <img src={placement.signature_id} alt="Signed" className="max-w-full max-h-full object-contain" />
                      </div>
                    ) : isSigned && isDate && placement ? (
                      <div className="w-full h-full flex items-end">
                        <span className="text-sm font-bold text-black leading-tight">{placement.signature_id}</span>
                      </div>
                    ) : isSigned && isCheckbox && placement ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-[70%] h-[70%] text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    ) : isSigned && isText && placement ? (
                      <div className="w-full h-full flex items-end">
                        <span className="text-sm font-bold text-black leading-tight">{placement.signature_id}</span>
                      </div>

                    ) : isTapped && isSignatureType && sigData ? (
                      /* === TAPPED SIGNATURE/INITIALS === */
                      <div className="w-full h-full rounded border-2 border-[hsl(var(--primary))] bg-[hsl(var(--card))] flex flex-col items-center justify-center gap-1 shadow-lg">
                        <img src={sigData} alt="Preview" className="max-w-[80%] max-h-[50%] object-contain opacity-60" />
                        {isInitials && myUnsignedInitialsFields.length > 1 ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleTapToSign(field.id)}
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
                          if (!isMine || isSigned) return
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
          Your initials will be automatically placed in all {myUnsignedInitialsFields.length} initials fields.
        </p>
        <SignaturePad onSave={handleSaveInitials} onCancel={() => setShowInitialsModal(false)} />
      </Modal>

      {/* Audit Trail */}
      {id && (
        <AuditTrailModal isOpen={showAuditTrail} onClose={() => setShowAuditTrail(false)} documentId={id} />
      )}
    </div>
  )
}
