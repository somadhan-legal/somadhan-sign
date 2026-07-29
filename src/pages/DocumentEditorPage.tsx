import { useEffect, useState, useCallback, useRef } from 'react'
import { useBlocker, useParams, useNavigate } from 'react-router'
import Draggable from 'react-draggable'
import {
  Save,
  Send,
  UserPlus,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  X,
  PenTool,
  Type,
  Calendar,
  SquareCheck,
  CheckCircle2,
  HelpCircle,
  PanelLeftClose,
  PanelLeftOpen,
  MousePointer2,
  Trash2,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import PdfViewer from '@/components/PdfViewer'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import InlineConfirm from '@/components/ui/InlineConfirm'
import Modal from '@/components/ui/Modal'
import {
  adjustFieldWithKeyboard,
  getFieldPlacement,
  getOverlappingField,
  type FieldBounds,
  type FieldType,
} from '@/lib/fieldPlacement'
import { getFieldDraftFingerprint } from '@/lib/fieldDraft'
import { useResponsivePanel, usesOverlayWorkspacePanels } from '@/hooks/useResponsivePanel'
import DocumentLoadFailureState from '@/components/DocumentLoadFailureState'

const SIGNER_COLORS = [
  '#3B82F6', '#F59E0B', '#10B981', '#EF4444',
  '#0D9488', '#EC4899', '#06B6D4', '#F97316',
]


const fieldTypeIcons: Record<FieldType, React.ReactNode> = {
  signature: <PenTool className="w-4 h-4" />,
  initials: <Type className="w-4 h-4" />,
  date: <Calendar className="w-4 h-4" />,
  text: <Type className="w-4 h-4" />,
  checkbox: <SquareCheck className="w-4 h-4" />,
}

const fieldTypeOptions: { type: FieldType }[] = [
  { type: 'signature' },
  { type: 'initials' },
  { type: 'date' },
  { type: 'checkbox' },
  { type: 'text' },
]

function DraggableField({ children, onStart, onStop, bounds, style, className, fieldId }: {
  children: React.ReactNode
  onStart?: () => void
  onStop: (e: unknown, data: { x: number; y: number }) => void
  bounds?: string
  style?: React.CSSProperties
  className?: string
  fieldId?: string
}) {
  const nodeRef = useRef<HTMLDivElement>(null)
  return (
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      position={{ x: 0, y: 0 }}
      onStart={onStart}
      onStop={onStop}
      bounds={bounds}
    >
      <div ref={nodeRef} style={{ ...style, touchAction: 'none' }} className={className} data-field-id={fieldId}>{children}</div>
    </Draggable>
  )
}

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { lang, t } = useLanguageStore()
  const {
    currentDocument,
    signatureFields,
    signers,
    placements,
    fetchDocument,
    documentLoadFailure,
    addSignatureField,
    updateSignatureField,
    removeSignatureField,
    saveSignatureFields,
    addSigner,
    updateSigner,
    removeSigner,
    fetchSigners,
    sendForSigning,
    addAuditEntry,
    loading,
  } = useDocumentStore()

  const [showSignerModal, setShowSignerModal] = useState(false)
  const [editingSignerId, setEditingSignerId] = useState<string | null>(null)
  const [signerFirstName, setSignerFirstName] = useState('')
  const [signerLastName, setSignerLastName] = useState('')
  const [signerEmail, setSignerEmail] = useState('')
  const [signerFormError, setSignerFormError] = useState('')
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [savingDraft, setSavingDraft] = useState(false)
  const [draftSaveState, setDraftSaveState] = useState<'idle' | 'saved' | 'error'>('idle')
  const [readyFieldDraftDocumentId, setReadyFieldDraftDocumentId] = useState<string | null>(null)
  const [savingSigner, setSavingSigner] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType | null>(null)
  const [selectedSignerIdx, setSelectedSignerIdx] = useState(0)
  const [savedToast, setSavedToast] = useState(false)
  const [sentToast, setSentToast] = useState(false)
  const [sendSummary, setSendSummary] = useState('')
  const [ccEmails, setCcEmails] = useState('')
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [sendMessage, setSendMessage] = useState(() => t('editor.defaultSendMessage'))
  const [sendFormError, setSendFormError] = useState('')
  const [countdown, setCountdown] = useState(5)
  const [placementPreview, setPlacementPreview] = useState<{
    pageNumber: number
    x: number
    y: number
    width: number
    height: number
  } | null>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const signerListRef = useRef<HTMLDivElement>(null)
  const initializedDocumentRef = useRef<string | null>(null)
  const lastSavedFingerprintRef = useRef('')
  const latestFingerprintRef = useRef('')
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const pendingSaveCountRef = useRef(0)
  const signerSaveRequestRef = useRef(false)
  const sendRequestRef = useRef(false)
  const savedToastTimerRef = useRef<number | null>(null)
  const signerScrollTimerRef = useRef<number | null>(null)
  const sendCountdownTimerRef = useRef<number | null>(null)
  const interactionReleaseTimerRef = useRef<number | null>(null)
  const activeResizeCleanupRef = useRef<() => void>(() => undefined)
  const defaultSendMessageRef = useRef(sendMessage)
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    variant?: 'danger' | 'warning' | 'info'
    confirmText?: string
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' })
  
  // Inline confirmation for signer deletion
  const [deleteSignerId, setDeleteSignerId] = useState<string | null>(null)
  
  // Panel collapse state
  const [leftPanelCollapsed, setLeftPanelCollapsed, leftPanelRef] = useResponsivePanel()

  useEffect(() => () => {
    activeResizeCleanupRef.current()
    if (savedToastTimerRef.current !== null) window.clearTimeout(savedToastTimerRef.current)
    if (signerScrollTimerRef.current !== null) window.clearTimeout(signerScrollTimerRef.current)
    if (sendCountdownTimerRef.current !== null) window.clearInterval(sendCountdownTimerRef.current)
    if (interactionReleaseTimerRef.current !== null) window.clearTimeout(interactionReleaseTimerRef.current)
  }, [])

  useEffect(() => {
    const localizedDefault = t('editor.defaultSendMessage')
    setSendMessage((currentMessage) =>
      currentMessage === defaultSendMessageRef.current ? localizedDefault : currentMessage
    )
    defaultSendMessageRef.current = localizedDefault
  }, [lang, t])

  useEffect(() => {
    if (id) fetchDocument(id)
  }, [id, fetchDocument])

  const getSignerColor = (email: string) => {
    const idx = signers.findIndex((s) => s.signer_email === email)
    return idx >= 0 ? SIGNER_COLORS[idx % SIGNER_COLORS.length] : '#9CA3AF'
  }

  const getSignerName = (email: string) => {
    const signer = signers.find((s) => s.signer_email === email)
    return signer?.signer_name || email.split('@')[0]
  }

  const docFields = signatureFields.filter((f) => f.document_id === id)

  const showSavedConfirmation = useCallback(() => {
    if (savedToastTimerRef.current !== null) window.clearTimeout(savedToastTimerRef.current)
    setSavedToast(true)
    savedToastTimerRef.current = window.setTimeout(() => {
      setSavedToast(false)
      savedToastTimerRef.current = null
    }, 2500)
  }, [])

  const hasUnsavedFieldChanges = readyFieldDraftDocumentId === id
    && currentDocument?.status === 'draft'
    && (savingDraft || draftSaveState !== 'saved')
  const navigationBlocker = useBlocker(hasUnsavedFieldChanges)

  const persistCurrentFields = useCallback(async (showConfirmation = false) => {
    if (!id || currentDocument?.status !== 'draft') return
    const snapshot = useDocumentStore.getState().signatureFields
      .filter((field) => field.document_id === id)
      .map((field) => ({ ...field }))
    const fingerprint = getFieldDraftFingerprint(snapshot, id)
    if (fingerprint === lastSavedFingerprintRef.current) {
      setDraftSaveState('saved')
      if (showConfirmation) showSavedConfirmation()
      return
    }

    pendingSaveCountRef.current += 1
    setSavingDraft(true)
    setDraftSaveState('idle')
    const operation = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        await saveSignatureFields(id, snapshot)
        lastSavedFingerprintRef.current = fingerprint
        if (latestFingerprintRef.current === fingerprint) setDraftSaveState('saved')
        if (showConfirmation) {
          setSelectedField(null)
          showSavedConfirmation()
        }
      })
      .catch((error) => {
        setDraftSaveState('error')
        throw error
      })
      .finally(() => {
        pendingSaveCountRef.current -= 1
        if (pendingSaveCountRef.current === 0) setSavingDraft(false)
      })
    saveQueueRef.current = operation
    return operation
  }, [currentDocument?.status, id, saveSignatureFields, showSavedConfirmation])

  useEffect(() => {
    if (!id || loading || currentDocument?.id !== id) return
    const fingerprint = getFieldDraftFingerprint(signatureFields, id)
    latestFingerprintRef.current = fingerprint

    if (initializedDocumentRef.current !== id) {
      initializedDocumentRef.current = id
      lastSavedFingerprintRef.current = fingerprint
      setDraftSaveState('saved')
      setReadyFieldDraftDocumentId(id)
      return
    }
    if (currentDocument.status !== 'draft') return
    if (fingerprint === lastSavedFingerprintRef.current) {
      setDraftSaveState('saved')
      return
    }

    setDraftSaveState('idle')
    const timer = window.setTimeout(() => {
      void persistCurrentFields().catch(() => undefined)
    }, 700)
    return () => window.clearTimeout(timer)
  }, [currentDocument?.id, currentDocument?.status, id, loading, persistCurrentFields, signatureFields])

  useEffect(() => {
    const warnAboutUnsavedChanges = (event: BeforeUnloadEvent) => {
      if (latestFingerprintRef.current === lastSavedFingerprintRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnAboutUnsavedChanges)
    return () => window.removeEventListener('beforeunload', warnAboutUnsavedChanges)
  }, [])

  const closeUnsavedChangesDialog = () => {
    if (navigationBlocker.state === 'blocked') navigationBlocker.reset()
  }

  const saveAndContinueNavigation = async () => {
    if (navigationBlocker.state !== 'blocked') return
    await persistCurrentFields()
    navigationBlocker.proceed()
  }

  const isInteracting = useRef(false)
  const getFieldTypeLabel = (fieldType: FieldType) => t(`editor.${fieldType}`)
  const showOverlapWarning = useCallback(() => {
    setConfirmDialog({
      isOpen: true,
      title: t('editor.fieldOverlapTitle'),
      message: t('editor.fieldOverlapMessage'),
      onConfirm: () => {},
      variant: 'warning',
    })
  }, [t])

  const overlapsAnotherField = useCallback((
    pageNumber: number,
    bounds: FieldBounds,
    excludeFieldId?: string,
  ) => Boolean(getOverlappingField(
    signatureFields.filter((field) => field.document_id === id),
    { ...bounds, page_number: pageNumber },
    excludeFieldId,
  )), [id, signatureFields])

  const removeField = useCallback((fieldId: string) => {
    const hasPlacements = placements.some((placement) => placement.field_id === fieldId)
    if (hasPlacements) {
      setConfirmDialog({
        isOpen: true,
        title: t('editor.error'),
        message: t('editor.cannotDeleteSigned'),
        onConfirm: () => {},
        variant: 'danger',
      })
      return
    }
    removeSignatureField(fieldId)
    setSelectedField(null)
  }, [placements, removeSignatureField, t])

  const handleResizeStart = useCallback((fieldId: string, corner: 'nw' | 'ne' | 'sw' | 'se', e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const field = signatureFields.find((f) => f.id === fieldId)
    if (!field) return

    activeResizeCleanupRef.current()
    isInteracting.current = true
    const startX = e.clientX
    const startY = e.clientY
    const startW = field.width
    const startH = field.height
    const startLeft = field.x
    const startTop = field.y

    const fieldEl = (e.target as HTMLElement).closest('[data-field-id]') as HTMLElement
    if (!fieldEl) {
      isInteracting.current = false
      return
    }
    const pageEl = fieldEl.closest('[data-page-number]')?.querySelector('.react-pdf__Page') as HTMLElement | null
    if (!pageEl) {
      isInteracting.current = false
      return
    }

    const calculateSize = (clientX: number, clientY: number) => {
      const rect = pageEl.getBoundingClientRect()
      const dxPct = ((clientX - startX) / rect.width) * 100
      const dyPct = ((clientY - startY) / rect.height) * 100
      let newW = startW, newH = startH, newLeft = startLeft, newTop = startTop

      if (corner === 'se') {
        newW = Math.max(4, Math.min(50, startW + dxPct))
        newH = Math.max(3, Math.min(30, startH + dyPct))
      } else if (corner === 'sw') {
        newW = Math.max(4, Math.min(50, startW - dxPct))
        newH = Math.max(3, Math.min(30, startH + dyPct))
        newLeft = startLeft + (startW - newW)
      } else if (corner === 'ne') {
        newW = Math.max(4, Math.min(50, startW + dxPct))
        newH = Math.max(3, Math.min(30, startH - dyPct))
        newTop = startTop + (startH - newH)
      } else if (corner === 'nw') {
        newW = Math.max(4, Math.min(50, startW - dxPct))
        newH = Math.max(3, Math.min(30, startH - dyPct))
        newLeft = startLeft + (startW - newW)
        newTop = startTop + (startH - newH)
      }

      newLeft = Math.max(0, Math.min(100 - newW, newLeft))
      newTop = Math.max(0, Math.min(100 - newH, newTop))
      return { newW, newH, newLeft, newTop }
    }

    let latestSize = calculateSize(startX, startY)
    const applySize = ({ newW, newH, newLeft, newTop }: typeof latestSize) => {
      fieldEl.style.width = `${newW}%`
      fieldEl.style.height = `${newH}%`
      fieldEl.style.left = `${newLeft}%`
      fieldEl.style.top = `${newTop}%`
    }
    let listening = true
    const stopListening = () => {
      if (!listening) return
      listening = false
      document.removeEventListener('pointermove', handlePointerMove)
      document.removeEventListener('pointerup', handlePointerUp)
      document.removeEventListener('pointercancel', handlePointerCancel)
      if (activeResizeCleanupRef.current === stopListening) {
        activeResizeCleanupRef.current = () => undefined
      }
    }
    const commitLatestSize = () => {
      const nextBounds = {
        width: latestSize.newW,
        height: latestSize.newH,
        x: latestSize.newLeft,
        y: latestSize.newTop,
      }
      if (overlapsAnotherField(field.page_number, nextBounds, fieldId)) {
        applySize({
          newW: startW,
          newH: startH,
          newLeft: startLeft,
          newTop: startTop,
        })
        showOverlapWarning()
      } else {
        updateSignatureField(fieldId, nextBounds)
      }
      if (interactionReleaseTimerRef.current !== null) window.clearTimeout(interactionReleaseTimerRef.current)
      interactionReleaseTimerRef.current = window.setTimeout(() => {
        isInteracting.current = false
        interactionReleaseTimerRef.current = null
      }, 100)
    }
    const handlePointerMove = (ev: PointerEvent) => {
      ev.preventDefault()
      latestSize = calculateSize(ev.clientX, ev.clientY)
      applySize(latestSize)
    }

    const handlePointerUp = (ev: PointerEvent) => {
      latestSize = calculateSize(ev.clientX, ev.clientY)
      stopListening()
      commitLatestSize()
    }
    const handlePointerCancel = () => {
      stopListening()
      commitLatestSize()
    }

    document.addEventListener('pointermove', handlePointerMove)
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerCancel)
    activeResizeCleanupRef.current = stopListening
  }, [overlapsAnotherField, showOverlapWarning, signatureFields, updateSignatureField])

  const handlePageClick = useCallback(
    (pageNumber: number, x: number, y: number, pageWidth: number, pageHeight: number) => {
      if (!id || !user || isInteracting.current) return
      if (currentDocument?.status !== 'draft') return // Locked
      if (!selectedFieldType) {
        setSelectedField(null)
        return
      }
      if (signers.length === 0) {
        setConfirmDialog({
          isOpen: true,
          title: t('editor.addSignerFirst'),
          message: t('editor.addSignerFirstDesc'),
          onConfirm: () => {},
          variant: 'info'
        })
        return
      }

      const assignedEmail = signers[selectedSignerIdx]?.signer_email || signers[0].signer_email
      const fieldId = `field_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      const placement = getFieldPlacement(selectedFieldType, x, y, pageWidth, pageHeight)
      if (overlapsAnotherField(pageNumber, placement)) {
        setPlacementPreview(null)
        showOverlapWarning()
        return
      }
      addSignatureField({
        id: fieldId,
        document_id: id,
        page_number: pageNumber,
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        assigned_to_email: assignedEmail,
        field_type: selectedFieldType,
        field_order: signatureFields.length + 1,
        label: null,
        isNew: true,
      })
      // Placement is deliberately one-shot. Return to selection mode so the next
      // click cannot create an accidental duplicate field.
      setSelectedFieldType(null)
      setPlacementPreview(null)
      setSelectedField(usesOverlayWorkspacePanels() ? null : fieldId)
    },
    [
      addSignatureField,
      currentDocument?.status,
      id,
      overlapsAnotherField,
      selectedFieldType,
      selectedSignerIdx,
      showOverlapWarning,
      signers,
      signatureFields.length,
      t,
      user,
    ]
  )

  const handleSaveSigner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id || signerSaveRequestRef.current) return
    const fullName = [signerFirstName.trim(), signerLastName.trim()].filter(Boolean).join(' ')
    const normalizedEmail = signerEmail.trim().toLowerCase()
    const duplicate = signers.some(
      (signer) => signer.id !== editingSignerId && signer.signer_email.trim().toLowerCase() === normalizedEmail
    )
    if (duplicate) {
      setSignerFormError(t('editor.duplicateEmail'))
      return
    }
    setSignerFormError('')
    signerSaveRequestRef.current = true
    setSavingSigner(true)

    try {
      if (editingSignerId) {
        await updateSigner(editingSignerId, {
          signer_email: normalizedEmail,
          signer_name: fullName || undefined,
        })
      } else {
        await addSigner(id, normalizedEmail, fullName || undefined)
      }

      // Refetch the signer list without replacing unsaved field placement work.
      await fetchSigners(id)
      
      // Auto-scroll to newly added signer
      if (!editingSignerId) {
        if (signerScrollTimerRef.current !== null) window.clearTimeout(signerScrollTimerRef.current)
        signerScrollTimerRef.current = window.setTimeout(() => {
          if (signerListRef.current) {
            signerListRef.current.scrollTop = signerListRef.current.scrollHeight
          }
          setSelectedSignerIdx(signers.length) // select the new one (will be at end)
          signerScrollTimerRef.current = null
        }, 100)
      }

      setSignerFirstName('')
      setSignerLastName('')
      setSignerEmail('')
      setEditingSignerId(null)
      setShowSignerModal(false)
    } catch (err) {
      console.error('[DocumentEditor] Error saving signer:', err)
      if (err instanceof Error && (err.message === 'DUPLICATE_SIGNER_EMAIL' || err.message.includes('document_signers_document_email_unique'))) {
        setSignerFormError(t('editor.duplicateEmail'))
        return
      }
      setConfirmDialog({
        isOpen: true,
        title: t('editor.error'),
        message: t('editor.failedSaveSigner'),
        onConfirm: () => {},
        variant: 'danger'
      })
    } finally {
      signerSaveRequestRef.current = false
      setSavingSigner(false)
    }
  }

  const openEditSignerModal = (signer: typeof signers[0]) => {
    setSignerFormError('')
    setEditingSignerId(signer.id)
    const parts = (signer.signer_name || '').split(' ')
    setSignerFirstName(parts[0] || '')
    setSignerLastName(parts.slice(1).join(' ') || '')
    setSignerEmail(signer.signer_email)
    setShowSignerModal(true)
  }

  const openAddSignerModal = () => {
    setSignerFormError('')
    setEditingSignerId(null)
    setSignerFirstName('')
    setSignerLastName('')
    setSignerEmail('')
    setShowSignerModal(true)
  }

  const handleSave = async () => {
    if (!id || savingDraft || sending) return
    try {
      await persistCurrentFields(true)
    } catch (err: unknown) {
      console.error('[DocumentEditor] Error saving fields:', err)
      setConfirmDialog({
        isOpen: true,
        title: t('editor.couldNotSaveFields'),
        message: t('editor.changesSaveFailed'),
        onConfirm: () => {},
        variant: 'warning',
      })
    }
  }

  const handlePreSend = async () => {
    if (!id || !user || savingDraft || sending) return
    const signerEmails = new Set(signers.map((signer) => signer.signer_email.trim().toLowerCase()))
    const orphaned = docFields.filter((field) =>
      field.assigned_to_email.trim() && !signerEmails.has(field.assigned_to_email.trim().toLowerCase())
    )
    if (orphaned.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: t('editor.validation'),
        message: t('editor.orphanedFields'),
        onConfirm: () => {},
        variant: 'warning',
      })
      return
    }
    const unassigned = docFields.filter((f) => !f.assigned_to_email)
    if (unassigned.length > 0) {
      setConfirmDialog({
        isOpen: true,
        title: t('editor.validation'),
        message: t('editor.assignAllFields'),
        onConfirm: () => {},
        variant: 'warning'
      })
      return
    }
    if (signers.length === 0) {
      setConfirmDialog({
        isOpen: true,
        title: t('editor.validation'),
        message: t('editor.addSignerRequired'),
        onConfirm: () => {},
        variant: 'warning'
      })
      return
    }
    if (docFields.length === 0) {
      setConfirmDialog({
        isOpen: true,
        title: t('editor.validation'),
        message: t('editor.addFieldRequired'),
        onConfirm: () => {},
        variant: 'warning'
      })
      return
    }

    for (const signer of signers) {
      const hasSignatureField = docFields.some(f =>
        f.assigned_to_email === signer.signer_email &&
        f.field_type === 'signature'
      )
      if (!hasSignatureField) {
        setConfirmDialog({
          isOpen: true,
          title: t('editor.validation'),
          message: `${t('editor.signatureFieldRequired')} ${signer.signer_name || signer.signer_email}. ${t('editor.everySignerMustHaveSignature')}`,
          onConfirm: () => {},
          variant: 'warning'
        })
        return
      }
    }

    try {
      await persistCurrentFields()
      setShowSendConfirm(true)
    } catch (err: unknown) {
      console.error('[DocumentEditor] Error saving fields before send:', err)
      setConfirmDialog({
        isOpen: true,
        title: t('editor.couldNotSaveFields'),
        message: t('editor.changesSaveFailed'),
        onConfirm: () => {},
        variant: 'warning',
      })
    }
  }

  const handleSendForSigning = async () => {
    if (!id || !user || sendRequestRef.current || savingDraft) return
    const senderName = user.user_metadata?.full_name || user.email || 'A user'
    const enteredCcEmails = ccEmails.split(',').map((email) => email.trim().toLowerCase()).filter(Boolean)
    const invalidCcEmails = enteredCcEmails.filter(
      (email) => email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    )
    if (invalidCcEmails.length > 0) {
      setSendFormError(`${t('editor.invalidCcPrefix')}: ${invalidCcEmails.join(', ')}`)
      return
    }

    setSendFormError('')
    sendRequestRef.current = true
    setShowSendConfirm(false)
    setSending(true)

    const signerEmailSet = new Set(signers.map((signer) => signer.signer_email.trim().toLowerCase()))
    if (user.email) signerEmailSet.add(user.email.trim().toLowerCase())
    const ccEmailsList = Array.from(new Set(
      enteredCcEmails
    )).filter((email) => !signerEmailSet.has(email))
    
    try {
      const result = await sendForSigning(id, senderName, sendMessage, ccEmailsList)

      if (user.email) {
        const metadata = JSON.stringify({
          ccEmails: ccEmailsList,
          signerCount: signers.length,
          sent: result.sent + result.ccSent,
          failed: result.failed + result.ccFailed,
        })
        await addAuditEntry(id, 'Document Sent for Signing', user.email, user.user_metadata?.full_name, metadata)
      }

      await Promise.all([fetchSigners(id), fetchDocument(id)])
      const failedTotal = result.failed + result.ccFailed
      setSendSummary(failedTotal > 0
        ? `${result.sent} ${t(result.sent === 1 ? 'editor.invitationSent' : 'editor.invitationsSent')} ${failedTotal} ${t(failedTotal === 1 ? 'editor.emailFailed' : 'editor.emailsFailed')}`
        : t('editor.signersWillReceive'))
      setSentToast(true)
      setCountdown(5)

      if (sendCountdownTimerRef.current !== null) window.clearInterval(sendCountdownTimerRef.current)
      sendCountdownTimerRef.current = window.setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            if (sendCountdownTimerRef.current !== null) {
              window.clearInterval(sendCountdownTimerRef.current)
              sendCountdownTimerRef.current = null
            }
            setSentToast(false)
            navigate('/dashboard')
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: unknown) {
      const message = err instanceof Error && err.message === 'NO_INVITATIONS_SENT'
        ? t('editor.noInvitationsSent')
        : t('editor.documentSendFailed')
      console.error('[DocumentEditor] Error sending document:', err)
      setConfirmDialog({
        isOpen: true,
        title: t('editor.couldNotSendDocument'),
        message,
        onConfirm: () => {},
        variant: 'warning',
      })
    } finally {
      sendRequestRef.current = false
      setSending(false)
    }
  }

  const handleFieldDragStop = (fieldId: string, _e: unknown, data: { x: number; y: number }) => {
    const field = signatureFields.find((f) => f.id === fieldId)
    if (!field) return
    const pageEl = document.querySelector(`[data-page-number="${field.page_number}"] .react-pdf__Page`) as HTMLElement | null
    if (!pageEl) return
    const rect = pageEl.getBoundingClientRect()

    const newX = field.x + (data.x / rect.width) * 100
    const newY = field.y + (data.y / rect.height) * 100

    const nextBounds = {
      x: Math.max(0, Math.min(100 - field.width, newX)),
      y: Math.max(0, Math.min(100 - field.height, newY)),
      width: field.width,
      height: field.height,
    }
    if (overlapsAnotherField(field.page_number, nextBounds, fieldId)) {
      showOverlapWarning()
      return
    }
    updateSignatureField(fieldId, nextBounds)
  }

  const clearAllFields = () => {
    if (docFields.length === 0) return
    const hasSignedFields = docFields.some((field) =>
      placements.some((placement) => placement.field_id === field.id)
    )
    if (hasSignedFields) {
      setConfirmDialog({
        isOpen: true,
        title: t('editor.error'),
        message: t('editor.cannotClearSignedFields'),
        onConfirm: () => {},
        variant: 'danger',
      })
      return
    }
    setConfirmDialog({
      isOpen: true,
      title: t('editor.clearAllFields'),
      message: t('editor.clearAllFieldsConfirm'),
      confirmText: t('editor.clearFields'),
      onConfirm: () => {
        docFields.forEach((field) => removeSignatureField(field.id))
        setSelectedField(null)
        setSelectedFieldType(null)
        setPlacementPreview(null)
      },
      variant: 'danger',
    })
  }

  const getPageFields = (pageNumber: number) => signatureFields.filter(
    (f) => f.document_id === id && f.page_number === pageNumber
  )

  if (loading && !currentDocument) {
    return (
      <div className="min-h-dvh flex items-center justify-center" role="status" aria-live="polite">
        <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <span className="sr-only">{t('common.loadingDocument')}</span>
      </div>
    )
  }

  if (!currentDocument) {
    return (
      <DocumentLoadFailureState
        failure={documentLoadFailure}
        onBack={() => navigate('/dashboard')}
        onRetry={async () => {
          if (id) await fetchDocument(id)
        }}
      />
    )
  }

  const isLocked = currentDocument.status !== 'draft'

  return (
    <div className="relative flex h-full min-w-0">
      {!leftPanelCollapsed && (
        <button
          type="button"
          aria-label={t('editor.collapsePanel')}
          onClick={() => setLeftPanelCollapsed(true)}
          className="fixed inset-0 z-30 bg-black/35 xl:hidden"
        />
      )}
      {/* Left Sidebar */}
      {!leftPanelCollapsed && (
      <div
        ref={leftPanelRef}
        role={usesOverlayWorkspacePanels() ? 'dialog' : undefined}
        aria-modal={usesOverlayWorkspacePanels() ? true : undefined}
        aria-label={t('editor.expandPanel')}
        tabIndex={-1}
        className="absolute inset-y-0 left-0 z-40 w-72 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl flex flex-col overflow-hidden xl:static xl:z-auto xl:w-56 xl:shadow-none"
      >
        {/* Scrollable sidebar content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
          <h2 className="font-semibold text-sm truncate">{currentDocument.title}</h2>
          {isLocked && (
            <p className="text-[10px] text-[hsl(var(--warning))] mt-1">🔒 {t('editor.locked')}</p>
          )}
        </div>

        {/* Signers */}
        <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('editor.signers')}</h3>
            {!isLocked && (
              <button type="button" onClick={openAddSignerModal} aria-label={t('editor.addSigner')} className="flex h-11 w-11 items-center justify-center hover:bg-[hsl(var(--muted))] rounded cursor-pointer">
                <UserPlus className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              </button>
            )}
          </div>
          {signers.length === 0 && !isLocked ? (
            <button
              type="button"
              onClick={openAddSignerModal}
              className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2.5 text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {t('editor.addSigner')}
            </button>
          ) : signers.length > 0 ? (
            <>
              {signers.length > 3 && (
                <button
                  type="button"
                  aria-label={t('editor.scrollSignersUp')}
                  onClick={() => signerListRef.current?.scrollBy({ top: -60, behavior: 'smooth' })}
                  className="flex min-h-11 w-full items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer"
                >
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
              )}
              <div
                ref={signerListRef}
                className={`space-y-1 ${signers.length > 3 ? 'max-h-[140px] scrollbar-always' : ''}`}
              >
              {signers.map((signer, idx) => {
                const color = SIGNER_COLORS[idx % SIGNER_COLORS.length]
                const isActive = selectedSignerIdx === idx
                return (
                  <div
                    key={signer.id}
                    className="group flex items-center gap-0.5 rounded-lg transition-all"
                    style={{
                      backgroundColor: isActive ? `${color}30` : 'transparent',
                      borderColor: isActive ? color : 'transparent',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSignerIdx(idx)}
                      aria-pressed={isActive}
                      aria-label={t('editor.selectNamedSigner').replace('{name}', signer.signer_name || signer.signer_email)}
                      className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left cursor-pointer"
                    >
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white shadow-sm"
                        style={{ backgroundColor: color }}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium" style={{ color: isActive ? color : 'inherit' }}>
                          {signer.signer_name || signer.signer_email.split('@')[0]}
                        </span>
                        <span className="block truncate text-[10px] text-[hsl(var(--muted-foreground))]">
                          {signer.signer_email}
                        </span>
                      </span>
                    </button>
                    {!isLocked && (
                      <div className="relative flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity xl:opacity-0 xl:group-hover:opacity-100 xl:focus-within:opacity-100">
                        <button
                          type="button"
                          aria-label={t('editor.editNamedSigner').replace('{name}', signer.signer_name || signer.signer_email)}
                          onClick={(e) => { e.stopPropagation(); openEditSignerModal(signer) }}
                          className="flex h-11 w-11 items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] rounded hover:bg-[hsl(var(--primary))]/10 cursor-pointer"
                          title={t('editor.editSigner')}
                        >
                          <PenTool className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          aria-label={t('editor.removeNamedSigner').replace('{name}', signer.signer_name || signer.signer_email)}
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteSignerId(signer.id)
                          }}
                          className="flex h-11 w-11 items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] rounded hover:bg-[hsl(var(--destructive))]/10 cursor-pointer"
                          title={t('editor.removeSigner')}
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <InlineConfirm
                          isOpen={deleteSignerId === signer.id}
                          onClose={() => setDeleteSignerId(null)}
                          onConfirm={async () => {
                            try {
                              await removeSigner(signer.id)
                              setSelectedField(null)
                              setSelectedSignerIdx((current) => Math.max(0, Math.min(current, signers.length - 2)))
                            } catch (removeError) {
                              console.error('[DocumentEditor] Error removing signer:', removeError)
                              setConfirmDialog({
                                isOpen: true,
                                title: t('editor.error'),
                                message: t('editor.removeSignerFailed'),
                                onConfirm: () => {},
                                variant: 'danger',
                              })
                            }
                          }}
                          message={t('editor.removeSignerConfirm')}
                          confirmText={t('editor.confirm')}
                          cancelText={t('editor.cancel')}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
              {signers.length > 3 && (
                <button
                  type="button"
                  aria-label={t('editor.scrollSignersDown')}
                  onClick={() => signerListRef.current?.scrollBy({ top: 60, behavior: 'smooth' })}
                  className="flex min-h-11 w-full items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          ) : (
            <p className="py-2 text-center text-xs text-[hsl(var(--muted-foreground))]">{t('editor.noSigners')}</p>
          )}
        </div>

        {/* Field Types */}
        {!isLocked && (
          <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">{t('editor.fields')}</h3>
            <div className="space-y-0.5">
              <button
                type="button"
                aria-pressed={selectedFieldType === null}
                onClick={() => {
                  setSelectedFieldType(null)
                  setPlacementPreview(null)
                  if (usesOverlayWorkspacePanels()) setLeftPanelCollapsed(true)
                }}
                className={`flex min-h-11 items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  selectedFieldType === null
                    ? 'bg-[hsl(var(--muted))] text-[hsl(var(--foreground))] ring-2 ring-[hsl(var(--border))]'
                    : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                }`}
              >
                <MousePointer2 className="h-4 w-4" />
                {t('editor.selectTool')}
              </button>
              {fieldTypeOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  aria-pressed={selectedFieldType === opt.type}
                  onClick={() => {
                    setSelectedFieldType(opt.type)
                    setSelectedField(null)
                    if (usesOverlayWorkspacePanels()) setLeftPanelCollapsed(true)
                  }}
                  className={`flex min-h-11 items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    selectedFieldType === opt.type
                      ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-md ring-2 ring-[hsl(var(--primary))]/50 ring-offset-1'
                      : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                  }`}
                >
                  {fieldTypeIcons[opt.type]}
                  {t(`editor.${opt.type}`)}
                </button>
              ))}
              {docFields.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllFields}
                  className="mt-2 flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-[hsl(var(--destructive))] transition-colors hover:bg-[hsl(var(--destructive))]/10 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  {t('editor.clearAllFields')}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Help Guide - expanded by default */}
        {!isLocked && (
          <details open className="px-2.5 pt-2 pb-1 border-b border-[hsl(var(--border))]">
            <summary className="flex min-h-11 items-center gap-1.5 cursor-pointer select-none">
              <HelpCircle className="w-3 h-3 text-[hsl(var(--primary))]" />
              <h3 className="font-semibold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('editor.helpTitle')}</h3>
            </summary>
            <ol className="space-y-0.5 text-[10px] text-[hsl(var(--muted-foreground))] leading-snug mt-1">
              <li>{t('editor.help1')}</li>
              <li>{t('editor.help2')}</li>
              <li>{t('editor.help3')}</li>
              <li>{t('editor.help4')}</li>
              <li>{t('editor.help5')}</li>
            </ol>
          </details>
        )}

        </div>

        {/* Actions - always visible at bottom */}
        <div className="px-2.5 py-2 shrink-0 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] space-y-1">
          {!isLocked && (
            <>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleSave} disabled={savingDraft || sending}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {savingDraft ? t('editor.saving') : t('editor.saveDraft')}
              </Button>
              <p
                className={`px-1 text-center text-[10px] ${draftSaveState === 'error' ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]'}`}
                role={draftSaveState === 'error' ? 'alert' : 'status'}
                aria-live="polite"
              >
                {savingDraft
                  ? t('editor.saving')
                  : draftSaveState === 'error'
                    ? t('editor.autosaveFailed')
                    : draftSaveState === 'idle'
                      ? t('editor.changesPending')
                      : t('editor.saved')}
              </p>
              <Button size="sm" className="w-full text-xs" onClick={handlePreSend} disabled={savingDraft || sending}>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {t('editor.sendForSigning')}
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </>
          )}
          <button
            type="button"
            aria-label={t('editor.collapsePanel')}
            onClick={() => setLeftPanelCollapsed(true)}
            className="flex min-h-11 w-full items-center justify-center rounded-lg text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] cursor-pointer"
            title={t('editor.collapsePanel')}
          >
            <PanelLeftClose className="w-5 h-5" />
          </button>
        </div>
      </div>
      )}
      
      {/* Expand button when left panel is collapsed */}
      {leftPanelCollapsed && (
        <button
          type="button"
          aria-label={t('editor.expandPanel')}
          onClick={() => setLeftPanelCollapsed(false)}
          className="w-11 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center justify-center cursor-pointer"
          title={t('editor.expandPanel')}
        >
          <PanelLeftOpen className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
        </button>
      )}

      {/* PDF Viewer */}
      <div
        ref={pdfContainerRef}
        className="min-w-0 flex-1 overflow-auto bg-[hsl(var(--muted))] p-3 sm:p-6 flex justify-center relative"
        onPointerLeave={() => setPlacementPreview(null)}
      >
        <PdfViewer
          fileUrl={currentDocument.original_pdf_url}
          onRetry={async () => {
            if (!id) throw new Error('The document could not be refreshed.')
            await fetchDocument(id)
            if (useDocumentStore.getState().currentDocument?.id !== id) {
              throw new Error('The document could not be refreshed.')
            }
          }}
          onPageClick={isLocked ? undefined : handlePageClick}
          placementMode={selectedFieldType !== null}
          onPagePointerMove={(pageNumber, x, y, pageWidth, pageHeight, pointerType) => {
            if (!isLocked && selectedFieldType && signers.length > 0 && pointerType !== 'touch') {
              setPlacementPreview({
                pageNumber,
                ...getFieldPlacement(selectedFieldType, x, y, pageWidth, pageHeight),
              })
            }
          }}
          onPageMouseLeave={() => setPlacementPreview(null)}
          renderPageOverlay={(pageNumber) => {
            const pageFields = getPageFields(pageNumber)
            const previewColor = SIGNER_COLORS[selectedSignerIdx % SIGNER_COLORS.length]
            const previewSigner = signers[selectedSignerIdx]
            const previewLabel = selectedFieldType ? getFieldTypeLabel(selectedFieldType) : ''
            return (
            <>
              {placementPreview?.pageNumber === pageNumber && !isLocked && previewSigner && selectedFieldType && (
                <div
                  aria-hidden="true"
                  className="absolute z-30 pointer-events-none"
                  style={{
                    left: `${placementPreview.x}%`,
                    top: `${placementPreview.y}%`,
                    width: `${placementPreview.width}%`,
                    height: `${placementPreview.height}%`,
                  }}
                >
                  <div
                    className="relative flex h-full w-full items-center justify-center rounded border-2 border-solid shadow-lg"
                    style={{
                      borderColor: previewColor,
                      backgroundColor: `${previewColor}26`,
                      color: previewColor,
                    }}
                  >
                    {selectedFieldType === 'checkbox'
                      ? <SquareCheck className="h-4/5 w-4/5" aria-hidden="true" />
                      : (
                        <>
                          <span className="truncate px-1 text-[11px] font-semibold">{previewLabel}</span>
                          <span className="absolute bottom-0 left-0 right-0 truncate px-0.5 text-center text-[8px] font-medium opacity-80">
                            {previewSigner.signer_name || previewSigner.signer_email.split('@')[0]}
                          </span>
                        </>
                      )}
                  </div>
                </div>
              )}
              {pageFields.map((field) => {
                const color = field.assigned_to_email ? getSignerColor(field.assigned_to_email) : '#9CA3AF'
                const sName = field.assigned_to_email ? getSignerName(field.assigned_to_email) : t('editor.unassigned')
                const ft = (field.field_type || 'signature') as FieldType
                const isSelected = selectedField === field.id
                const ftLabel = getFieldTypeLabel(ft)

                return isLocked ? (
                  <div
                    key={field.id}
                    className="absolute cursor-default z-10"
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      width: `${field.width}%`,
                      height: `${field.height}%`,
                    }}
                  >
                    <div
                      className="w-full h-full rounded flex items-center justify-center text-xs font-medium border-2 border-dashed"
                      style={{
                        borderColor: color,
                        backgroundColor: `${color}18`,
                        color: color,
                      }}
                    >
                      {ft === 'checkbox'
                        ? <SquareCheck className="h-4/5 w-4/5" aria-hidden="true" />
                        : (
                          <>
                            <span className="truncate px-1 text-[11px] font-semibold">{ftLabel}</span>
                            <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-medium truncate px-0.5 opacity-80" style={{ color }}>
                              {sName}
                            </span>
                          </>
                        )}
                    </div>
                  </div>
                ) : (
                  <DraggableField
                    key={field.id}
                    fieldId={field.id}
                    onStart={() => {
                      setSelectedFieldType(null)
                      setPlacementPreview(null)
                      setSelectedField(field.id)
                    }}
                    onStop={(_e, data) => handleFieldDragStop(field.id, _e, data)}
                    bounds="parent"
                    className={`absolute cursor-move group ${isSelected ? 'z-20' : 'z-10'}`}
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      width: `${field.width}%`,
                      height: `${field.height}%`,
                    }}
                  >
                    <div
                      className={`w-full h-full rounded flex items-center justify-center text-xs font-medium ${
                        isSelected ? 'border-2' : 'border-2 border-dashed'
                      }`}
                      style={{
                        borderColor: color,
                        backgroundColor: isSelected ? `${color}08` : `${color}18`,
                        color: color,
                      }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (!isLocked) {
                          setSelectedFieldType(null)
                          setPlacementPreview(null)
                          setSelectedField(field.id)
                        }
                      }}
                      onPointerUp={(event) => {
                        if (event.pointerType !== 'touch') return
                        event.stopPropagation()
                        if (!isLocked) {
                          setSelectedFieldType(null)
                          setPlacementPreview(null)
                          setSelectedField(field.id)
                        }
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          event.stopPropagation()
                          if (!isLocked) {
                            setSelectedFieldType(null)
                            setPlacementPreview(null)
                            setSelectedField(field.id)
                          }
                          return
                        }
                        if ((event.key === 'Delete' || event.key === 'Backspace') && !isLocked) {
                          event.preventDefault()
                          event.stopPropagation()
                          removeField(field.id)
                          return
                        }
                        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return
                        event.preventDefault()
                        event.stopPropagation()
                        if (isLocked) return

                        const nextBounds = adjustFieldWithKeyboard(
                          field,
                          event.key as 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown',
                          event.shiftKey,
                          event.altKey,
                        )
                        if (overlapsAnotherField(field.page_number, nextBounds, field.id)) {
                          showOverlapWarning()
                          return
                        }
                        updateSignatureField(field.id, nextBounds)
                        setSelectedField(field.id)
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={t('editor.fieldAssignedTo').replace('{field}', ftLabel).replace('{name}', sName)}
                      aria-describedby={`field-keyboard-hint-${field.id}`}
                    >
                      <span id={`field-keyboard-hint-${field.id}`} className="sr-only">{t('editor.fieldKeyboardHint')}</span>
                      {ft === 'checkbox'
                        ? <SquareCheck className="h-4/5 w-4/5" aria-hidden="true" />
                        : (
                          <>
                            <span className="truncate px-1 text-[11px] font-semibold">{ftLabel}</span>
                            <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-medium truncate px-0.5 opacity-80" style={{ color }}>
                              {sName}
                            </span>
                          </>
                        )}
                    </div>
                    {isSelected && (
                      <button
                        type="button"
                        aria-label={t('editor.removeFieldFor').replace('{field}', ftLabel).replace('{name}', sName)}
                        className="absolute -top-[22px] left-1/2 z-40 flex h-11 w-11 -translate-x-1/2 items-center justify-center cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeField(field.id)
                        }}
                      >
                        <span
                          className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md transition-transform hover:scale-110"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        >
                          ×
                        </span>
                      </button>
                    )}
                    {isSelected && (
                      <>
                        {([
                          ['nw', '-top-[22px] -left-[22px] cursor-nw-resize'],
                          ['ne', '-top-[22px] -right-[22px] cursor-ne-resize'],
                          ['sw', '-bottom-[22px] -left-[22px] cursor-sw-resize'],
                          ['se', '-bottom-[22px] -right-[22px] cursor-se-resize'],
                        ] as const).map(([corner, position]) => (
                          <div
                            key={corner}
                            className={`absolute z-30 flex h-11 w-11 touch-none items-center justify-center ${position}`}
                            onPointerDown={(event) => handleResizeStart(field.id, corner, event)}
                          >
                            <span
                              className="h-6 w-6 rounded-full border-2 bg-[hsl(var(--card))]"
                              style={{ borderColor: color }}
                              aria-hidden="true"
                            />
                          </div>
                        ))}
                      </>
                    )}
                  </DraggableField>
                )
              })}
            </>
            )
          }}
        />
      </div>

      {/* Right Sidebar */}
      <div className={`${selectedField ? 'flex' : 'hidden xl:flex'} absolute inset-y-0 right-0 z-40 w-72 border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl overflow-y-auto flex-col xl:static xl:z-auto xl:w-60 xl:shadow-none`}>
        {selectedField && (() => {
          const field = signatureFields.find((f) => f.id === selectedField)
          if (!field) return null
          const ft = (field.field_type || 'signature') as FieldType
          const assignedColor = getSignerColor(field.assigned_to_email)
          const ftLabel = getFieldTypeLabel(ft)
          return (
            <>
              <div className="flex justify-end p-2">
                <button type="button" aria-label={t('editor.closeFieldSettings')} onClick={() => setSelectedField(null)} className="flex h-11 w-11 items-center justify-center hover:bg-[hsl(var(--muted))] rounded cursor-pointer">
                  <X className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                </button>
              </div>
              <div className="px-4 pb-4 text-center border-b border-[hsl(var(--border))]">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${assignedColor}15`, color: assignedColor }}>
                    {fieldTypeIcons[ft]}
                  </div>
                  <span className="text-sm font-semibold">{ftLabel}</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">{t('editor.assignedTo')}</h3>
                <div className="space-y-1">
                  {signers.map((signer, idx) => {
                    const color = SIGNER_COLORS[idx % SIGNER_COLORS.length]
                    const isAssigned = field.assigned_to_email === signer.signer_email
                    return (
                      <button
                        type="button"
                        key={signer.id}
                        aria-label={t('editor.assignFieldTo').replace('{name}', signer.signer_name || signer.signer_email)}
                        onClick={() => { updateSignatureField(field.id, { assigned_to_email: signer.signer_email }); setSelectedSignerIdx(idx) }}
                        className={`flex min-h-11 items-center gap-2 w-full px-2 py-2 rounded-lg text-left transition-all cursor-pointer ${
                          isAssigned ? 'shadow-sm' : 'hover:bg-[hsl(var(--muted))]/50'
                        }`}
                        style={{
                          border: `1.5px solid ${isAssigned ? color : 'transparent'}`,
                          backgroundColor: isAssigned ? `${color}08` : undefined,
                        }}
                      >
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate" style={{ color: isAssigned ? color : undefined }}>{t('editor.signee')}</p>
                          <p className="text-xs font-semibold truncate">{signer.signer_name || signer.signer_email.split('@')[0]}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )
        })()}

        {!selectedField && signers.length > 0 && (
          <div className="p-4">
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">{t('editor.signers')}</h3>
            <div className="space-y-1">
              {signers.map((signer, idx) => {
                const color = SIGNER_COLORS[idx % SIGNER_COLORS.length]
                return (
                  <div
                    key={signer.id}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                  >
                    <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate">{signer.signer_name || signer.signer_email.split('@')[0]}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{signer.signer_email}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="text-[10px] text-[hsl(var(--muted-foreground))] text-center mt-3">
              {t('editor.clickFieldHint')}
            </p>
          </div>
        )}

        {!selectedField && signers.length === 0 && (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
              {t('editor.clickFieldHint')}
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Signer Modal */}
      <Modal
        isOpen={showSignerModal}
        onClose={() => {
          if (savingSigner) return
          setShowSignerModal(false)
          setEditingSignerId(null)
          setSignerFirstName('')
          setSignerLastName('')
          setSignerEmail('')
          setSignerFormError('')
        }}
        title={editingSignerId ? t('editor.editSigner') : t('editor.addSigner')}
        closeDisabled={savingSigner}
      >
            <form onSubmit={handleSaveSigner} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t('editor.firstName')}
                  placeholder={t('editor.firstNamePlaceholder')}
                  value={signerFirstName}
                  onChange={(e) => setSignerFirstName(e.target.value)}
                  required
                  maxLength={100}
                />
                <Input
                  label={t('editor.lastName')}
                  placeholder={t('editor.lastNamePlaceholder')}
                  value={signerLastName}
                  onChange={(e) => setSignerLastName(e.target.value)}
                  maxLength={100}
                />
              </div>
              <Input
                label={t('editor.email')}
                type="email"
                placeholder={t('editor.signerEmailPlaceholder')}
                value={signerEmail}
                onChange={(e) => { setSignerEmail(e.target.value); setSignerFormError('') }}
                required
                maxLength={320}
                pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                title={t('editor.invalidEmail')}
              />
              {signerFormError && (
                <p role="alert" className="text-sm font-medium text-[hsl(var(--destructive))]">{signerFormError}</p>
              )}
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { if (!savingSigner) { setShowSignerModal(false); setEditingSignerId(null); setSignerFormError('') } }}
                  disabled={savingSigner}
                >
                  {t('editor.cancel')}
                </Button>
                <Button type="submit" className="flex-1" disabled={savingSigner}>
                  {savingSigner ? t('editor.saving') : editingSignerId ? t('editor.saveChanges') : t('editor.addSigner')}
                </Button>
              </div>
            </form>
      </Modal>

      {/* Send Confirmation Dialog */}
      <Modal isOpen={showSendConfirm} onClose={() => setShowSendConfirm(false)} title={t('editor.sendForSigningTitle')}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">{t('editor.documentName')}</label>
                <div className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                  {currentDocument?.title}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('editor.signers')}</label>
                <div className="space-y-1">
                  {signers.map((signer, idx) => (
                    <div key={signer.id} className="flex items-center gap-2 px-3 py-1.5 bg-[hsl(var(--muted))] rounded-lg text-sm">
                      <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: SIGNER_COLORS[idx % SIGNER_COLORS.length] }} />
                      <span className="font-medium">{signer.signer_name || signer.signer_email.split('@')[0]}</span>
                      <span className="text-[hsl(var(--muted-foreground))]">({signer.signer_email})</span>
                    </div>
                  ))}
                </div>
              </div>
              <Input
                label={t('editor.ccEmail')}
                placeholder={t('editor.ccPlaceholder')}
                value={ccEmails}
                onChange={(e) => { setCcEmails(e.target.value); setSendFormError('') }}
                maxLength={1000}
              />
              {sendFormError && <p role="alert" className="text-sm font-medium text-[hsl(var(--destructive))]">{sendFormError}</p>}
              <div>
                <label htmlFor="send-message" className="block text-sm font-medium mb-1">{t('editor.messageForSignees')}</label>
                <textarea
                  id="send-message"
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30 focus:border-[hsl(var(--primary))]"
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  placeholder={t('editor.messagePlaceholder')}
                  maxLength={2000}
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowSendConfirm(false)}>
                  {t('editor.cancel')}
                </Button>
                <Button className="flex-1" onClick={handleSendForSigning} disabled={sending || savingDraft}>
                  <Send className="w-4 h-4 mr-1.5" />
                  {sending ? t('editor.sending') : t('editor.send')}
                </Button>
              </div>
            </div>
      </Modal>

      {/* Saved Toast */}
      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-[fadeIn_0.2s_ease-out]">
          <CheckCircle2 className="w-4 h-4" />
          {t('editor.savedSuccess')}
        </div>
      )}

      {/* Loading Overlay - While Sending */}
      {sending && !sentToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="status" aria-live="polite">
          <div className="bg-[hsl(var(--card))] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-4">
                <div className="w-10 h-10 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('editor.sendingDocument')}</h3>
              <p className="text-[hsl(var(--muted-foreground))]">
                {t('editor.pleaseWait')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sent Toast - Centered Card */}
      {sentToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[hsl(var(--card))] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl animate-[fadeIn_0.3s_ease-out]">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-9 h-9 text-[hsl(var(--success))]" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('editor.documentSent')}</h3>
              <p className="text-[hsl(var(--muted-foreground))] mb-3">
                {sendSummary || t('editor.signersWillReceive')}
              </p>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                {t('editor.redirecting')} <span className="font-bold text-[hsl(var(--primary))]">{countdown}</span>s...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={navigationBlocker.state === 'blocked'}
        onClose={closeUnsavedChangesDialog}
        onConfirm={saveAndContinueNavigation}
        title={t('editor.unsavedChanges')}
        message={t('editor.unsavedChangesMessage')}
        variant="warning"
        confirmText={t('editor.saveAndLeave')}
        cancelText={t('editor.stayHere')}
      />

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmText={confirmDialog.confirmText}
      />
    </div>
  )
}
