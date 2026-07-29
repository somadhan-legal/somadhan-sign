import { useRef, useEffect, useId, useState } from 'react'
import SignaturePadLib from 'signature_pad'
import type { PointGroup } from 'signature_pad'
import { Pen, Type, Upload, RotateCcw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useLanguageStore } from '@/stores/languageStore'
import { useThemeStore } from '@/stores/themeStore'
import { normalizeSignatureImage, validateSignatureImage } from '@/lib/fileValidation'
import { getFittedSignatureFontSize } from '@/lib/typedSignature'

interface SignaturePadProps {
  onSave: (dataUrl: string, type: 'drawn' | 'uploaded' | 'typed') => void
  onApplyToAll?: (dataUrl: string) => void
  showApplyAll?: boolean
  applyAllLabel?: string
  saveLabel?: string
}

type TabType = 'draw' | 'type' | 'upload'

export default function SignaturePad({ onSave, onApplyToAll, showApplyAll, applyAllLabel, saveLabel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tabRefs = useRef<Record<TabType, HTMLButtonElement | null>>({
    upload: null,
    draw: null,
    type: null,
  })
  const padRef = useRef<SignaturePadLib | null>(null)
  const drawingDataRef = useRef<PointGroup[]>([])
  const uploadRequestRef = useRef(0)
  const [activeTab, setActiveTab] = useState<TabType>('draw')
  const [typedName, setTypedName] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState('')
  const [processingUpload, setProcessingUpload] = useState(false)
  const [hasDrawing, setHasDrawing] = useState(false)
  const tabGroupId = useId()
  const { t } = useLanguageStore()
  const { isDark } = useThemeStore()

  useEffect(() => {
    if (canvasRef.current && activeTab === 'draw') {
      const canvas = canvasRef.current
      let previousCssWidth = Math.max(canvas.offsetWidth, 1)
      let previousCssHeight = Math.max(canvas.offsetHeight, 1)
      const resizeCanvas = (preserveStrokes = true) => {
        const pad = padRef.current
        const strokes = preserveStrokes && pad ? pad.toData() : []
        const ratio = Math.max(window.devicePixelRatio || 1, 1)
        const cssWidth = Math.max(canvas.offsetWidth, 1)
        const cssHeight = Math.max(canvas.offsetHeight, 1)
        const width = Math.max(Math.round(cssWidth * ratio), 1)
        const height = Math.max(Math.round(cssHeight * ratio), 1)
        if (canvas.width === width && canvas.height === height) return
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')?.scale(ratio, ratio)
        if (strokes.length > 0) {
          const scaleX = cssWidth / previousCssWidth
          const scaleY = cssHeight / previousCssHeight
          pad?.fromData(strokes.map((stroke) => ({
            ...stroke,
            points: stroke.points.map((point) => ({
              ...point,
              x: point.x * scaleX,
              y: point.y * scaleY,
            })),
          })))
        }
        previousCssWidth = cssWidth
        previousCssHeight = cssHeight
      }

      resizeCanvas(false)
      const pad = new SignaturePadLib(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: isDark ? '#ffffff' : '#1e293b',
        minWidth: 1.5,
        maxWidth: 3,
      })
      padRef.current = pad
      if (drawingDataRef.current.length > 0) {
        const penColor = isDark ? '#ffffff' : '#1e293b'
        const restoredDrawing = drawingDataRef.current.map((stroke) => ({
          ...stroke,
          penColor,
        }))
        pad.fromData(restoredDrawing)
        drawingDataRef.current = restoredDrawing
        setHasDrawing(true)
      }
      const handleStrokeEnd = () => {
        drawingDataRef.current = pad.toData()
        setHasDrawing(!pad.isEmpty())
      }
      pad.addEventListener('endStroke', handleStrokeEnd)
      const resizeObserver = new ResizeObserver(() => resizeCanvas())
      resizeObserver.observe(canvas)

      return () => {
        drawingDataRef.current = pad.toData()
        resizeObserver.disconnect()
        pad.off()
        if (padRef.current === pad) padRef.current = null
      }
    }

    return () => {
      padRef.current?.off()
    }
  }, [activeTab, isDark])

  const handleClear = () => {
    padRef.current?.clear()
    drawingDataRef.current = []
    setHasDrawing(false)
  }

  // Convert the drawn signature to black ink because PDF paper is always white.
  const getBlackInkDataUrl = (): string | null => {
    if (activeTab === 'draw') {
      if (padRef.current?.isEmpty() || !canvasRef.current) return null
      const srcCanvas = canvasRef.current
      const outCanvas = document.createElement('canvas')
      outCanvas.width = srcCanvas.width
      outCanvas.height = srcCanvas.height
      const ctx = outCanvas.getContext('2d')!
      ctx.drawImage(srcCanvas, 0, 0)
      if (isDark) {
        // Invert white strokes to black
        const imgData = ctx.getImageData(0, 0, outCanvas.width, outCanvas.height)
        const d = imgData.data
        for (let i = 0; i < d.length; i += 4) {
          if (d[i + 3] > 0) { // has opacity
            d[i] = 0;     // R
            d[i + 1] = 0;  // G
            d[i + 2] = 0;  // B
          }
        }
        ctx.putImageData(imgData, 0, 0)
      }
      return outCanvas.toDataURL('image/png')
    } else if (activeTab === 'type') {
      const signatureText = typedName.trim()
      if (!signatureText) return null
      const canvas = document.createElement('canvas')
      canvas.width = 600
      canvas.height = 200
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const fontFamily = '"Georgia", "Noto Sans Bengali", serif'
        const fontSize = getFittedSignatureFontSize(
          signatureText,
          (size) => {
            ctx.font = `italic ${size}px ${fontFamily}`
            return ctx.measureText(signatureText).width
          },
          540,
        )
        ctx.fillStyle = 'transparent'
        ctx.fillRect(0, 0, 600, 200)
        ctx.font = `italic ${fontSize}px ${fontFamily}`
        ctx.fillStyle = '#1e293b'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(signatureText, 300, 100, 540)
      }
      return canvas.toDataURL('image/png')
    } else if (activeTab === 'upload' && uploadedImage) {
      return uploadedImage
    }
    return null
  }

  const handleSave = () => {
    const dataUrl = getBlackInkDataUrl()
    if (!dataUrl) return
    const type = activeTab === 'draw' ? 'drawn' : activeTab === 'type' ? 'typed' : 'uploaded'
    onSave(dataUrl, type)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const requestId = ++uploadRequestRef.current
    const file = e.target.files?.[0]
    if (!file) return
    const validationError = validateSignatureImage(file)
    if (validationError) {
      const validationKeys: Record<string, string> = {
        'The selected image is empty.': 'signee.signatureImageEmpty',
        'The signature image must be 2 MB or smaller.': 'signee.signatureImageTooLarge',
        'Use a PNG, JPG, or WebP image.': 'signee.signatureImageTypeInvalid',
      }
      setUploadedImage(null)
      setUploadError(validationKeys[validationError] ? t(validationKeys[validationError]) : validationError)
      setProcessingUpload(false)
      e.target.value = ''
      return
    }
    setUploadError('')
    setUploadedImage(null)
    setProcessingUpload(true)
    try {
      const normalizedImage = await normalizeSignatureImage(file)
      if (requestId === uploadRequestRef.current) setUploadedImage(normalizedImage)
    } catch {
      if (requestId === uploadRequestRef.current) {
        setUploadedImage(null)
        setUploadError(t('signee.signatureImagePrepareFailed'))
      }
    } finally {
      if (requestId === uploadRequestRef.current) setProcessingUpload(false)
    }
  }

  const handleApplyToAll = () => {
    const dataUrl = getBlackInkDataUrl()
    if (dataUrl && onApplyToAll) {
      onApplyToAll(dataUrl)
    }
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'upload', label: t('signee.tabUpload') || 'Upload', icon: <Upload className="w-4 h-4" /> },
    { id: 'draw', label: t('signee.tabDraw') || 'Draw', icon: <Pen className="w-4 h-4" /> },
    { id: 'type', label: t('signee.tabType') || 'Type', icon: <Type className="w-4 h-4" /> },
  ]
  const hasValue = activeTab === 'draw'
    ? hasDrawing
    : activeTab === 'type'
      ? Boolean(typedName.trim())
      : Boolean(uploadedImage) && !processingUpload
  const selectTab = (tab: TabType, moveFocus = false) => {
    setActiveTab(tab)
    if (moveFocus) requestAnimationFrame(() => tabRefs.current[tab]?.focus())
  }
  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>, tab: TabType) => {
    const currentIndex = tabs.findIndex(({ id }) => id === tab)
    let nextIndex: number | null = null

    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    selectTab(tabs[nextIndex].id, true)
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-[hsl(var(--muted))] rounded-lg p-1" role="tablist" aria-label={t('signee.signatureMethod')}>
        {tabs.map((tab) => (
          <button
            type="button"
            key={tab.id}
            ref={(node) => { tabRefs.current[tab.id] = node }}
            id={`${tabGroupId}-${tab.id}-tab`}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`${tabGroupId}-${tab.id}-panel`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            onClick={() => selectTab(tab.id)}
            onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
            className={`flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[hsl(var(--card))] shadow-sm text-[hsl(var(--foreground))]'
                : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'draw' && (
        <div
          id={`${tabGroupId}-draw-panel`}
          role="tabpanel"
          aria-labelledby={`${tabGroupId}-draw-tab`}
          className="relative"
        >
          <canvas
            ref={canvasRef}
            aria-label={t('signee.drawSignature')}
            className="w-full h-48 touch-none border-2 border-dashed border-[hsl(var(--border))] rounded-lg cursor-crosshair"
          />
          <button
            type="button"
            onClick={handleClear}
            aria-label={t('signee.clearSignature')}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-md bg-[hsl(var(--card))]/80 shadow-sm hover:bg-[hsl(var(--card))] cursor-pointer"
            title={t('signee.clear')}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <p className="text-xs text-center text-[hsl(var(--muted-foreground))] mt-2">
            {t('signee.drawAbove')}
          </p>
        </div>
      )}

      {activeTab === 'type' && (
        <div
          id={`${tabGroupId}-type-panel`}
          role="tabpanel"
          aria-labelledby={`${tabGroupId}-type-tab`}
        >
          <Input
            label={t('signee.typedSignatureLabel')}
            placeholder={t('signee.typeFullName')}
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
            maxLength={80}
          />
          {typedName && (
            <div className="mt-3 p-4 border border-[hsl(var(--border))] rounded-lg text-center">
              <span className="text-3xl italic font-serif text-[hsl(var(--foreground))]">
                {typedName}
              </span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'upload' && (
        <div
          id={`${tabGroupId}-upload-panel`}
          role="tabpanel"
          aria-labelledby={`${tabGroupId}-upload-tab`}
        >
          <div className="overflow-hidden rounded-lg border-2 border-dashed border-[hsl(var(--border))] text-center transition-colors hover:border-[hsl(var(--primary))]">
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              onChange={handleFileUpload}
              className="hidden"
              id="sig-upload"
              disabled={processingUpload}
            />
            <label
              htmlFor="sig-upload"
              className={`flex min-h-40 w-full flex-col items-center justify-center p-6 ${
                processingUpload ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
              }`}
            >
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt={t('signee.uploadedSignature')}
                  className="max-h-32 mx-auto"
                />
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]/50 mb-2" />
                  <p className="text-sm font-medium mb-1">{t('signee.uploadSignatureImage')}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
                    {t('signee.signatureImageFormats')}
                  </p>
                  <p className="text-xs text-[hsl(var(--primary))] font-medium">
                    {t('signee.transparentImageHint')}
                  </p>
                </>
              )}
            </label>
          </div>
          {uploadError && <p role="alert" className="mt-2 text-sm text-[hsl(var(--destructive))]">{uploadError}</p>}
          {processingUpload && <p role="status" className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">{t('signee.preparingSignatureImage')}</p>}
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={handleSave} disabled={!hasValue || processingUpload}>
          {saveLabel || t('signee.saveSignature') || 'Save'}
        </Button>
        {showApplyAll && onApplyToAll && (
          <Button className="flex-1" onClick={handleApplyToAll} disabled={!hasValue || processingUpload}>
            {applyAllLabel || t('signee.applyToAll')}
          </Button>
        )}
      </div>
    </div>
  )
}
