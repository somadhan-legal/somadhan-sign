import { useState, useRef, useCallback } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ZoomIn, ZoomOut } from 'lucide-react'
import Button from '@/components/ui/Button'

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString()

interface PdfViewerProps {
  fileUrl: string
  onTotalPages?: (total: number) => void
  onPageClick?: (pageNumber: number, x: number, y: number, pageWidth: number, pageHeight: number) => void
  renderPageOverlay?: (pageNumber: number) => React.ReactNode
  scale?: number
}

function PageWithOverlay({
  pageNumber,
  scale,
  onPageClick,
  renderPageOverlay,
}: {
  pageNumber: number
  scale: number
  onPageClick?: (pageNumber: number, x: number, y: number, pageWidth: number, pageHeight: number) => void
  renderPageOverlay?: (pageNumber: number) => React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onPageClick || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      onPageClick(pageNumber, x, y, rect.width, rect.height)
    },
    [onPageClick, pageNumber]
  )

  return (
    <div
      ref={ref}
      className="relative cursor-crosshair"
      onClick={handleClick}
      style={{ userSelect: 'none' }}
    >
      <Page
        pageNumber={pageNumber}
        scale={scale}
        renderTextLayer={false}
        renderAnnotationLayer={false}
      />
      {renderPageOverlay && (
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
          <div className="relative w-full h-full pointer-events-auto">
            {renderPageOverlay(pageNumber)}
          </div>
        </div>
      )}
    </div>
  )
}

export default function PdfViewer({
  fileUrl,
  onTotalPages,
  onPageClick,
  renderPageOverlay,
  scale: externalScale,
}: PdfViewerProps) {
  const [totalPages, setTotalPages] = useState(0)
  const [internalScale, setInternalScale] = useState(1.0)

  const scale = externalScale ?? internalScale

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setTotalPages(numPages)
      onTotalPages?.(numPages)
    },
    [onTotalPages]
  )

  return (
    <div className="flex flex-col items-center w-full">
      {/* Zoom Controls */}
      <div className="sticky top-0 z-30 flex items-center gap-2 mb-4 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))] px-3 py-2 shadow-sm">
        <span className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
          {totalPages} {totalPages === 1 ? 'page' : 'pages'}
        </span>
        <div className="w-px h-6 bg-[hsl(var(--border))] mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setInternalScale((s) => Math.max(0.5, s - 0.1))}
          className="h-8 w-8"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <span className="text-xs font-medium min-w-[40px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setInternalScale((s) => Math.min(2, s + 0.1))}
          className="h-8 w-8"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* PDF Pages — continuous scroll */}
      <Document
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        loading={
          <div className="w-[600px] h-[800px] flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
          </div>
        }
        error={
          <div className="w-[600px] h-[400px] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
            Failed to load PDF. Make sure you have a valid PDF URL.
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} className="shadow-md">
              <PageWithOverlay
                pageNumber={pageNum}
                scale={scale}
                onPageClick={onPageClick}
                renderPageOverlay={renderPageOverlay}
              />
            </div>
          ))}
        </div>
      </Document>
    </div>
  )
}
