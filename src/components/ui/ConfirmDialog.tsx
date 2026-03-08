import { AlertTriangle } from 'lucide-react'
import Button from './Button'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel',
  variant = 'warning'
}: ConfirmDialogProps) {
  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              variant === 'danger' ? 'bg-[hsl(var(--destructive))]/10' :
              variant === 'warning' ? 'bg-[hsl(var(--warning))]/10' :
              'bg-[hsl(var(--primary))]/10'
            }`}>
              <AlertTriangle className={`w-6 h-6 ${
                variant === 'danger' ? 'text-[hsl(var(--destructive))]' :
                variant === 'warning' ? 'text-[hsl(var(--warning))]' :
                'text-[hsl(var(--primary))]'
              }`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold mb-2">{title}</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'primary'}
            className="flex-1"
            onClick={handleConfirm}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
