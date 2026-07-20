import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Eye,
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
import AuditTrailModal from '@/components/AuditTrailModal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { SignedField } from '@/lib/signedPdf'
import { supabase } from '@/lib/supabase'
import { createOwnerDocumentUrl } from '@/lib/documentStorage'
import { formatSigningDate } from '@/lib/utils'
import { downloadBlob, downloadPdfUrl, safePdfFilename } from '@/lib/download'
import { useLanguageStore } from '@/stores/languageStore'

const SIGNER_COLORS = [
  '#3B82F6', '#F59E0B', '#10B981', '#EF4444',
  '#0D9488', '#EC4899', '#06B6D4', '#F97316',
]
const SIGNER_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

const fieldTypeSmallIcons: Record<string, React.ReactNode> = {
  signature: <PenTool className="w-3 h-3" />,
  initials: <Type className="w-3 h-3" />,
  date: <Calendar className="w-3 h-3" />,
  text: <Type className="w-3 h-3" />,
  checkbox: <SquareCheck className="w-3 h-3" />,
}

export default function DocumentPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useLanguageStore()
  const {
    currentDocument,
    signatureFields,
    signers,
    placements,
    fetchDocument,
    loading,
  } = useDocumentStore()

  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [downloadError, setDownloadError] = useState('')
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < 1024
  )

  useEffect(() => {
    if (id) {
      fetchDocument(id)
    }
  }, [id, fetchDocument])

  const getSignerColor = (email: string) => {
    const idx = signers.findIndex((s) => s.signer_email === email)
    return idx >= 0 ? SIGNER_COLORS[idx % SIGNER_COLORS.length] : '#9CA3AF'
  }
  const getSignerLabel = (email: string) => {
    const idx = signers.findIndex((s) => s.signer_email === email)
    return idx >= 0 ? SIGNER_LABELS[idx % SIGNER_LABELS.length] : '?'
  }
  const getSignerName = (email: string) => {
    const signer = signers.find((s) => s.signer_email === email)
    return signer?.signer_name || email.split('@')[0]
  }

  const getPageFields = (pageNumber: number) => signatureFields.filter(
    (f) => f.document_id === id && f.page_number === pageNumber
  )

  const allSigned = signers.length > 0 && signers.every((s) => s.status === 'signed')

  const handleDownloadWithAudit = async () => {
    if (!id) return
    setDownloadError('')
    setDownloadingPdf(true)
    try {
      // Fetch the document fresh to avoid stale store data
      const { data: docData, error: docErr } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single()

      if (docErr || !docData) {
        setDownloadError(t('dashboard.documentUnavailable'))
        return
      }

      const docTitle = docData.title
      const originalPdfUrl = await createOwnerDocumentUrl(docData.original_pdf_url)

      if (docData.status !== 'completed') {
        await downloadPdfUrl(originalPdfUrl, safePdfFilename(docTitle))
        return
      }

      if (docData.final_pdf_url) {
        const finalPdfUrl = await createOwnerDocumentUrl(docData.final_pdf_url)
        await downloadPdfUrl(finalPdfUrl, safePdfFilename(docTitle, ' - Signed'))
        return
      }

      // Fetch placements for THIS document
      const { data: placementsData, error: placementsError } = await supabase
        .from('signature_placements')
        .select('*')
        .eq('document_id', id)
      if (placementsError) throw placementsError
      if (!placementsData || placementsData.length === 0) {
        throw new Error('The completed signature data is unavailable')
      }

      const { data: fieldsData, error: fieldsError } = await supabase
        .from('signature_fields')
        .select('*')
        .eq('document_id', id)
      if (fieldsError) throw fieldsError
      if (!fieldsData || fieldsData.length === 0 || fieldsData.length !== placementsData.length) {
        throw new Error('The completed field data is incomplete')
      }

      const placementsMap = new Map(placementsData.map((placement) => [placement.field_id, placement]))
      const signedFields: SignedField[] = fieldsData.map((field) => {
        const placement = placementsMap.get(field.id)
        if (!placement) throw new Error('A completed field is missing its value')
        return {
          field_type: field.field_type,
          page_number: field.page_number,
          x_percent: field.x,
          y_percent: field.y,
          width_percent: field.width,
          height_percent: field.height,
          signature_id: placement.signature_id,
        }
      })

      const { generateSignedPdf } = await import('@/lib/signedPdf')
      const signedBlob = await generateSignedPdf(originalPdfUrl, signedFields)
      const signedPdfUrl = URL.createObjectURL(signedBlob)

      // Fetch audit trail for THIS document ONLY
      const { data: auditData, error: auditError } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('document_id', id)
        .order('created_at', { ascending: true })
      if (auditError) throw auditError

      // Client-side safety filter
      const filteredAudit = (auditData || []).filter(e => e.document_id === id)

      // Generate audit trail PDF
      const { generateAuditPdf } = await import('@/lib/auditPdf')
      try {
        const blob = await generateAuditPdf(signedPdfUrl, filteredAudit, docTitle)
        downloadBlob(blob, safePdfFilename(docTitle, ' - Signed'))
      } finally {
        URL.revokeObjectURL(signedPdfUrl)
      }
    } catch (err) {
      console.error('Error generating PDF:', err)
      setDownloadError(currentDocument?.status === 'completed'
        ? t('dashboard.signedDownloadFailed')
        : t('dashboard.originalDownloadFailed'))
    } finally {
      setDownloadingPdf(false)
    }
  }

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
      <div className="min-h-dvh flex items-center justify-center">
        <p className="text-[hsl(var(--muted-foreground))]">{t('signee.docNotFound')}</p>
      </div>
    )
  }

  return (
    <div className="relative flex h-full min-w-0">
      {/* Left Sidebar */}
      {!leftPanelCollapsed && (
      <div className="absolute inset-y-0 left-0 z-50 w-[min(20rem,88vw)] border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-xl flex flex-col lg:static lg:z-auto lg:w-80 lg:shadow-none">
        <div className="flex-1 overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('dashboard.backToDashboard')}
          </button>
          <h2 className="font-semibold text-lg truncate">{currentDocument.title}</h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant={
                currentDocument.status === 'completed'
                  ? 'success'
                  : currentDocument.status === 'pending'
                  ? 'warning'
                  : 'outline'
              }
            >
              {currentDocument.status === 'completed' ? (
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {t('dashboard.completed')}</span>
              ) : currentDocument.status === 'pending' ? (
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {t('dashboard.pending')}</span>
              ) : (
                currentDocument.status.charAt(0).toUpperCase() + currentDocument.status.slice(1)
              )}
            </Badge>
            {allSigned && (
              <span className="text-xs text-[hsl(var(--success))] font-medium">{t('dashboard.allSignersDone')}</span>
            )}
          </div>
        </div>

        {/* Signers */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
            {t('dashboard.signers')} ({signers.filter((s) => s.status === 'signed').length}/{signers.length})
          </h3>
          <div className="space-y-2">
            {signers.map((signer, idx) => {
              const color = SIGNER_COLORS[idx % SIGNER_COLORS.length]
              const label = SIGNER_LABELS[idx % SIGNER_LABELS.length]
              const signerFields = signatureFields.filter(
                (f) => f.document_id === id && f.assigned_to_email === signer.signer_email
              )
              const signedCount = signerFields.filter((f) =>
                placements.some((p) => p.field_id === f.id)
              ).length

              return (
                <div
                  key={signer.id}
                  className="rounded-lg p-3 border"
                  style={{
                    borderColor: `${color}30`,
                    backgroundColor: `${color}05`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                      style={{ backgroundColor: color }}
                    >
                      {label}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate" style={{ color }}>
                        {signer.signer_name || signer.signer_email.split('@')[0]}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">
                        {signer.signer_email}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {signer.status === 'signed' ? (
                        <div className="flex items-center gap-1 text-[hsl(var(--success))]">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[10px] font-medium">{t('dashboard.signed')}</span>
                        </div>
                      ) : signer.status === 'viewed' ? (
                        <div className="flex items-center gap-1 text-[hsl(var(--warning))]">
                          <Eye className="w-4 h-4" />
                          <span className="text-[10px] font-medium">{t('dashboard.viewed')}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[hsl(var(--muted-foreground))]">
                          <Clock className="w-4 h-4" />
                          <span className="text-[10px] font-medium">{t('dashboard.pending')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {signerFields.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[hsl(var(--muted))] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(signedCount / signerFields.length) * 100}%`,
                            backgroundColor: color,
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                        {signedCount}/{signerFields.length}
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        </div>

        {/* Actions - always visible at bottom */}
        <div className="p-4 shrink-0 bg-[hsl(var(--card))] border-t border-[hsl(var(--border))] space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setShowAuditTrail(true)}>
            <History className="w-4 h-4 mr-2" />
            {t('dashboard.viewAuditTrail')}
          </Button>
          <Button className="w-full" onClick={handleDownloadWithAudit} disabled={downloadingPdf}>
            <Download className="w-4 h-4 mr-2" />
            {downloadingPdf
              ? currentDocument.status === 'completed' ? t('dashboard.preparing') : t('dashboard.downloading')
              : currentDocument.status === 'completed' ? t('dashboard.downloadSignedPdf') : t('dashboard.downloadOriginalPdf')}
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => setLeftPanelCollapsed(true)}>
            <PanelLeftClose className="w-4 h-4 mr-2" />
            {t('viewer.hideDetails')}
          </Button>
        </div>
      </div>
      )}

      {leftPanelCollapsed && (
        <button
          type="button"
          onClick={() => setLeftPanelCollapsed(false)}
          aria-label={t('viewer.showDetails')}
          className="w-11 shrink-0 border-r border-[hsl(var(--border))] bg-[hsl(var(--card))] hover:bg-[hsl(var(--muted))] transition-colors flex items-center justify-center cursor-pointer"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}

      {/* PDF Viewer with field overlays */}
      <div className="min-w-0 flex-1 overflow-auto bg-[hsl(var(--muted))] p-3 sm:p-6 flex justify-center">
        <PdfViewer
          fileUrl={currentDocument.original_pdf_url}
          renderPageOverlay={(pageNumber) => {
            const pageFields = getPageFields(pageNumber)
            return (
            <>
              {pageFields.map((field) => {
                const color = getSignerColor(field.assigned_to_email)
                const label = getSignerLabel(field.assigned_to_email)
                const name = getSignerName(field.assigned_to_email)
                const placement = placements.find((p) => p.field_id === field.id)
                const isSigned = !!placement
                const ft = field.field_type || 'signature'

                const renderContent = () => {
                  if (!isSigned || !placement) {
                    // Unsigned field: show a colored box with signer information.
                    return (
                      <div
                        className="w-full h-full rounded border-2 border-dashed flex items-center justify-center text-xs font-medium"
                        style={{
                          borderColor: color,
                          backgroundColor: `${color}12`,
                          color: color,
                        }}
                      >
                        <div className="absolute -top-2.5 -left-0.5">
                          <div
                            className="w-4 h-4 rounded-full flex items-center justify-center text-white text-[8px] font-bold shadow-sm"
                            style={{ backgroundColor: color }}
                          >
                            {label}
                          </div>
                        </div>
                        <span className="flex items-center gap-1 truncate text-[10px]">
                          {fieldTypeSmallIcons[ft]}
                          {name}
                        </span>
                      </div>
                    )
                  }

                  // Signed field
                  const val = placement.signature_id
                  const isSignatureImage = val.startsWith('data:image')

                  if (ft === 'date' || val.startsWith('date:')) {
                    return (
                      <div className="w-full h-full flex items-end">
                        <span className="text-sm font-bold text-black leading-tight">{formatSigningDate(val)}</span>
                      </div>
                    )
                  }
                  if (ft === 'checkbox' || val === 'checkbox:checked' || val === 'checked') {
                    return (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-[70%] h-[70%] text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </div>
                    )
                  }
                  if (ft === 'text' || (!isSignatureImage && val.startsWith('text:'))) {
                    const textVal = val.startsWith('text:') ? val.replace('text:', '') : val
                    return (
                      <div className="w-full h-full flex items-end">
                        <span className="text-sm font-bold text-black leading-tight truncate px-0.5">{textVal}</span>
                      </div>
                    )
                  }
                  // Signature or initials image without a border.
                  return (
                    <div className="w-full h-full flex items-center justify-center overflow-hidden">
                      <img src={val} alt="Signed" className="max-w-full max-h-full object-contain" />
                    </div>
                  )
                }

                return (
                  <div
                    key={field.id}
                    className="absolute z-10"
                    style={{
                      left: `${field.x}%`,
                      top: `${field.y}%`,
                      width: `${field.width}%`,
                      height: `${field.height}%`,
                    }}
                  >
                    {renderContent()}
                  </div>
                )
              })}
            </>
            )
          }}
        />
      </div>

      {/* Audit Trail Modal */}
      {id && (
        <AuditTrailModal isOpen={showAuditTrail} onClose={() => setShowAuditTrail(false)} documentId={id} />
      )}
      {downloadError && (
        <div role="alert" className="fixed bottom-5 left-1/2 z-[70] w-[min(28rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl bg-[hsl(var(--destructive))] px-4 py-3 text-sm font-medium text-white shadow-xl">
          {downloadError}
        </div>
      )}
    </div>
  )
}
