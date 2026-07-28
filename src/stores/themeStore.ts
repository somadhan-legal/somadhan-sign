import { create } from 'zustand'
import { readLocalPreference, writeLocalPreference } from '@/lib/browserStorage'

interface ThemeState {
  isDark: boolean
  toggle: () => void
  setDark: (dark: boolean) => void
}

export const useThemeStore = create<ThemeState>((set) => {
  const stored = readLocalPreference('theme')
  const isDark = stored === 'dark' || (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches)

  // Apply on load
  document.documentElement.classList.toggle('dark', isDark)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light'

  return {
    isDark,
    toggle: () =>
      set((state) => {
        const next = !state.isDark
        writeLocalPreference('theme', next ? 'dark' : 'light')
        document.documentElement.classList.toggle('dark', next)
        document.documentElement.style.colorScheme = next ? 'dark' : 'light'
        return { isDark: next }
      }),
    setDark: (dark: boolean) =>
      set(() => {
        writeLocalPreference('theme', dark ? 'dark' : 'light')
        document.documentElement.classList.toggle('dark', dark)
        document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
        return { isDark: dark }
      }),
  }
})
