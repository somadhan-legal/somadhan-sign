import { Outlet } from 'react-router-dom'
import Navbar from './Navbar'
import { useLanguageStore } from '@/stores/languageStore'

export default function Layout() {
  const { t } = useLanguageStore()
  return (
    <div className="h-dvh flex flex-col bg-[hsl(var(--background))] overflow-hidden">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        {t('common.skipToContent')}
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 min-h-0 overflow-auto outline-none">
        <Outlet />
      </main>
    </div>
  )
}
