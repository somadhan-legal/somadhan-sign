import { Navigate, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore()
  const { t } = useLanguageStore()
  const location = useLocation()

  if (!initialized || loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center" role="status" aria-live="polite">
        <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
        <span className="sr-only">{t('common.loadingPage')}</span>
      </div>
    )
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to={`/login?next=${encodeURIComponent(returnTo)}`} replace />
  }

  return <>{children}</>
}
