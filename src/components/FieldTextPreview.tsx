import { useLayoutEffect, useRef, useState } from 'react'
import { fitSingleLineFieldText, normalizeFieldText } from '@/lib/fieldText'

interface FieldTextPreviewProps {
  value: string
}

export default function FieldTextPreview({ value }: FieldTextPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const normalizedValue = normalizeFieldText(value)
  const [fitted, setFitted] = useState({ text: normalizedValue, size: 14 })

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    let active = true
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')

    const update = () => {
      if (!active || !context) return
      const availableWidth = Math.max(container.clientWidth - 4, 1)
      const next = fitSingleLineFieldText(
        normalizedValue,
        (text, size) => {
          context.font = `${size}px "Noto Sans Bengali", Arial, sans-serif`
          return context.measureText(text).width
        },
        availableWidth,
        14,
      )
      setFitted((current) =>
        current.text === next.text && current.size === next.size ? current : next
      )
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(container)
    void document.fonts?.ready.then(update)
    return () => {
      active = false
      observer.disconnect()
    }
  }, [normalizedValue])

  return (
    <div ref={containerRef} className="flex h-full w-full items-end overflow-hidden px-0.5">
      <span
        className="block max-w-full whitespace-nowrap font-normal leading-tight text-black"
        style={{ fontSize: `${fitted.size}px` }}
        title={fitted.text === normalizedValue ? undefined : normalizedValue}
      >
        {fitted.text}
      </span>
    </div>
  )
}
