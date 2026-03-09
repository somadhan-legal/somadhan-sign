import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Draggable from 'react-draggable'
import {
  Save,
  Send,
  UserPlus,
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  X,
  PenTool,
  Type,
  Calendar,
  SquareCheck,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import PdfViewer from '@/components/PdfViewer'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import InlineConfirm from '@/components/ui/InlineConfirm'

type FieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox'

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

const fieldTypeOptions: { type: FieldType; label: string }[] = [
  { type: 'signature', label: 'Signature' },
  { type: 'initials', label: 'Initials' },
  { type: 'date', label: 'Date' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'text', label: 'Text' },
]

function DraggableField({ children, onStop, bounds, style, className, fieldId }: {
  children: React.ReactNode
  onStop: (e: unknown, data: { x: number; y: number }) => void
  bounds?: string
  style?: React.CSSProperties
  className?: string
  fieldId?: string
}) {
  const nodeRef = useRef<HTMLDivElement>(null)
  return (
    <Draggable nodeRef={nodeRef as React.RefObject<HTMLElement>} position={{ x: 0, y: 0 }} onStop={onStop} bounds={bounds}>
      <div ref={nodeRef} style={style} className={className} data-field-id={fieldId}>{children}</div>
    </Draggable>
  )
}

export default function DocumentEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t } = useLanguageStore()
  const {
    currentDocument,
    signatureFields,
    signers,
    placements,
    fetchDocument,
    addSignatureField,
    updateSignatureField,
    removeSignatureField,
    saveSignatureFields,
    fetchSignatureFields,
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
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedFieldType, setSelectedFieldType] = useState<FieldType>('signature')
  const [selectedSignerIdx, setSelectedSignerIdx] = useState(0)
  const [savedToast, setSavedToast] = useState(false)
  const [sentToast, setSentToast] = useState(false)
  const [ccEmails, setCcEmails] = useState('')
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [sendMessage, setSendMessage] = useState('Please review and sign the attached document at your earliest convenience. If you have any questions or need clarification, feel free to contact. Thank you.')
  const [countdown, setCountdown] = useState(5)
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null)
  const pdfContainerRef = useRef<HTMLDivElement>(null)
  const signerListRef = useRef<HTMLDivElement>(null)
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    message: string
    onConfirm: () => void
    variant?: 'danger' | 'warning' | 'info'
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {}, variant: 'warning' })
  
  // Inline confirmation for signer deletion
  const [deleteSignerId, setDeleteSignerId] = useState<string | null>(null)
  
  // Panel collapse states
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false)
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false)

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

  const isInteracting = useRef(false)

  const handleResizeStart = useCallback((fieldId: string, corner: 'nw' | 'ne' | 'sw' | 'se', e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    const field = signatureFields.find((f) => f.id === fieldId)
    if (!field) return

    isInteracting.current = true
    const startX = e.clientX
    const startY = e.clientY
    const startW = field.width
    const startH = field.height
    const startLeft = field.x
    const startTop = field.y

    const fieldEl = (e.target as HTMLElement).closest('[data-field-id]') as HTMLElement
    if (!fieldEl) return

    const handleMouseMove = (ev: MouseEvent) => {
      ev.preventDefault()
      const pageEl = document.querySelector('.react-pdf__Page') as HTMLElement
      if (!pageEl) return
      const rect = pageEl.getBoundingClientRect()
      const dxPct = ((ev.clientX - startX) / rect.width) * 100
      const dyPct = ((ev.clientY - startY) / rect.height) * 100

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

      fieldEl.style.width = `${newW}%`
      fieldEl.style.height = `${newH}%`
      fieldEl.style.left = `${newLeft}%`
      fieldEl.style.top = `${newTop}%`
    }

    const handleMouseUp = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)

      const pageEl = document.querySelector('.react-pdf__Page') as HTMLElement
      if (pageEl) {
        const rect = pageEl.getBoundingClientRect()
        const dxPct = ((ev.clientX - startX) / rect.width) * 100
        const dyPct = ((ev.clientY - startY) / rect.height) * 100

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

        updateSignatureField(fieldId, { width: newW, height: newH, x: newLeft, y: newTop })
      }

      setTimeout(() => { isInteracting.current = false }, 100)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [signatureFields, updateSignatureField])

  const handlePageClick = useCallback(
    (pageNumber: number, x: number, y: number, pageWidth: number, pageHeight: number) => {
      if (!id || !user || isInteracting.current) return
      if (currentDocument?.status !== 'draft') return // Locked
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
      const sizeMap: Record<FieldType, { w: number; h: number }> = {
        signature: { w: 20, h: 6 },
        initials: { w: 10, h: 5 },
        date: { w: 14, h: 4 },
        text: { w: 18, h: 4 },
        checkbox: { w: 4, h: 4 },
      }
      const size = sizeMap[selectedFieldType]
      const rawX = (x / pageWidth) * 100
      const rawY = (y / pageHeight) * 100
      addSignatureField({
        id: fieldId,
        document_id: id,
        page_number: pageNumber,
        x: Math.max(0, Math.min(100 - size.w, rawX - size.w / 2)),
        y: Math.max(0, Math.min(100 - size.h, rawY - size.h / 2)),
        width: size.w,
        height: size.h,
        assigned_to_email: assignedEmail,
        field_type: selectedFieldType,
        field_order: signatureFields.length + 1,
        label: null,
        isNew: true,
      })
      // Auto-select the newly placed field in the right panel
      setSelectedField(fieldId)
    },
    [id, user, signers, signatureFields.length, addSignatureField, selectedFieldType, selectedSignerIdx]
  )

  const handleSaveSigner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    const fullName = [signerFirstName.trim(), signerLastName.trim()].filter(Boolean).join(' ')

    try {
      if (editingSignerId) {
        await updateSigner(editingSignerId, {
          signer_email: signerEmail,
          signer_name: fullName || undefined,
        })
      } else {
        await addSigner(id, signerEmail, fullName || undefined)
      }

      // Refetch signers and fields to ensure UI is in sync
      await fetchSigners(id)
      await fetchSignatureFields(id)
      
      // Auto-scroll to newly added signer
      if (!editingSignerId) {
        setTimeout(() => {
          if (signerListRef.current) {
            signerListRef.current.scrollTop = signerListRef.current.scrollHeight
          }
          setSelectedSignerIdx(signers.length) // select the new one (will be at end)
        }, 100)
      }

      setSignerFirstName('')
      setSignerLastName('')
      setSignerEmail('')
      setEditingSignerId(null)
      setShowSignerModal(false)
    } catch (err) {
      console.error('[DocumentEditor] Error saving signer:', err)
      setConfirmDialog({
        isOpen: true,
        title: t('editor.error'),
        message: t('editor.failedSaveSigner'),
        onConfirm: () => {},
        variant: 'danger'
      })
    }
  }

  const openEditSignerModal = (signer: typeof signers[0]) => {
    setEditingSignerId(signer.id)
    const parts = (signer.signer_name || '').split(' ')
    setSignerFirstName(parts[0] || '')
    setSignerLastName(parts.slice(1).join(' ') || '')
    setSignerEmail(signer.signer_email)
    setShowSignerModal(true)
  }

  const openAddSignerModal = () => {
    setEditingSignerId(null)
    setSignerFirstName('')
    setSignerLastName('')
    setSignerEmail('')
    setShowSignerModal(true)
  }

  const handleSave = async () => {
    if (!id) return
    setSaving(true)
    await saveSignatureFields(id)
    setSaving(false)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2500)
  }

  const handlePreSend = () => {
    if (!id || !user) return
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

    setShowSendConfirm(true)
  }

  const handleSendForSigning = async () => {
    if (!id || !user) return
    setShowSendConfirm(false)
    setSaving(true)
    
    const senderName = user.user_metadata?.full_name || user.email || 'A user'
    const ccEmailsList = ccEmails.split(',').map(e => e.trim()).filter(Boolean)
    
    // Log document creation (first time sending)
    if (currentDocument?.status === 'draft' && user.email) {
      await addAuditEntry(id, 'Document Created', user.email, user.user_metadata?.full_name, `Document "${currentDocument.title}" created with ${signers.length} signer(s)`)
    }
    
    await sendForSigning(id, senderName, sendMessage, ccEmailsList)
    
    // Log document sent (store CC emails in metadata for completion emails)
    if (user.email) {
      const metadata = ccEmailsList.length > 0 ? JSON.stringify({ ccEmails: ccEmailsList }) : `Sent to ${signers.length} signer(s)`
      await addAuditEntry(id, 'Document Sent for Signing', user.email, user.user_metadata?.full_name, metadata)
    }
    
    await fetchSigners(id)
    await fetchDocument(id) // Refresh to get updated status
    setSaving(false)
    setShowSendConfirm(false)
    
    // Show success toast with countdown
    setSentToast(true)
    setCountdown(5)
    
    // Countdown timer
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          setSentToast(false)
          navigate('/dashboard')
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    // Navigate after showing the toast
    setTimeout(() => navigate('/dashboard'), 5000)
  }

  const handleFieldDragStop = (fieldId: string, _e: unknown, data: { x: number; y: number }) => {
    const pageEl = document.querySelector('.react-pdf__Page') as HTMLElement
    if (!pageEl) return
    const rect = pageEl.getBoundingClientRect()
    const field = signatureFields.find((f) => f.id === fieldId)
    if (!field) return

    const newX = field.x + (data.x / rect.width) * 100
    const newY = field.y + (data.y / rect.height) * 100

    updateSignatureField(fieldId, {
      x: Math.max(0, Math.min(100 - field.width, newX)),
      y: Math.max(0, Math.min(100 - field.height, newY)),
    })
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

  const isLocked = currentDocument.status !== 'draft'

  return (
    <div className="flex h-full">
      {/* Left Sidebar */}
      {!leftPanelCollapsed && (
      <div className="w-56 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] flex flex-col overflow-hidden">
        {/* Scrollable sidebar content */}
        <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
          <h2 className="font-semibold text-sm truncate">{currentDocument.title}</h2>
          {isLocked && (
            <p className="text-[10px] text-[hsl(var(--warning))] mt-1">🔒 Document sent - editing locked</p>
          )}
        </div>

        {/* Signers */}
        <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">{t('editor.signers')}</h3>
            {!isLocked && (
              <button onClick={openAddSignerModal} className="p-1 hover:bg-[hsl(var(--muted))] rounded cursor-pointer">
                <UserPlus className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))]" />
              </button>
            )}
          </div>
          {signers.length === 0 ? (
            <button
              onClick={openAddSignerModal}
              className="w-full py-2.5 border border-[hsl(var(--border))] rounded-lg text-xs font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {t('editor.addSigner')}
            </button>
          ) : (
            <>
              {signers.length > 3 && (
                <button
                  onClick={() => signerListRef.current?.scrollBy({ top: -60, behavior: 'smooth' })}
                  className="w-full flex justify-center py-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer"
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
                    className="group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                    style={{
                      backgroundColor: isActive ? `${color}30` : 'transparent',
                      borderColor: isActive ? color : 'transparent',
                    }}
                    onClick={() => setSelectedSignerIdx(idx)}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold shadow-sm shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate" style={{ color: isActive ? color : 'inherit' }}>
                        {signer.signer_name || signer.signer_email.split('@')[0]}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                        {signer.signer_email}
                      </p>
                    </div>
                    {!isLocked && (
                      <div className="shrink-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditSignerModal(signer) }}
                          className="p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] rounded hover:bg-[hsl(var(--primary))]/10 cursor-pointer"
                          title="Edit Signer"
                        >
                          <PenTool className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteSignerId(signer.id)
                          }}
                          className="p-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))] rounded hover:bg-[hsl(var(--destructive))]/10 cursor-pointer"
                          title="Remove Signer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <InlineConfirm
                          isOpen={deleteSignerId === signer.id}
                          onClose={() => setDeleteSignerId(null)}
                          onConfirm={async () => {
                            await removeSigner(signer.id)
                          }}
                          message={t('editor.removeSignerConfirm')}
                          confirmText="OK"
                          cancelText="Cancel"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
              {signers.length > 3 && (
                <button
                  onClick={() => signerListRef.current?.scrollBy({ top: 60, behavior: 'smooth' })}
                  className="w-full flex justify-center py-0.5 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Field Types */}
        {!isLocked && (
          <div className="px-3 py-2 border-b border-[hsl(var(--border))]">
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">{t('editor.fields')}</h3>
            <div className="space-y-0.5">
              {fieldTypeOptions.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setSelectedFieldType(opt.type)}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    selectedFieldType === opt.type
                      ? 'bg-[hsl(var(--primary))] text-white shadow-md ring-2 ring-[hsl(var(--primary))]/50 ring-offset-1'
                      : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                  }`}
                >
                  {fieldTypeIcons[opt.type]}
                  {t(`editor.${opt.type}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Help Guide - expanded by default */}
        {!isLocked && (
          <details open className="px-2.5 pt-2 pb-1 border-b border-[hsl(var(--border))]">
            <summary className="flex items-center gap-1.5 cursor-pointer select-none">
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
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleSave} disabled={saving}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? t('editor.saving') : t('editor.saveDraft')}
              </Button>
              <Button size="sm" className="w-full text-xs" onClick={handlePreSend} disabled={saving}>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {t('editor.sendForSigning')}
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </>
          )}
          <button
            onClick={() => setLeftPanelCollapsed(true)}
            className="w-full py-1.5 text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--muted))] rounded transition-colors flex items-center justify-center gap-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            Collapse
          </button>
        </div>
      </div>
      )}
      
      {/* Collapse button when left panel is collapsed */}
      {leftPanelCollapsed && (
        <button
          onClick={() => setLeftPanelCollapsed(false)}
          className="w-8 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center justify-center"
        >
          <ChevronRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        </button>
      )}

      {/* PDF Viewer */}
      <div
        ref={pdfContainerRef}
        className="flex-1 overflow-auto bg-[hsl(var(--muted))] p-6 flex justify-center relative"
        onMouseLeave={() => setCursorPos(null)}
      >
        {/* Cursor stamp - only visible when hovering over PDF pages */}
        {cursorPos && !isLocked && signers.length > 0 && (
          <div
            className="fixed z-50 pointer-events-none flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shadow-lg border text-xs font-semibold"
            style={{
              left: cursorPos.x + 14,
              top: cursorPos.y + 14,
              backgroundColor: `${SIGNER_COLORS[selectedSignerIdx % SIGNER_COLORS.length]}18`,
              borderColor: SIGNER_COLORS[selectedSignerIdx % SIGNER_COLORS.length],
              color: SIGNER_COLORS[selectedSignerIdx % SIGNER_COLORS.length],
            }}
          >
            {fieldTypeIcons[selectedFieldType]}
            {t('editor.clickToAddField')}
          </div>
        )}
        <PdfViewer
          fileUrl={currentDocument.original_pdf_url}
          onPageClick={handlePageClick}
          onPageMouseMove={(e) => {
            if (!isLocked && signers.length > 0) {
              setCursorPos({ x: e.clientX, y: e.clientY })
            }
          }}
          onPageMouseLeave={() => setCursorPos(null)}
          renderPageOverlay={(pageNumber) => {
            const pageFields = getPageFields(pageNumber)
            return (
            <>
              {pageFields.map((field) => {
                const color = field.assigned_to_email ? getSignerColor(field.assigned_to_email) : '#9CA3AF'
                const sName = field.assigned_to_email ? getSignerName(field.assigned_to_email) : 'Unassigned'
                const ft = (field.field_type || 'signature') as FieldType
                const isSelected = selectedField === field.id
                const ftLabel = ft === 'signature' ? 'Signature' : ft === 'initials' ? 'Initials' : ft === 'date' ? 'Date' : ft === 'checkbox' ? 'Checkbox' : 'Text'

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
                      <span className="truncate px-1 text-[11px] font-semibold">{ftLabel}</span>
                      <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-medium truncate px-0.5 opacity-80" style={{ color }}>
                        {sName}
                      </span>
                    </div>
                  </div>
                ) : (
                  <DraggableField
                    key={field.id}
                    fieldId={field.id}
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
                      onClick={(e) => { e.stopPropagation(); if (!isLocked) setSelectedField(field.id) }}
                    >
                      <span className="truncate px-1 text-[11px] font-semibold">{ftLabel}</span>
                      <span className="absolute bottom-0 left-0 right-0 text-center text-[8px] font-medium truncate px-0.5 opacity-80" style={{ color }}>
                        {sName}
                      </span>
                    </div>
                    {isSelected && (
                      <button
                        className="absolute -top-3 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold shadow-md cursor-pointer z-40 hover:scale-110 transition-transform"
                        style={{ backgroundColor: color }}
                        onClick={(e) => {
                          e.stopPropagation()
                          const hasPlacements = placements.some(p => p.field_id === field.id)
                          if (hasPlacements) {
                            setConfirmDialog({
                              isOpen: true,
                              title: t('editor.error'),
                              message: t('editor.cannotDeleteSigned'),
                              onConfirm: () => {},
                              variant: 'danger'
                            })
                            return
                          }
                          removeSignatureField(field.id)
                          setSelectedField(null)
                        }}
                      >
                        ×
                      </button>
                    )}
                    {isSelected && (
                      <>
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-2 bg-[hsl(var(--card))] cursor-nw-resize z-30" style={{ borderColor: color }} onMouseDown={(e) => handleResizeStart(field.id, 'nw', e)} />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-2 bg-[hsl(var(--card))] cursor-ne-resize z-30" style={{ borderColor: color }} onMouseDown={(e) => handleResizeStart(field.id, 'ne', e)} />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-2 bg-[hsl(var(--card))] cursor-sw-resize z-30" style={{ borderColor: color }} onMouseDown={(e) => handleResizeStart(field.id, 'sw', e)} />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-2 bg-[hsl(var(--card))] cursor-se-resize z-30" style={{ borderColor: color }} onMouseDown={(e) => handleResizeStart(field.id, 'se', e)} />
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
      <div className="w-60 border-l border-[hsl(var(--border))] bg-[hsl(var(--card))] overflow-y-auto flex flex-col">
        {selectedField && (() => {
          const field = signatureFields.find((f) => f.id === selectedField)
          if (!field) return null
          const ft = (field.field_type || 'signature') as FieldType
          const assignedColor = getSignerColor(field.assigned_to_email)
          const ftLabel = ft === 'signature' ? 'Signature' : ft === 'initials' ? 'Initials' : ft === 'date' ? 'Date' : ft === 'checkbox' ? 'Checkbox' : 'Text'
          return (
            <>
              <div className="flex justify-end p-2">
                <button onClick={() => setSelectedField(null)} className="p-1 hover:bg-[hsl(var(--muted))] rounded cursor-pointer">
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
                        key={signer.id}
                        onClick={() => { updateSignatureField(field.id, { assigned_to_email: signer.signer_email }); setSelectedSignerIdx(idx) }}
                        className={`flex items-center gap-2 w-full px-2 py-2 rounded-lg text-left transition-all cursor-pointer ${
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
      {showSignerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h3 className="font-semibold">{editingSignerId ? t('editor.editSigner') : t('editor.addSigner')}</h3>
              <button
                onClick={() => { setShowSignerModal(false); setEditingSignerId(null); setSignerFirstName(''); setSignerLastName(''); setSignerEmail('') }}
                className="p-1 hover:bg-[hsl(var(--muted))] rounded cursor-pointer"
              >
                <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>
            <form onSubmit={handleSaveSigner} className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label={t('editor.firstName')}
                  placeholder="John"
                  value={signerFirstName}
                  onChange={(e) => setSignerFirstName(e.target.value)}
                  required
                />
                <Input
                  label={t('editor.lastName')}
                  placeholder="Doe"
                  value={signerLastName}
                  onChange={(e) => setSignerLastName(e.target.value)}
                />
              </div>
              <Input
                label={t('editor.email')}
                type="email"
                placeholder="signer@example.com"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                required
                pattern="[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}"
                title={t('editor.invalidEmail')}
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowSignerModal(false); setEditingSignerId(null) }}
                >
                  {t('editor.cancel')}
                </Button>
                <Button type="submit" className="flex-1">
                  {editingSignerId ? t('editor.saveChanges') : t('editor.addSigner')}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Confirmation Dialog */}
      {showSendConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h3 className="font-semibold">{t('editor.sendForSigningTitle')}</h3>
              <button onClick={() => setShowSendConfirm(false)} className="p-1 hover:bg-[hsl(var(--muted))] rounded cursor-pointer">
                <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>
            <div className="p-4 space-y-4">
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
                placeholder="e.g., manager@company.com, legal@company.com"
                value={ccEmails}
                onChange={(e) => setCcEmails(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium mb-1">{t('editor.messageForSignees')}</label>
                <textarea
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30 focus:border-[hsl(var(--primary))]"
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  placeholder="Message for signees (optional)"
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowSendConfirm(false)}>
                  {t('editor.cancel')}
                </Button>
                <Button className="flex-1" onClick={handleSendForSigning} disabled={saving}>
                  <Send className="w-4 h-4 mr-1.5" />
                  {saving ? t('editor.sending') : t('editor.send')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Saved Toast */}
      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[hsl(var(--success))] text-white px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-[fadeIn_0.2s_ease-out]">
          <CheckCircle2 className="w-4 h-4" />
          {t('editor.savedSuccess')}
        </div>
      )}

      {/* Loading Overlay - While Sending */}
      {saving && !sentToast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[hsl(var(--card))] rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mb-4">
                <div className="w-10 h-10 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
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
                {t('editor.signersWillReceive')}
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
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        onConfirm={confirmDialog.onConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
      />
    </div>
  )
}
