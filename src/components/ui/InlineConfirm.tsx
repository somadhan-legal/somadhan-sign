import { useEffect, useRef } from 'react'
import Button from './Button'
import { useLanguageStore } from '@/stores/languageStore'

interface InlineConfirmProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  message: string
  confirmText?: string
  cancelText?: string
}

export default function InlineConfirm({
  isOpen,
  onClose,
  onConfirm,
  message,
  confirmText = 'OK',
  cancelText = 'Cancel'
}: InlineConfirmProps) {
  const { t } = useLanguageStore()
  const ref = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    requestAnimationFrame(() => ref.current?.querySelector<HTMLButtonElement>('button')?.focus())

    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onCloseRef.current()
      }
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
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

  const handleConfirm = () => {
    onConfirm()
    onClose()
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t('common.confirmation')}
      className="absolute right-0 top-full mt-1 z-50 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg shadow-xl p-3 min-w-[200px] animate-[fadeIn_0.15s_ease-out]"
    >
      <p className="text-xs text-[hsl(var(--foreground))] mb-3 leading-relaxed">
        {message}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-xs py-1"
          onClick={onClose}
        >
          {cancelText}
        </Button>
        <Button
          variant="destructive"
          size="sm"
          className="flex-1 text-xs py-1"
          onClick={handleConfirm}
        >
          {confirmText}
        </Button>
      </div>
    </div>
  )
}
