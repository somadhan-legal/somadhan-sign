import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import { generateSignedPdf, type SignedField } from '@/lib/signedPdf'
import { generateAuditPdf } from '@/lib/auditPdf'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input from '@/components/ui/Input'
import AuditTrailModal from '@/components/AuditTrailModal'
import { formatDate } from '@/lib/utils'
import type { Document } from '@/types/database'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { t } = useLanguageStore()
  const { documents, fetchDocuments, createDocument, deleteDocument, fetchSigners, signers, sendReminder, addAuditEntry, loading } = useDocumentStore()
  const navigate = useNavigate()

  const [showUploadModal, setShowUploadModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null)
  const [auditDocId, setAuditDocId] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Reset upload form state
  const resetUploadForm = () => {
    setTitle('')
    setFile(null)
    // Reset file input element
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement
    if (fileInput) fileInput.value = ''
  }

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !user) return

    if (file.size > 5 * 1024 * 1024) {
      alert('File size exceeds 5MB limit. Please upload a smaller PDF.')
      return
    }

    setUploading(true)
    const doc = await createDocument(
      { title, original_pdf_url: '', created_by: user.id },
      file
    )
    setUploading(false)

    if (doc) {
      setShowUploadModal(false)
      resetUploadForm()
      navigate(`/document/${doc.id}/edit`)
    }
  }

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filterStatus === 'all' || doc.status === filterStatus
    return matchesSearch && matchesFilter
  })

  const totalPages = Math.ceil(filteredDocs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedDocs = filteredDocs.slice(startIndex, endIndex)

  // Reset to page 1 when search or filter changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterStatus])

  const statusConfig: Record<string, { icon: React.ReactNode; variant: 'default' | 'success' | 'warning' | 'destructive' | 'outline'; label: string }> = {
    draft: { icon: <FileText className="w-3 h-3" />, variant: 'outline', label: t('dashboard.draft') },
    pending: { icon: <Clock className="w-3 h-3" />, variant: 'warning', label: t('dashboard.pending') },
    completed: { icon: <CheckCircle2 className="w-3 h-3" />, variant: 'success', label: t('dashboard.completed') },
    cancelled: { icon: <XCircle className="w-3 h-3" />, variant: 'destructive', label: 'Cancelled' },
  }

  const stats = {
    total: documents.length,
    draft: documents.filter((d) => d.status === 'draft').length,
    pending: documents.filter((d) => d.status === 'pending').length,
    completed: documents.filter((d) => d.status === 'completed').length,
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">{t('dashboard.myDocuments')}</h1>
          <p className="text-[hsl(var(--muted-foreground))]">
            {t('dashboard.searchDocs').replace('...', '')}
          </p>
        </div>
        <Button onClick={() => setShowUploadModal(true)}>
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
            placeholder={t('dashboard.searchDocs')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
          />
        </div>
        <div className="flex gap-2">
          {[
            { status: 'all', labelKey: 'dashboard.all' },
            { status: 'draft', labelKey: 'dashboard.draft' },
            { status: 'pending', labelKey: 'dashboard.pending' },
            { status: 'completed', labelKey: 'dashboard.completed' },
          ].map((item) => (
            <button
              key={item.status}
              onClick={() => setFilterStatus(item.status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
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
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : paginatedDocs.length === 0 && filteredDocs.length === 0 ? (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 mx-auto text-[hsl(var(--muted-foreground))]/30 mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('dashboard.noDocuments')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-4">
            {t('dashboard.uploadFirst')}
          </p>
          <Button onClick={() => setShowUploadModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('dashboard.uploadPdf')}
          </Button>
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
                <div className="flex items-center justify-between">
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
                        Created {formatDate(doc.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {doc.status !== 'draft' && (
                      <button
                        onClick={() => {
                          if (expandedDoc === doc.id) {
                            setExpandedDoc(null)
                          } else {
                            setExpandedDoc(doc.id)
                            fetchSigners(doc.id)
                          }
                        }}
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
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === doc.id ? null : doc.id)}
                        className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {menuOpen === doc.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-[hsl(var(--card))] rounded-lg shadow-lg border border-[hsl(var(--border))] py-1 z-10">
                          <Link
                            to={`/document/${doc.id}/edit`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] no-underline text-[hsl(var(--foreground))]"
                            onClick={() => setMenuOpen(null)}
                          >
                            <FileText className="w-4 h-4" />
                            {t('dashboard.edit')}
                          </Link>
                          {doc.status === 'draft' && (
                            <button
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
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] w-full text-left cursor-pointer"
                              onClick={async () => {
                                setMenuOpen(null)
                                const senderName = user?.user_metadata?.full_name || user?.email || 'A user'
                                const result = await sendReminder(doc.id, senderName)
                                if (user?.email) {
                                  await addAuditEntry(doc.id, 'Reminder Sent', user.email, user.user_metadata?.full_name, `Reminder sent to ${result.sent} signer(s)`)
                                }
                                if (result.sent > 0) {
                                  alert(`Reminder sent to ${result.sent} pending signer(s).`)
                                } else {
                                  alert('No pending signers to remind.')
                                }
                              }}
                            >
                              <Bell className="w-4 h-4" />
                              {t('dashboard.sendReminder')}
                            </button>
                          )}
                          <Link
                            to={`/document/${doc.id}`}
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] no-underline text-[hsl(var(--foreground))]"
                            onClick={() => setMenuOpen(null)}
                          >
                            <Eye className="w-4 h-4" />
                            {t('dashboard.view')}
                          </Link>
                          <button
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--muted))] w-full text-left cursor-pointer"
                            onClick={async () => {
                              setMenuOpen(null)
                              const currentDoc = documents.find(d => d.id === doc.id)
                              if (!currentDoc) return

                              try {
                                // Fetch placements
                                const { data: placementsArr, error: pErr } = await supabase
                                  .from('signature_placements')
                                  .select('*')
                                  .eq('document_id', doc.id)

                                if (pErr) console.error('Error fetching placements:', pErr)

                                if (!placementsArr || placementsArr.length === 0) {
                                  window.open(currentDoc.original_pdf_url, '_blank')
                                  return
                                }

                                // Fetch corresponding fields
                                const fieldIds = placementsArr.map(p => p.field_id)
                                const { data: fieldsArr, error: fErr } = await supabase
                                  .from('signature_fields')
                                  .select('*')
                                  .in('id', fieldIds)

                                if (fErr) console.error('Error fetching fields:', fErr)

                                if (!fieldsArr || fieldsArr.length === 0) {
                                  window.open(currentDoc.original_pdf_url, '_blank')
                                  return
                                }

                                const fieldsMap = new Map(fieldsArr.map(f => [f.id, f]))
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
                                const signedBlob = await generateSignedPdf(currentDoc.original_pdf_url, signedFields)
                                const signedUrl = URL.createObjectURL(signedBlob)

                                // Fetch audit trail for THIS document only
                                const { data: auditData } = await supabase
                                  .from('audit_trail')
                                  .select('*')
                                  .eq('document_id', doc.id)
                                  .order('created_at', { ascending: true })

                                // Client-side safety filter
                                const filteredAudit = (auditData || []).filter((e: { document_id: string }) => e.document_id === doc.id)
                                console.log('[Dashboard] doc_id:', doc.id, 'total from DB:', auditData?.length, 'after filter:', filteredAudit.length)

                                // Append audit trail
                                const finalBlob = await generateAuditPdf(signedUrl, filteredAudit, currentDoc.title)
                                URL.revokeObjectURL(signedUrl)

                                const url = URL.createObjectURL(finalBlob)
                                const link = window.document.createElement('a')
                                link.href = url
                                link.download = `${currentDoc.title} - Signed.pdf`
                                document.body.appendChild(link)
                                link.click()
                                document.body.removeChild(link)
                                URL.revokeObjectURL(url)
                              } catch (error) {
                                console.error('Error generating signed PDF:', error)
                                alert('Error generating PDF. Downloading original instead.')
                                window.open(currentDoc.original_pdf_url, '_blank')
                              }
                            }}
                          >
                            <Download className="w-4 h-4" />
                            {t('dashboard.download')}
                          </button>
                          <button
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
                            className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] w-full text-left cursor-pointer"
                            onClick={async () => {
                              setMenuOpen(null)
                              if (window.confirm(`Delete "${doc.title}"? This cannot be undone.`)) {
                                await deleteDocument(doc.id)
                              }
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
                  <div className="mt-3 pt-3 border-t border-[hsl(var(--border))]">
                    {signers.length === 0 ? (
                      <p className="text-xs text-[hsl(var(--muted-foreground))]">No signers</p>
                    ) : (
                      <div className="space-y-2">
                        {signers.map((signer) => (
                          <div key={signer.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center text-xs font-bold">
                                {signer.signer_email[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium">{signer.signer_name || signer.signer_email.split('@')[0]}</p>
                                <p className="text-xs text-[hsl(var(--muted-foreground))]">{signer.signer_email}</p>
                              </div>
                            </div>
                            <Badge variant={signer.status === 'signed' ? 'success' : signer.status === 'viewed' ? 'warning' : 'outline'}>
                              {signer.status.charAt(0).toUpperCase() + signer.status.slice(1)}
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
          <div className="flex items-center justify-between mt-6 px-4">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Showing {startIndex + 1}-{Math.min(endIndex, filteredDocs.length)} of {filteredDocs.length} documents
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                        : 'hover:bg-[hsl(var(--muted))] text-[hsl(var(--foreground))]'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
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
          setShowUploadModal(false)
          resetUploadForm()
        }}
        title="Upload Document"
        size="md"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <Input
            label="Document Title"
            placeholder="e.g. Contract Agreement"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div>
            <label className="block text-sm font-medium mb-1.5">PDF File</label>
            <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-6 text-center hover:border-[hsl(var(--primary))] transition-colors">
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="hidden"
                id="pdf-upload"
                required
              />
              <label htmlFor="pdf-upload" className="cursor-pointer">
                <FileText className="w-10 h-10 mx-auto text-[hsl(var(--muted-foreground))]/50 mb-2" />
                {file ? (
                  <p className="text-sm font-medium">{file.name}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium">Click to upload PDF</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      PDF files up to 5MB
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowUploadModal(false)
                resetUploadForm()
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={uploading || !file}>
              {uploading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Upload & Continue'
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
