import { useRef, useEffect, useState } from 'react'
import SignaturePadLib from 'signature_pad'
import { Pen, Type, Upload, RotateCcw } from 'lucide-react'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

interface SignaturePadProps {
  onSave: (dataUrl: string, type: 'drawn' | 'uploaded' | 'typed') => void
  onCancel: () => void
}

type TabType = 'draw' | 'type' | 'upload'

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const padRef = useRef<SignaturePadLib | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('draw')
  const [typedName, setTypedName] = useState('')
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)

  useEffect(() => {
    if (canvasRef.current && activeTab === 'draw') {
      const canvas = canvasRef.current
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(2, 2)

      padRef.current = new SignaturePadLib(canvas, {
        backgroundColor: 'rgba(255, 255, 255, 0)',
        penColor: '#1e293b',
        minWidth: 1.5,
        maxWidth: 3,
      })
    }

    return () => {
      padRef.current?.off()
    }
  }, [activeTab])

  const handleClear = () => {
    padRef.current?.clear()
  }

  const handleSave = () => {
    if (activeTab === 'draw') {
      if (padRef.current?.isEmpty()) return
      const dataUrl = padRef.current?.toDataURL('image/png') || ''
      onSave(dataUrl, 'drawn')
    } else if (activeTab === 'type') {
      if (!typedName.trim()) return
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
      onSave(canvas.toDataURL('image/png'), 'typed')
    } else if (activeTab === 'upload' && uploadedImage) {
      onSave(uploadedImage, 'uploaded')
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setUploadedImage(reader.result as string)
    reader.readAsDataURL(file)
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'draw', label: 'Draw', icon: <Pen className="w-4 h-4" /> },
    { id: 'type', label: 'Type', icon: <Type className="w-4 h-4" /> },
    { id: 'upload', label: 'Upload', icon: <Upload className="w-4 h-4" /> },
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
                ? 'bg-white shadow-sm text-[hsl(var(--foreground))]'
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
            className="absolute top-2 right-2 p-1.5 rounded-md bg-white/80 hover:bg-white shadow-sm cursor-pointer"
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
                  <p className="text-sm">Click to upload signature image</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">
                    PNG, JPG up to 2MB
                  </p>
                </>
              )}
            </label>
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleSave}>
          Save Signature
        </Button>
      </div>
    </div>
  )
}
