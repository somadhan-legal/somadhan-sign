import { useEffect, useState } from 'react'

const TABLET_QUERY = '(max-width: 1023px)'

export const useResponsivePanel = () => {
  const [collapsed, setCollapsed] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(TABLET_QUERY).matches
  )

  useEffect(() => {
    const media = window.matchMedia(TABLET_QUERY)
    const handleWidthChange = (event: MediaQueryListEvent) => {
      if (event.matches) setCollapsed(true)
    }
    media.addEventListener('change', handleWidthChange)
    return () => media.removeEventListener('change', handleWidthChange)
  }, [])

  useEffect(() => {
    if (collapsed) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setCollapsed(true)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [collapsed])

  return [collapsed, setCollapsed] as const
}
