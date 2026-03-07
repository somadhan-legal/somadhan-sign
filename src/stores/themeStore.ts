import { create } from 'zustand'

interface ThemeState {
  isDark: boolean
  toggle: () => void
  setDark: (dark: boolean) => void
}

export const useThemeStore = create<ThemeState>((set) => {
  const stored = localStorage.getItem('theme')
  const isDark = stored === 'dark'

  // Apply on load
  if (isDark) {
    document.documentElement.classList.add('dark')
  }

  return {
    isDark,
    toggle: () =>
      set((state) => {
        const next = !state.isDark
        localStorage.setItem('theme', next ? 'dark' : 'light')
        document.documentElement.classList.toggle('dark', next)
        return { isDark: next }
      }),
    setDark: (dark: boolean) =>
      set(() => {
        localStorage.setItem('theme', dark ? 'dark' : 'light')
        document.documentElement.classList.toggle('dark', dark)
        return { isDark: dark }
      }),
  }
})
