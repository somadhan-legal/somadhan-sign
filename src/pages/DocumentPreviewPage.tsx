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
} from 'lucide-react'
import { useDocumentStore } from '@/stores/documentStore'
import PdfViewer from '@/components/PdfViewer'
import AuditTrailModal from '@/components/AuditTrailModal'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { generateAuditPdf } from '@/lib/auditPdf'
import { generateSignedPdf, type SignedField } from '@/lib/signedPdf'
import { supabase } from '@/lib/supabase'

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
  const {
    currentDocument,
    signatureFields,
    signers,
    placements,
    fetchDocument,
    fetchSigners,
    fetchPlacements,
    fetchSignatureFields,
    loading,
  } = useDocumentStore()

  const [showAuditTrail, setShowAuditTrail] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)

  useEffect(() => {
    if (id) {
      fetchDocument(id)
      fetchSigners(id)
      fetchPlacements(id)
      fetchSignatureFields(id)
    }
  }, [id, fetchDocument, fetchSigners, fetchPlacements, fetchSignatureFields])

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
    setDownloadingPdf(true)
    try {
      // Fetch the document fresh to avoid stale store data
      const { data: docData, error: docErr } = await supabase
        .from('documents')
        .select('*')
        .eq('id', id)
        .single()

      if (docErr || !docData) {
        alert('Could not find document.')
        return
      }

      const docTitle = docData.title
      const originalPdfUrl = docData.original_pdf_url

      // Fetch placements for THIS document
      const { data: placementsData } = await supabase
        .from('signature_placements')
        .select('*')
        .eq('document_id', id)

      let pdfUrl = originalPdfUrl

      // If there are placements, generate signed PDF first
      if (placementsData && placementsData.length > 0) {
        const fieldIds = placementsData.map(p => p.field_id)
        const { data: fieldsData } = await supabase
          .from('signature_fields')
          .select('*')
          .in('id', fieldIds)

        if (fieldsData && fieldsData.length > 0) {
          const fieldsMap = new Map(fieldsData.map(f => [f.id, f]))
          const signedFields: SignedField[] = placementsData
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

          const signedBlob = await generateSignedPdf(originalPdfUrl, signedFields)
          pdfUrl = URL.createObjectURL(signedBlob)
        }
      }

      // Fetch audit trail for THIS document ONLY
      const { data: auditData } = await supabase
        .from('audit_trail')
        .select('*')
        .eq('document_id', id)
        .order('created_at', { ascending: true })

      // Client-side safety filter
      const filteredAudit = (auditData || []).filter(e => e.document_id === id)
      console.log('[AuditTrail] doc_id:', id, 'title:', docTitle, 'total from DB:', auditData?.length, 'after filter:', filteredAudit.length)

      // Generate audit trail PDF
      const blob = await generateAuditPdf(
        pdfUrl,
        filteredAudit,
        docTitle,
      )

      if (pdfUrl !== originalPdfUrl) URL.revokeObjectURL(pdfUrl)

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${docTitle} - Complete.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Error generating PDF:', err)
      alert('Error generating PDF. Please try again.')
    } finally {
      setDownloadingPdf(false)
    }
  }

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
      {/* Left Sidebar */}
      <div className="w-80 border-r border-[hsl(var(--border))] bg-white overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
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
                <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Completed</span>
              ) : currentDocument.status === 'pending' ? (
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
              ) : (
                currentDocument.status.charAt(0).toUpperCase() + currentDocument.status.slice(1)
              )}
            </Badge>
            {allSigned && (
              <span className="text-xs text-green-600 font-medium">All signers done</span>
            )}
          </div>
        </div>

        {/* Signers */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <h3 className="font-semibold text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
            Signers ({signers.filter((s) => s.status === 'signed').length}/{signers.length})
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
                        <div className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="text-[10px] font-medium">Signed</span>
                        </div>
                      ) : signer.status === 'viewed' ? (
                        <div className="flex items-center gap-1 text-amber-500">
                          <Eye className="w-4 h-4" />
                          <span className="text-[10px] font-medium">Viewed</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span className="text-[10px] font-medium">Pending</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {signerFields.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
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

        {/* Actions */}
        <div className="p-4 mt-auto sticky bottom-0 bg-white border-t border-[hsl(var(--border))] space-y-2">
          <Button variant="outline" className="w-full" onClick={() => setShowAuditTrail(true)}>
            <History className="w-4 h-4 mr-2" />
            View Audit Trail
          </Button>
          <Button className="w-full" onClick={handleDownloadWithAudit} disabled={downloadingPdf}>
            <Download className="w-4 h-4 mr-2" />
            {downloadingPdf ? 'Generating...' : 'Download with Audit Trail'}
          </Button>
        </div>
      </div>

      {/* PDF Viewer with field overlays */}
      <div className="flex-1 overflow-auto bg-gray-100 p-6 flex justify-center">
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
                    // Unsigned field — show colored box with signer info
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
                    const dateVal = val.startsWith('date:') ? val.replace('date:', '') : val
                    return (
                      <div className="w-full h-full flex items-end">
                        <span className="text-sm font-bold text-black leading-tight">{dateVal}</span>
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
                  // Signature/initials image — clean, no border
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
    </div>
  )
}
