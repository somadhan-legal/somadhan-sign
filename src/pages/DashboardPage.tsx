import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import {
  Plus,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  MoreVertical,
  Send,
  Trash2,
  Eye,
  Download,
  History,
  ChevronDown,
  ChevronUp,
  Bell,
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import { supabase } from '@/lib/supabase'
import type { SignedField } from '@/lib/signedPdf'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import AuditTrailModal from '@/components/AuditTrailModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { formatDate } from '@/lib/utils'
import type { Document, DocumentSigner } from '@/types/database'
import { validatePdfFile } from '@/lib/fileValidation'
import { createOwnerDocumentUrl } from '@/lib/documentStorage'
import { downloadPdfUrl, safePdfFilename } from '@/lib/download'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useLanguageStore()
  const { documents, fetchDocuments, createDocument, deleteDocument, sendReminder, addAuditEntry, loading } = useDocumentStore()
  const navigate = useNavigate()

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [remindingDocumentId, setRemindingDocumentId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [expandedSigners, setExpandedSigners] = useState<DocumentSigner[]>([])
  const [expandedSignersLoading, setExpandedSignersLoading] = useState(false)
  const [expandedSignersError, setExpandedSignersError] = useState(false)
  const [auditDocId, setAuditDocId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const [deleteConfirm, setDeleteConfirm] = useState<{ docId: string; title: string } | null>(null)
  const [notice, setNotice] = useState<{ message: string; kind: 'success' | 'error' | 'info' } | null>(null)
  const noticeTimerRef = useRef<number | null>(null)
  const signerRequestRef = useRef(0)
  const uploadValidationRequestRef = useRef(0)
  const reminderRequestRef = useRef(false)

  const localizePdfValidationError = (message: string) => {
    const keys: Record<string, string> = {
      'The selected PDF is empty.': 'dashboard.pdfEmpty',
      'The PDF must be 5 MB or smaller.': 'dashboard.pdfTooLarge',
      'Please select a PDF file.': 'dashboard.pdfRequired',
      'This file does not contain a valid PDF header.': 'dashboard.pdfInvalidHeader',
      'The PDF is damaged, encrypted, or unsupported.': 'dashboard.pdfUnsupported',
      'The PDF does not contain any pages.': 'dashboard.pdfNoPages',
    }
    return keys[message] ? t(keys[message]) : message
  }

  const showNotice = (message: string, kind: 'success' | 'error' | 'info' = 'info') => {
    setNotice({ message, kind })
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice(null)
      noticeTimerRef.current = null
    }, 4500)
  }

  useEffect(() => () => {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current)
  }, [])

  // Reset upload form state
  const resetUploadForm = () => {
    uploadValidationRequestRef.current += 1
    setTitle('')
    setFile(null)
    setUploadError('')
    // Reset file input element
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('[data-menu-container]')) {
        setMenuOpen(null)
      }
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      const openDocumentId = menuOpen
      setMenuOpen(null)
      requestAnimationFrame(() => document.getElementById(`document-actions-${openDocumentId}`)?.focus())
    }
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    requestAnimationFrame(() => {
      document.getElementById(`document-menu-${menuOpen}`)?.querySelector<HTMLElement>('[role="menuitem"]')?.focus()
    })
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuOpen])

  const toggleSignerDetails = async (documentId: string) => {
    const requestId = ++signerRequestRef.current
    if (expandedDoc === documentId) {
      setExpandedDoc(null)
      setExpandedSigners([])
      return
    }

    setExpandedDoc(documentId)
    setExpandedSigners([])
    setExpandedSignersError(false)
    setExpandedSignersLoading(true)
    const { data, error } = await supabase
      .from('document_signers')
      .select('*')
      .eq('document_id', documentId)
      .order('created_at')
    if (requestId !== signerRequestRef.current) return
    setExpandedSignersLoading(false)
    if (error) {
      setExpandedSignersError(true)
      return
    }
    setExpandedSigners((data as DocumentSigner[]) || [])
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !user) return

    const normalizedTitle = title.trim()
    if (!normalizedTitle) {
      setUploadError(t('dashboard.enterTitle'))
      return
    }

    const validationError = await validatePdfFile(file)
    if (validationError) {
      setUploadError(localizePdfValidationError(validationError))
      return
    }

    setUploadError('')
    setUploading(true)
    const doc = await createDocument(
      { title: normalizedTitle, original_pdf_url: '', created_by: user.id },
      file
    )
    setUploading(false)

    if (doc) {
      setShowUploadModal(false)
      resetUploadForm()
      navigate(`/document/${doc.id}/edit`)
    } else {
      setUploadError(t('dashboard.uploadFailed'))
    }
  }

  const handleReminder = async (documentId: string) => {
    if (reminderRequestRef.current) return
    reminderRequestRef.current = true
    setMenuOpen(null)
    setRemindingDocumentId(documentId)
    try {
      const senderName = user?.user_metadata?.full_name || user?.email || 'A user'
      const result = await sendReminder(documentId, senderName)
      if (user?.email && result.sent > 0) {
        await addAuditEntry(documentId, 'Reminder Sent', user.email, user.user_metadata?.full_name, JSON.stringify({ sent: result.sent, failed: result.failed }))
      }
      if (result.sent > 0) {
        const signerLabel = t(result.sent === 1 ? 'dashboard.pendingSigner' : 'dashboard.pendingSigners')
        const failureLabel = result.failed > 0 ? ` ${result.failed} ${t('dashboard.failedCount')}.` : ''
        showNotice(`${t('dashboard.reminderSentTo')} ${result.sent} ${signerLabel}.${failureLabel}`, result.failed > 0 ? 'info' : 'success')
      } else {
        showNotice(result.failed > 0 ? t('dashboard.reminderFailed') : t('dashboard.noPendingSigners'), result.failed > 0 ? 'error' : 'info')
      }
    } finally {
      reminderRequestRef.current = false
      setRemindingDocumentId(null)
    }
  }

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || doc.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage)
  const activePage = Math.min(currentPage, Math.max(totalPages, 1))
  const startIndex = (activePage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDocs = filteredDocs.slice(startIndex, endIndex)

  const statusConfig: Record<string, { icon: React.ReactNode; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline'; label: string }> = {
    draft: { icon: <FileText className="w-3 h-3" />, variant: 'outline', label: t('dashboard.draft') },
    pending: { icon: <Clock className="w-3 h-3" />, variant: 'warning', label: t('dashboard.pending') },
    completed: { icon: <CheckCircle2 className="w-3 h-3" />, variant: 'success', label: t('dashboard.completed') },
    cancelled: { icon: <XCircle className="w-3 h-3" />, variant: 'destructive', label: t('dashboard.cancelled') },
  }

  const stats = {
    total: documents.length,
    draft: documents.filter((d) => d.status === 'draft').length,
    pending: documents.filter((d) => d.status === 'pending').length,
    completed: documents.filter((d) => d.status === 'completed').length,
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-8">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.myDocuments')}</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            {t('dashboard.searchDocs').replace('...', '')}
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setShowUploadModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          {t('dashboard.newDocument')}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { labelKey: 'dashboard.total', value: stats.total, color: 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]' },
          { labelKey: 'dashboard.drafts', value: stats.draft, color: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]' },
          { labelKey: 'dashboard.pending', value: stats.pending, color: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]' },
          { labelKey: 'dashboard.completed', value: stats.completed, color: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' },
        ].map((stat) => (
          <div
            key={stat.labelKey}
            className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4"
          >
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{t(stat.labelKey)}</p>
            <p className="text-2xl font-bold mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <input
            type="text"
            aria-label={t('dashboard.searchDocs')}
            placeholder={t('dashboard.searchDocs')}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1) }}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {[
            { status: 'all', labelKey: 'dashboard.all' },
            { status: 'draft', labelKey: 'dashboard.draft' },
            { status: 'pending', labelKey: 'dashboard.pending' },
            { status: 'completed', labelKey: 'dashboard.completed' },
          ].map((item) => (
            <button
              type="button"
              key={item.status}
              aria-pressed={filterStatus === item.status}
              onClick={() => { setFilterStatus(item.status); setCurrentPage(1) }}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                filterStatus === item.status
                  ? 'bg-[hsl(var(--primary))] text-white'
                  : 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))]'
              }`}
            >
              {t(item.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {/* Document List */}
      {loading ? (
        <div className="flex items-center justify-center py-20" role="status" aria-live="polite">
          <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
          <span className="sr-only">{t('dashboard.loadingDocuments')}</span>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-20">
          {documents.length === 0
            ? <FileText className="w-16 h-16 mx-auto text-[hsl(var(--muted-foreground))]/30 mb-4" />
            : <Search className="w-16 h-16 mx-auto text-[hsl(var(--muted-foreground))]/30 mb-4" />}
          <h3 className="text-lg font-medium mb-2">
            {documents.length === 0 ? t('dashboard.noDocuments') : t('dashboard.noMatches')}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">
            {documents.length === 0 ? t('dashboard.uploadFirst') : t('dashboard.adjustFilters')}
          </p>
          {documents.length === 0 ? (
            <Button onClick={() => setShowUploadModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('dashboard.uploadPdf')}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => { setSearchQuery(''); setFilterStatus('all'); setCurrentPage(1) }}>
              {t('dashboard.clearFilters')}
            </Button>
          )}
        </div>
      ) : (
        <>
        <div className="grid gap-3">
          {paginatedDocs.map((doc: Document) => {
            const config = statusConfig[doc.status]
            return (
              <div
                key={doc.id}
                className="bg-[hsl(var(--card))] rounded-xl border border-[hsl(var(--border))] p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-3 sm:items-center">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
                    </div>
                    <div className="min-w-0">
                      <Link
                        to={doc.status === 'draft' ? `/document/${doc.id}/edit` : `/document/${doc.id}`}
                        className="font-medium hover:text-[hsl(var(--primary))] transition-colors truncate block no-underline text-[hsl(var(--foreground))]"
                      >
                        {doc.title}
                      </Link>
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">
                        {t('dashboard.createdOn').replace('{date}', formatDate(doc.created_at))}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                    {doc.status !== 'draft' && (
                      <button
                        type="button"
                        aria-label={t(expandedDoc === doc.id ? 'dashboard.hideSignersFor' : 'dashboard.showSignersFor').replace('{title}', doc.title)}
                        aria-expanded={expandedDoc === doc.id}
                        aria-controls={`signers-${doc.id}`}
                        onClick={() => void toggleSignerDetails(doc.id)}
                        className="p-1.5 rounded-lg hover:bg-[hsl(var(--muted))] cursor-pointer"
                      >
                        {expandedDoc === doc.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                    <Badge variant={config.variant}>
                      <span className="flex items-center gap-1">
                        {config.icon}
                        {config.label}
                      </span>
                    </Badge>
                    <div className="relative" data-menu-container>
                      <button
                        type="button"
                        id={`document-actions-${doc.id}`}
                        aria-label={t('dashboard.openActionsFor').replace('{title}', doc.title)}
                        aria-expanded={menuOpen === doc.id}
                        aria-controls={`document-menu-${doc.id}`}
                        aria-haspopup="menu"
                        onClick={() => setMenuOpen(menuOpen === doc.id ? null : doc.id)}
                        className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpen === doc.id && (
                        <div id={`document-menu-${doc.id}`} role="menu" className="absolute right-0 top-full mt-1 w-48 bg-[hsl(var(--card))] rounded-lg shadow-lg border border-[hsl(var(--border))] py-1 z-10">
                          {doc.status === 'draft' && (
                            <Link
                              to={`/document/${doc.id}/edit`}
                              role="menuitem"
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] no-underline text-[hsl(var(--foreground))]"
                              onClick={() => setMenuOpen(null)}
                            >
                              <FileText className="w-4 h-4" />
                              {t('dashboard.edit')}
                            </Link>
                          )}
                          {doc.status === 'draft' && (
                            <button
                              role="menuitem"
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] w-full text-left cursor-pointer"
                              onClick={() => {
                                navigate(`/document/${doc.id}/edit`)
                                setMenuOpen(null)
                              }}
                            >
                              <Send className="w-4 h-4" />
                              {t('editor.sendForSigning')}
                            </button>
                          )}
                          {doc.status === 'pending' && (
                            <button
                              role="menuitem"
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] disabled:opacity-50 disabled:cursor-not-allowed w-full text-left cursor-pointer"
                              onClick={() => void handleReminder(doc.id)}
                              disabled={remindingDocumentId !== null}
                            >
                              <Bell className="w-4 h-4" />
                              {t('dashboard.sendReminder')}
                            </button>
                          )}
                          <Link
                            to={`/document/${doc.id}`}
                            role="menuitem"
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] no-underline text-[hsl(var(--foreground))]"
                            onClick={() => setMenuOpen(null)}
                          >
                            <Eye className="w-4 h-4" />
                            {t('dashboard.view')}
                          </Link>
                          <button
                            role="menuitem"
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] w-full text-left cursor-pointer"
                            onClick={async () => {
                              setMenuOpen(null)
                              const currentDoc = documents.find(d => d.id === doc.id)
                              if (!currentDoc) return

                              try {
                                if (currentDoc.status !== 'completed') {
                                  const sourcePdfUrl = await createOwnerDocumentUrl(currentDoc.original_pdf_url)
                                  await downloadPdfUrl(sourcePdfUrl, safePdfFilename(currentDoc.title))
                                  return
                                }

                                if (currentDoc.final_pdf_url) {
                                  const finalPdfUrl = await createOwnerDocumentUrl(currentDoc.final_pdf_url)
                                  await downloadPdfUrl(finalPdfUrl, safePdfFilename(currentDoc.title, ' - Signed'))
                                  return
                                }

                                const originalPdfUrl = await createOwnerDocumentUrl(currentDoc.original_pdf_url)
                                // Fetch placements
                                const { data: placementsArr, error: pErr } = await supabase
                                  .from('signature_placements')
                                  .select('*')
                                  .eq('document_id', doc.id)

                                if (pErr) throw pErr

                                if (!placementsArr || placementsArr.length === 0) throw new Error('The completed signature data is unavailable')

                                // Fetch every required field so a partial legacy document is never
                                // downloaded with a misleading signed filename.
                                const { data: fieldsArr, error: fErr } = await supabase
                                  .from('signature_fields')
                                  .select('*')
                                  .eq('document_id', doc.id)

                                if (fErr) throw fErr

                                if (!fieldsArr || fieldsArr.length === 0) throw new Error('The completed field data is unavailable')

                                const fieldsMap = new Map(fieldsArr.map(f => [f.id, f]))
                                const placedFieldIds = new Set(placementsArr.map((placement) => placement.field_id))
                                if (fieldsArr.some((field) => !placedFieldIds.has(field.id))) {
                                  throw new Error('The completed document is missing one or more signed fields')
                                }
                                const signedFields: SignedField[] = placementsArr
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

                                // Generate signed PDF
                                const { generateSignedPdf } = await import('@/lib/signedPdf')
                                const signedBlob = await generateSignedPdf(originalPdfUrl, signedFields)
                                const signedUrl = URL.createObjectURL(signedBlob)
                                let finalBlob: Blob
                                try {
                                  // Fetch audit trail for this document only.
                                  const { data: auditData, error: auditError } = await supabase
                                    .from('audit_trail')
                                    .select('*')
                                    .eq('document_id', doc.id)
                                    .order('created_at', { ascending: true })
                                  if (auditError) throw auditError

                                  const filteredAudit = (auditData || []).filter((e: { document_id: string }) => e.document_id === doc.id)
                                  const { generateAuditPdf } = await import('@/lib/auditPdf')
                                  finalBlob = await generateAuditPdf(signedUrl, filteredAudit, currentDoc.title)
                                } finally {
                                  URL.revokeObjectURL(signedUrl)
                                }

                                const url = URL.createObjectURL(finalBlob)
                                try {
                                  await downloadPdfUrl(url, safePdfFilename(currentDoc.title, ' - Signed'))
                                } finally {
                                  URL.revokeObjectURL(url)
                                }
                              } catch (error) {
                                console.error('Error generating signed PDF:', error)
                                showNotice(t('dashboard.completedPdfFailed'), 'error')
                              }
                            }}
                          >
                            <Download className="w-4 h-4" />
                            {t('dashboard.download')}
                          </button>
                          <button
                            role="menuitem"
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] w-full text-left cursor-pointer"
                            onClick={() => {
                              setAuditDocId(doc.id)
                              setMenuOpen(null)
                            }}
                          >
                            <History className="w-4 h-4" />
                            {t('dashboard.auditTrail')}
                          </button>
                          <button
                            role="menuitem"
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] w-full text-left cursor-pointer"
                            onClick={() => {
                              setMenuOpen(null)
                              setDeleteConfirm({ docId: doc.id, title: doc.title })
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                            {t('dashboard.delete')}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {/* Expandable signer list */}
                {expandedDoc === doc.id && (
                  <div id={`signers-${doc.id}`} className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                    {expandedSignersLoading ? (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('dashboard.loadingSigners')}</p>
                    ) : expandedSignersError ? (
                      <p role="alert" className="text-xs text-[hsl(var(--destructive))]">{t('dashboard.signersLoadFailed')}</p>
                    ) : expandedSigners.length === 0 ? (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">{t('dashboard.noSigners')}</p>
                    ) : (
                      <div className="space-y-2">
                        {expandedSigners.map((signer) => (
                          <div key={signer.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-bold">
                                {signer.signer_email[0].toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{signer.signer_name || signer.signer_email.split('@')[0]}</p>
                                <p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{signer.signer_email}</p>
                              </div>
                            </div>
                            <Badge variant={signer.status === 'signed' ? 'success' : signer.status === 'viewed' ? 'warning' : 'outline'}>
                              {t(`dashboard.${signer.status}`)}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex flex-col items-center gap-3 px-1 sm:flex-row sm:justify-between sm:px-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {t('dashboard.showingDocuments')
                .replace('{start}', String(startIndex + 1))
                .replace('{end}', String(Math.min(endIndex, filteredDocs.length)))
                .replace('{total}', String(filteredDocs.length))}
            </p>
            <div className="flex w-full items-center justify-between gap-2 sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, activePage - 1))}
                disabled={activePage === 1}
              >
                {t('dashboard.previous')}
              </Button>
              <span aria-live="polite" className="text-sm font-medium">
                {t('dashboard.pageOf').replace('{page}', String(activePage)).replace('{total}', String(totalPages))}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, activePage + 1))}
                disabled={activePage === totalPages}
              >
                {t('dashboard.next')}
              </Button>
            </div>
          </div>
        )}
        </>
      )}

      {/* Audit Trail Modal */}
      {auditDocId && (
        <AuditTrailModal
          isOpen={!!auditDocId}
          onClose={() => setAuditDocId(null)}
          documentId={auditDocId}
        />
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => {
          if (uploading) return
          setShowUploadModal(false)
          resetUploadForm()
        }}
        title={t('dashboard.uploadDocument')}
        size="md"
        closeDisabled={uploading}
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <Input
            label={t('dashboard.documentTitle')}
            placeholder={t('dashboard.documentTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={uploading}
            required
            maxLength={160}
          />
          <div>
            <label htmlFor="pdf-upload" className="block text-sm font-medium mb-1.5">{t('dashboard.pdfFile')}</label>
            <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-6 text-center hover:border-[hsl(var(--primary))] transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={async (e) => {
                  const requestId = ++uploadValidationRequestRef.current
                  const selectedFile = e.target.files?.[0] || null
                  setFile(selectedFile)
                  if (selectedFile && !title.trim()) {
                    setTitle(selectedFile.name.replace(/\.pdf$/i, ''))
                  }
                  const validationError = selectedFile ? await validatePdfFile(selectedFile) : ''
                  if (requestId === uploadValidationRequestRef.current) {
                    setUploadError(validationError ? localizePdfValidationError(validationError) : '')
                  }
                }}
                className="hidden"
                id="pdf-upload"
                required
                disabled={uploading}
              />
              <label htmlFor="pdf-upload" className={uploading ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}>
                <FileText className="w-10 h-10 mx-auto text-[hsl(var(--muted-foreground))]/50 mb-2" />
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">{t('dashboard.clickUploadPdf')}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {t('dashboard.pdfLimit')}
                    </p>
                  </>
                )}
              </label>
            </div>
            {uploadError && <p role="alert" className="mt-2 text-sm text-[hsl(var(--destructive))]">{uploadError}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                if (uploading) return
                setShowUploadModal(false)
                resetUploadForm()
              }}
              disabled={uploading}
            >
              {t('editor.cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={uploading || !file}>
              {uploading ? (
                <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" /><span className="sr-only">{t('dashboard.uploading')}</span></>
              ) : (
                t('dashboard.uploadAndContinue')
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) {
            const deleted = await deleteDocument(deleteConfirm.docId)
            showNotice(deleted ? t('dashboard.documentDeleted') : t('dashboard.deleteFailed'), deleted ? 'success' : 'error')
          }
        }}
        title={t('dashboard.deleteDocument')}
        message={`${t('dashboard.deleteConfirmMessage')} "${deleteConfirm?.title}"? ${t('dashboard.cannotUndo')}`}
        variant="danger"
        confirmText={t('dashboard.confirm')}
        cancelText={t('editor.cancel')}
      />

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`fixed bottom-5 left-1/2 z-[70] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl border px-4 py-3 text-sm font-medium shadow-xl ${
            notice.kind === 'success'
              ? 'border-[hsl(var(--success))]/30 bg-[hsl(var(--success))] text-white'
              : notice.kind === 'error'
                ? 'border-[hsl(var(--destructive))]/30 bg-[hsl(var(--destructive))] text-white'
                : 'border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))]'
          }`}
        >
          {notice.message}
        </div>
      )}
    </div>
  )
}
