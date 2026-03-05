import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Draggable from 'react-draggable'
import {
  Save,
  Send,
  UserPlus,
  ChevronRight,
  X,
  PenTool,
  Type,
  Calendar,
  SquareCheck,
  Copy,
  Link2,
  CheckCircle2,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import { useAuthStore } from '@/stores/authStore'
import PdfViewer from '@/components/PdfViewer'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'

type FieldType = 'signature' | 'initials' | 'date' | 'text' | 'checkbox'

const SIGNER_COLORS = [
  '#3B82F6', '#F59E0B', '#10B981', '#EF4444',
  '#0D9488', '#EC4899', '#06B6D4', '#F97316',
]

const SIGNER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

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
  const {
    currentDocument,
    signatureFields,
    signers,
    placements,
    currentPage,
    fetchDocument,
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
    setCurrentPage,
    setTotalPages,
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
  const [showInviteLinks, setShowInviteLinks] = useState(false)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [savedToast, setSavedToast] = useState(false)
  const [ccEmails, setCcEmails] = useState('')
  const [showSendConfirm, setShowSendConfirm] = useState(false)
  const [sendMessage, setSendMessage] = useState('We kindly request your review and signature on the attached document. Please complete this at your earliest convenience. Should you have any questions or require clarification, feel free to reach out. Thank you for your prompt attention to this matter.')

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
    (x: number, y: number, pageWidth: number, pageHeight: number) => {
      if (!id || !user || isInteracting.current) return
      if (currentDocument?.status !== 'draft') return // Locked
      if (signers.length === 0) {
        alert('Please add at least one signer first.')
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
        page_number: currentPage,
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
    },
    [id, user, currentPage, signers, signatureFields.length, addSignatureField, selectedFieldType, selectedSignerIdx]
  )

  const handleSaveSigner = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    const fullName = [signerFirstName.trim(), signerLastName.trim()].filter(Boolean).join(' ')

    if (editingSignerId) {
      await updateSigner(editingSignerId, {
        signer_email: signerEmail,
        signer_name: fullName || undefined,
      })
    } else {
      await addSigner(id, signerEmail, fullName || undefined)
    }

    setSignerFirstName('')
    setSignerLastName('')
    setSignerEmail('')
    setEditingSignerId(null)
    setShowSignerModal(false)
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
      alert('Please assign all fields to a signer before sending.')
      return
    }
    if (signers.length === 0) {
      alert('Please add at least one signer.')
      return
    }
    if (docFields.length === 0) {
      alert('Please add at least one field to the document.')
      return
    }

    for (const signer of signers) {
      const hasSignatureField = docFields.some(f =>
        f.assigned_to_email === signer.signer_email &&
        f.field_type === 'signature'
      )
      if (!hasSignatureField) {
        alert(`Please add at least one Signature field for ${signer.signer_name || signer.signer_email}. Every signer must have a signature field.`)
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
    
    // Log document sent
    if (user.email) {
      await addAuditEntry(id, 'Document Sent for Signing', user.email, user.user_metadata?.full_name, `Sent to ${signers.length} signer(s)`)
    }
    
    await fetchSigners(id)
    await fetchDocument(id) // Refresh to get updated status
    setSaving(false)
    setShowInviteLinks(true)
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

  const currentPageFields = signatureFields.filter(
    (f) => f.document_id === id && f.page_number === currentPage
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
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left Sidebar */}
      <div className="w-56 border-r border-[hsl(var(--border))] bg-white overflow-y-auto flex flex-col">
        <div className="p-3 border-b border-[hsl(var(--border))]">
          <h2 className="font-semibold text-sm truncate">{currentDocument.title}</h2>
          {isLocked && (
            <p className="text-[10px] text-amber-600 mt-1">🔒 Document sent - editing locked</p>
          )}
        </div>

        {/* Signers */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Signers</h3>
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
              Add Signer
            </button>
          ) : (
            <div className="space-y-1">
              {signers.map((signer, idx) => {
                const color = SIGNER_COLORS[idx % SIGNER_COLORS.length]
                const isActive = selectedSignerIdx === idx
                return (
                  <div
                    key={signer.id}
                    className="group relative flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-all"
                    style={{
                      backgroundColor: isActive ? `${color}15` : 'transparent',
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
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 absolute right-2 bg-white/90 px-1 rounded transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditSignerModal(signer) }}
                          className="p-1 text-gray-400 hover:text-blue-500 rounded hover:bg-blue-50 cursor-pointer"
                          title="Edit Signer"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            if (window.confirm('Remove this signer and all their fields?')) {
                              await removeSigner(signer.id)
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 cursor-pointer"
                          title="Remove Signer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Field Types */}
        {!isLocked && (
          <div className="p-3 border-b border-[hsl(var(--border))]">
            <h3 className="font-semibold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Fields</h3>
            <div className="space-y-0.5">
              {fieldTypeOptions.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setSelectedFieldType(opt.type)}
                  className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    selectedFieldType === opt.type
                      ? 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] ring-1 ring-[hsl(var(--primary))]/30'
                      : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                  }`}
                >
                  {fieldTypeIcons[opt.type]}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="p-3 mt-auto sticky bottom-0 bg-white border-t border-[hsl(var(--border))] space-y-1.5">
          {!isLocked && (
            <>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={handleSave} disabled={saving}>
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              <Button size="sm" className="w-full text-xs" onClick={handlePreSend} disabled={saving}>
                <Send className="w-3.5 h-3.5 mr-1.5" />
                Send for Signing
                <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-100 p-6 flex justify-center">
        <PdfViewer
          fileUrl={currentDocument.original_pdf_url}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onTotalPages={setTotalPages}
          onPageClick={handlePageClick}
          overlay={
            <>
              {currentPageFields.map((field) => {
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
                            alert('Cannot delete this field - it has already been signed by a signer.')
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
                        <div className="absolute -top-1.5 -left-1.5 w-3 h-3 border-2 bg-white cursor-nw-resize z-30" style={{ borderColor: color }} onMouseDown={(e) => handleResizeStart(field.id, 'nw', e)} />
                        <div className="absolute -top-1.5 -right-1.5 w-3 h-3 border-2 bg-white cursor-ne-resize z-30" style={{ borderColor: color }} onMouseDown={(e) => handleResizeStart(field.id, 'ne', e)} />
                        <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 border-2 bg-white cursor-sw-resize z-30" style={{ borderColor: color }} onMouseDown={(e) => handleResizeStart(field.id, 'sw', e)} />
                        <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 border-2 bg-white cursor-se-resize z-30" style={{ borderColor: color }} onMouseDown={(e) => handleResizeStart(field.id, 'se', e)} />
                      </>
                    )}
                  </DraggableField>
                )
              })}
            </>
          }
        />
      </div>

      {/* Right Sidebar */}
      <div className="w-60 border-l border-[hsl(var(--border))] bg-white overflow-y-auto flex flex-col">
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
                <h3 className="font-semibold text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Assigned to</h3>
                <div className="space-y-1">
                  {signers.map((signer, idx) => {
                    const color = SIGNER_COLORS[idx % SIGNER_COLORS.length]
                    const isAssigned = field.assigned_to_email === signer.signer_email
                    return (
                      <button
                        key={signer.id}
                        onClick={() => updateSignatureField(field.id, { assigned_to_email: signer.signer_email })}
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
                          <p className="text-xs font-medium truncate" style={{ color: isAssigned ? color : undefined }}>Signee</p>
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

        {!selectedField && (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-[hsl(var(--muted-foreground))] text-center">
              Click a field on the PDF to see its details and change the assigned signer
            </p>
          </div>
        )}
      </div>

      {/* Add/Edit Signer Modal */}
      {showSignerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h3 className="font-semibold">{editingSignerId ? 'Edit Signer' : 'Add Signer'}</h3>
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
                  label="First Name"
                  placeholder="John"
                  value={signerFirstName}
                  onChange={(e) => setSignerFirstName(e.target.value)}
                  required
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  value={signerLastName}
                  onChange={(e) => setSignerLastName(e.target.value)}
                />
              </div>
              <Input
                label="Email"
                type="email"
                placeholder="signer@example.com"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                required
              />
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowSignerModal(false); setEditingSignerId(null) }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  {editingSignerId ? 'Save Changes' : 'Add Signer'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Confirmation Dialog */}
      {showSendConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-[hsl(var(--border))] flex items-center justify-between">
              <h3 className="font-semibold">Send for Signing</h3>
              <button onClick={() => setShowSendConfirm(false)} className="p-1 hover:bg-[hsl(var(--muted))] rounded cursor-pointer">
                <X className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Document Name</label>
                <div className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]">
                  {currentDocument?.title}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Signers</label>
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
                label="CC: Email a copy (optional)"
                placeholder="e.g., manager@company.com, legal@company.com"
                value={ccEmails}
                onChange={(e) => setCcEmails(e.target.value)}
              />
              <div>
                <label className="block text-sm font-medium mb-1">Message for signees (optional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-[hsl(var(--border))] rounded-lg text-sm min-h-[80px] resize-y focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]/30 focus:border-[hsl(var(--primary))]"
                  value={sendMessage}
                  onChange={(e) => setSendMessage(e.target.value)}
                  placeholder="Message for signees (optional)"
                />
              </div>
              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowSendConfirm(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSendForSigning} disabled={saving}>
                  <Send className="w-4 h-4 mr-1.5" />
                  {saving ? 'Sending...' : 'Send'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Links Modal */}
      <Modal
        isOpen={showInviteLinks}
        onClose={() => { setShowInviteLinks(false); navigate('/dashboard') }}
        title="Document Sent for Signing!"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Your document has been sent. Share these links with signers.</span>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            Each signer has a unique link. They can sign without creating an account.
          </p>
          <div className="space-y-3">
            {signers.map((signer, idx) => {
              const link = `${window.location.origin}/sign/${signer.signing_token}`
              const isCopied = copiedToken === signer.id
              const color = SIGNER_COLORS[idx % SIGNER_COLORS.length]
              return (
                <div key={signer.id} className="border border-[hsl(var(--border))] rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: color }}>
                      {SIGNER_LABELS[idx % SIGNER_LABELS.length]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{signer.signer_name || signer.signer_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[hsl(var(--muted))] rounded-md px-3 py-2 text-xs text-[hsl(var(--muted-foreground))] truncate flex items-center gap-1">
                      <Link2 className="w-3 h-3 shrink-0" />
                      <span className="truncate">{link}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(link)
                        setCopiedToken(signer.id)
                        setTimeout(() => setCopiedToken(null), 2000)
                      }}
                    >
                      {isCopied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          <Button className="w-full" onClick={() => { setShowInviteLinks(false); navigate('/dashboard') }}>
            Done
          </Button>
        </div>
      </Modal>

      {/* Saved Toast */}
      {savedToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-2.5 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-[fadeIn_0.2s_ease-out]">
          <CheckCircle2 className="w-4 h-4" />
          Document saved successfully
        </div>
      )}
    </div>
  )
}
