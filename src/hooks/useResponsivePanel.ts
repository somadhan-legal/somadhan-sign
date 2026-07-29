import { useCallback, useEffect, useRef, useState, type SetStateAction } from 'react'

// Keep the PDF workspace in its single-canvas layout on tablets, including
// 1024px iPad landscape. At 1280px there is enough room for the editor's PDF
// plus both desktop sidebars without squeezing the document.
const TABLET_QUERY = '(max-width: 1279px)'

export const usesOverlayWorkspacePanels = () =>
  typeof window !== 'undefined' && window.matchMedia(TABLET_QUERY).matches

export const useResponsivePanel = () => {
  const [collapsed, setCollapsed] = useState(usesOverlayWorkspacePanels)
  const panelTriggerRef = useRef<HTMLElement | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const updateCollapsed = useCallback((nextState: SetStateAction<boolean>) => {
    setCollapsed((previousState) => {
      const nextCollapsed = typeof nextState === 'function'
        ? nextState(previousState)
        : nextState

      if (previousState && !nextCollapsed) {
        panelTriggerRef.current = document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null
      } else if (!previousState && nextCollapsed) {
        const trigger = panelTriggerRef.current
        requestAnimationFrame(() => trigger?.focus())
      }

      return nextCollapsed
    })
  }, [])

  useEffect(() => {
    const media = window.matchMedia(TABLET_QUERY)
    const handleWidthChange = (event: MediaQueryListEvent) => {
      setCollapsed(event.matches)
    }
    media.addEventListener('change', handleWidthChange)
    return () => media.removeEventListener('change', handleWidthChange)
  }, [])

  useEffect(() => {
    if (collapsed) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (!usesOverlayWorkspacePanels()) return
      if (document.querySelector('[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]')) return
      updateCollapsed(true)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [collapsed, updateCollapsed])

  useEffect(() => {
    const panel = panelRef.current
    if (collapsed || !panel || !usesOverlayWorkspacePanels()) return

    const focusableSelector = [
      'button:not([disabled])',
      'a[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')
    requestAnimationFrame(() => {
      panel.querySelector<HTMLElement>(focusableSelector)?.focus()
    })

    const containPanelFocus = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const activeModal = Array.from(document.querySelectorAll<HTMLElement>(
        '[role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]'
      )).find((candidate) => candidate !== panel)
      if (activeModal) return

      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(focusableSelector))
      if (focusable.length === 0) {
        event.preventDefault()
        panel.focus()
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

    document.addEventListener('keydown', containPanelFocus)
    return () => document.removeEventListener('keydown', containPanelFocus)
  }, [collapsed])

  return [collapsed, updateCollapsed, panelRef] as const
}
