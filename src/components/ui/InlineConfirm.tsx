import { useEffect, useRef, useState } from 'react'
import Button from './Button'
import { useLanguageStore } from '@/stores/languageStore'

interface InlineConfirmProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  message: string
  confirmText?: string
  cancelText?: string
}

export default function InlineConfirm({
  isOpen,
  onClose,
  onConfirm,
  message,
  confirmText,
  cancelText,
}: InlineConfirmProps) {
  const { t } = useLanguageStore()
  const ref = useRef<HTMLDivElement>(null)
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
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>('button')?.focus())

    const handleClickOutside = (e: MouseEvent) => {
      if (!confirmingRef.current && ref.current && !ref.current.contains(e.target as Node)) {
        onCloseRef.current()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || confirmingRef.current) return
      event.preventDefault()
      onCloseRef.current()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleConfirm = async () => {
    if (confirmingRef.current) return
    confirmingRef.current = true
    setConfirming(true)
    setConfirmError('')
    let completed = false
    try {
      await onConfirm()
      completed = true
    } catch {
      setConfirmError(t('common.confirmActionFailed'))
    } finally {
      confirmingRef.current = false
      setConfirming(false)
    }
    if (completed) onClose()
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t('common.confirmation')}
      aria-busy={confirming}
      className="absolute right-0 top-full mt-1 z-50 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-xl p-3 min-w-[200px] animate-[fadeIn_0.15s_ease-out]"
    >
      <p className="text-xs text-[hsl(var(--foreground))] mb-3 leading-relaxed">
        {message}
      </p>
      {confirmError && (
        <p role="alert" className="mb-3 text-xs font-medium text-[hsl(var(--destructive))]">
          {confirmError}
        </p>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs py-1"
          onClick={onClose}
          disabled={confirming}
        >
          {cancelText ?? t('common.cancel')}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="flex-1 text-xs py-1"
          onClick={() => void handleConfirm()}
          disabled={confirming}
        >
          {confirming && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
          )}
          {confirmText ?? t('common.ok')}
        </Button>
      </div>
    </div>
  )
}
