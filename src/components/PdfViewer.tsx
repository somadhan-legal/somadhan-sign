import { useState, useRef, useCallback, useEffect } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import { ZoomIn, ZoomOut } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useLanguageStore } from '@/stores/languageStore'

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
  onPagePointerMove?: (pageNumber: number, x: number, y: number, pageWidth: number, pageHeight: number, pointerType: string) => void
  onPageMouseLeave?: () => void
  onRetry?: () => Promise<void>
  placementMode?: boolean
}

function PageWithOverlay({
  pageNumber,
  scale,
  width,
  onPageClick,
  renderPageOverlay,
  onPagePointerMove,
  onPageMouseLeave,
  placementMode,
}: {
  pageNumber: number
  scale: number
  width: number
  onPageClick?: (pageNumber: number, x: number, y: number, pageWidth: number, pageHeight: number) => void
  renderPageOverlay?: (pageNumber: number) => React.ReactNode
  onPagePointerMove?: (pageNumber: number, x: number, y: number, pageWidth: number, pageHeight: number, pointerType: string) => void
  onPageMouseLeave?: () => void
  placementMode: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { t } = useLanguageStore()
  const [isNearViewport, setIsNearViewport] = useState(
    () => typeof IntersectionObserver === 'undefined',
  )
  const [pageAspectRatio, setPageAspectRatio] = useState(1.414)
  const displayWidth = Math.max(Math.round(width * scale), 1)
  const estimatedHeight = Math.max(Math.round(displayWidth * pageAspectRatio), 1)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => setIsNearViewport(entry.isIntersecting),
      { rootMargin: '1000px 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onPageClick || !ref.current) return
      // Field controls sit inside the page overlay. Treat only the uncovered
      // document surface as a page click so selection, dragging, resizing and
      // touch interaction can never create a second field underneath.
      if ((e.target as HTMLElement).closest('[data-field-id]')) return
      const rect = ref.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      onPageClick(pageNumber, x, y, rect.width, rect.height)
    },
    [onPageClick, pageNumber]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!onPagePointerMove || !ref.current) return
      if ((e.target as HTMLElement).closest('[data-field-id]')) {
        onPageMouseLeave?.()
        return
      }
      const rect = ref.current.getBoundingClientRect()
      onPagePointerMove(
        pageNumber,
        e.clientX - rect.left,
        e.clientY - rect.top,
        rect.width,
        rect.height,
        e.pointerType
      )
    },
    [onPageMouseLeave, onPagePointerMove, pageNumber]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onPageClick || !ref.current || (e.key !== 'Enter' && e.key !== ' ')) return
      e.preventDefault()
      const rect = ref.current.getBoundingClientRect()
      onPageClick(pageNumber, rect.width / 2, rect.height / 2, rect.width, rect.height)
    },
    [onPageClick, pageNumber]
  )

  return (
    <div
      ref={ref}
      className={`relative ${placementMode ? 'cursor-crosshair' : 'cursor-default'}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={onPageMouseLeave}
      role={onPageClick ? 'region' : undefined}
      tabIndex={onPageClick ? 0 : undefined}
      aria-label={onPageClick
        ? placementMode
          ? `${t('viewer.pdfPage')} ${pageNumber}. ${t('viewer.placeCenterHint')}`
          : `${t('viewer.pdfPage')} ${pageNumber}`
        : undefined}
      style={{
        minHeight: `${estimatedHeight}px`,
        width: `${displayWidth}px`,
        userSelect: 'none',
        touchAction: placementMode ? 'manipulation' : 'pan-y pinch-zoom',
      }}
    >
      {isNearViewport ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          scale={scale}
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onRenderSuccess={(page) => {
            const viewport = page.getViewport({ scale: 1 })
            if (viewport.width > 0 && viewport.height > 0) {
              setPageAspectRatio(viewport.height / viewport.width)
            }
          }}
        />
      ) : (
        <div className="w-full" style={{ height: `${estimatedHeight}px` }} aria-hidden="true" />
      )}
      {renderPageOverlay && (
        <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 10 }}>
          <div className="relative w-full h-full pointer-events-auto overflow-visible">
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
  onPagePointerMove,
  onPageMouseLeave,
  onRetry,
  placementMode = Boolean(onPageClick),
}: PdfViewerProps) {
  const { t } = useLanguageStore()
  const [totalPages, setTotalPages] = useState(0)
  const [internalScale, setInternalScale] = useState(1.0)
  const [availableWidth, setAvailableWidth] = useState(680)
  const [reloadKey, setReloadKey] = useState(0)
  const [loadError, setLoadError] = useState('')
  const [retrying, setRetrying] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const scale = externalScale ?? internalScale
  const pageWidth = Math.max(260, Math.min(680, availableWidth - 24))

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const updateWidth = () => setAvailableWidth(container.clientWidth)
    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setLoadError('')
      setTotalPages(numPages)
      onTotalPages?.(numPages)
    },
    [onTotalPages]
  )

  const handleRetry = async () => {
    if (retrying) return
    setRetrying(true)
    setLoadError('')
    try {
      await onRetry?.()
      setReloadKey((key) => key + 1)
    } catch {
      setLoadError(t('viewer.pdfLoadFailed'))
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div ref={containerRef} className="flex flex-col items-center w-full min-w-0">
      {/* Compact floating zoom control */}
      <div className="sticky top-2 z-30 mb-2 flex items-center rounded-full border border-[hsl(var(--border))]/80 bg-[hsl(var(--card))]/85 p-0.5 shadow-lg shadow-black/5 backdrop-blur-xl">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setInternalScale((s) => Math.max(0.5, s - 0.1))}
          aria-label={t('viewer.zoomOut')}
          className="h-11 w-11 rounded-full"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <button
          type="button"
          onClick={() => setInternalScale(1)}
          className="min-h-11 min-w-12 rounded-full px-1 text-center text-xs font-semibold tabular-nums text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
          aria-label={`${Math.round(scale * 100)}%. ${t('viewer.resetZoom')}`}
          title={t('viewer.resetZoom')}
        >
          {Math.round(scale * 100)}%
        </button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setInternalScale((s) => Math.min(2, s + 0.1))}
          aria-label={t('viewer.zoomIn')}
          className="h-11 w-11 rounded-full"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
      </div>

      {/* PDF pages in a continuous scroll. */}
      <Document
        key={`${fileUrl}-${reloadKey}`}
        file={fileUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        onLoadError={(err) => {
          console.error('PdfViewer load error:', err)
          setTotalPages(0)
          setLoadError(t('viewer.pdfLoadFailed'))
        }}
        loading={
          <div className="w-full min-w-[260px] max-w-[680px] h-[70vh] flex items-center justify-center" role="status" aria-live="polite">
            <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            <span className="sr-only">{t('viewer.loadingPdf')}</span>
          </div>
        }
        error={
          <div role="alert" className="w-full min-w-[260px] max-w-[680px] h-[50vh] px-6 text-center flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
            <p>{loadError || t('viewer.pdfLoadFailed')}</p>
            <Button className="mt-4" variant="outline" onClick={handleRetry} disabled={retrying}>
              {retrying ? t('viewer.retrying') : t('viewer.tryAgain')}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col items-center gap-4">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} className="shadow-md" data-page-number={pageNum}>
              <PageWithOverlay
                pageNumber={pageNum}
                scale={scale}
                width={pageWidth}
                onPageClick={onPageClick}
                renderPageOverlay={renderPageOverlay}
                onPagePointerMove={onPagePointerMove}
                onPageMouseLeave={onPageMouseLeave}
                placementMode={placementMode}
              />
            </div>
          ))}
        </div>
      </Document>
    </div>
  )
}
