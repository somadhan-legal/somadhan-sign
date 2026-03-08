import { useRef, useEffect, useState } from 'react'
import SignaturePadLib from 'signature_pad'
import { Pen, Type, Upload, RotateCcw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import { useLanguageStore } from '@/stores/languageStore'
import { useThemeStore } from '@/stores/themeStore'

interface SignaturePadProps {
  onSave: (dataUrl: string, type: 'drawn' | 'uploaded' | 'typed') => void
  onCancel?: () => void
  onApplyToAll?: (dataUrl: string) => void
  showApplyAll?: boolean
  applyAllLabel?: string
  saveLabel?: string
}

type TabType = 'draw' | 'type' | 'upload'

export default function SignaturePad({ onSave, onApplyToAll, showApplyAll, applyAllLabel, saveLabel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('upload')
  const [typedName, setTypedName] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const { t } = useLanguageStore()
  const { isDark } = useThemeStore()

  useEffect(() => {
    if (canvasRef.current && activeTab === 'draw') {
      const canvas = canvasRef.current
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(2, 2)

      padRef.current = new SignaturePadLib(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: isDark ? '#ffffff' : '#1e293b',
        minWidth: 1.5,
        maxWidth: 3,
      })
    }

    return () => {
      padRef.current?.off()
    }
  }, [activeTab, isDark])

  const handleClear = () => {
    padRef.current?.clear()
  }

  // Convert drawn signature to black ink (for PDF — paper is always white)
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
      if (!typedName.trim()) return null
      const canvas = document.createElement('canvas')
      canvas.width = 600
      canvas.height = 200
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.fillStyle = 'transparent'
        ctx.fillRect(0, 0, 600, 200)
        ctx.font = 'italic 64px "Georgia", serif'
        ctx.fillStyle = '#1e293b'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(typedName, 300, 100)
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setUploadedImage(reader.result as string)
    reader.readAsDataURL(file)
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

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-[hsl(var(--muted))] rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-colors cursor-pointer ${
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
        <div className="relative">
          <canvas
            ref={canvasRef}
            className="w-full h-48 border-2 border-dashed border-[hsl(var(--border))] rounded-lg cursor-crosshair"
          />
          <button
            onClick={handleClear}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-[hsl(var(--card))]/80 hover:bg-[hsl(var(--card))] shadow-sm cursor-pointer"
            title="Clear"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <p className="text-xs text-center text-[hsl(var(--muted-foreground))] mt-2">
            Draw your signature above
          </p>
        </div>
      )}

      {activeTab === 'type' && (
        <div>
          <Input
            placeholder="Type your full name"
            value={typedName}
            onChange={(e) => setTypedName(e.target.value)}
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
        <div>
          <div className="border-2 border-dashed border-[hsl(var(--border))] rounded-lg p-6 text-center hover:border-[hsl(var(--primary))] transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="sig-upload"
            />
            <label htmlFor="sig-upload" className="cursor-pointer">
              {uploadedImage ? (
                <img
                  src={uploadedImage}
                  alt="Uploaded signature"
                  className="max-h-32 mx-auto"
                />
              ) : (
                <>
                  <Upload className="w-8 h-8 mx-auto text-[hsl(var(--muted-foreground))]/50 mb-2" />
                  <p className="text-sm font-medium mb-1">Click to upload signature image</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
                    PNG, JPG up to 2MB
                  </p>
                  <p className="text-xs text-[hsl(var(--primary))] font-medium">
                    💡 Upload PNG/JPG with transparent background for better appearance
                  </p>
                </>
              )}
            </label>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={handleSave}>
          {saveLabel || t('signee.saveSignature') || 'Save'}
        </Button>
        {showApplyAll && onApplyToAll && (
          <Button className="flex-1" onClick={handleApplyToAll}>
            {applyAllLabel || t('signee.applyToAll')}
          </Button>
        )}
      </div>
    </div>
  )
}
