import { useEffect, useId, useRef, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import Button from './Button'
import { useLanguageStore } from '@/stores/languageStore'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
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
  confirmText,
  cancelText,
  variant = 'warning'
}: ConfirmDialogProps) {
  const { t } = useLanguageStore()
  const titleId = useId()
  const messageId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)
  const cancelButtonRef = useRef<HTMLButtonElement>(null)
  const onCloseRef = useRef(onClose)
  const confirmingRef = useRef(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => cancelButtonRef.current?.focus())
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        if (!confirmingRef.current) {
          setConfirmError('')
          onCloseRef.current()
        }
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ))
      if (focusable.length === 0) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = previousOverflow
      previouslyFocused?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleClose = () => {
    if (confirmingRef.current) return
    setConfirmError('')
    onClose()
  }

  const handleConfirm = async () => {
    if (confirmingRef.current) return
    confirmingRef.current = true
    setConfirming(true)
    setConfirmError('')
    try {
      await onConfirm()
      onClose()
    } catch {
      setConfirmError(t('common.confirmActionFailed'))
    } finally {
      confirmingRef.current = false
      setConfirming(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-label={t('common.closeConfirmation')}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm cursor-default"
        onClick={handleClose}
        disabled={confirming}
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        aria-busy={confirming}
        tabIndex={-1}
        className="relative bg-[hsl(var(--card))] rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden outline-none"
      >
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
              <h3 id={titleId} className="text-lg font-semibold mb-2">{title}</h3>
              <p id={messageId} className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">{message}</p>
            </div>
          </div>
        </div>
        {confirmError && (
          <p role="alert" className="px-6 pb-3 text-sm font-medium text-[hsl(var(--destructive))]">
            {confirmError}
          </p>
        )}
        <div className="flex gap-3 px-6 pb-6">
          <Button
            ref={cancelButtonRef}
            variant="outline"
            className="flex-1"
            onClick={handleClose}
            disabled={confirming}
          >
            {cancelText ?? t('common.cancel')}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'primary'}
            className="flex-1"
            onClick={() => void handleConfirm()}
            disabled={confirming}
          >
            {confirming && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
            )}
            {confirmText ?? t('common.ok')}
          </Button>
        </div>
      </div>
    </div>
  )
}
