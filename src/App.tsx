import { useEffect, lazy, Suspense, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import NotFoundPage from '@/pages/NotFoundPage'
import { useLanguageStore } from '@/stores/languageStore'
import { getRouteTitle } from '@/lib/routeMetadata'

const LandingPage = lazy(() => import('@/pages/LandingPage'))
const LoginPage = lazy(() => import('@/pages/LoginPage'))
const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const DocumentEditorPage = lazy(() => import('@/pages/DocumentEditorPage'))
const DocumentPreviewPage = lazy(() => import('@/pages/DocumentPreviewPage'))
const InviteSigningPage = lazy(() => import('@/pages/InviteSigningPage'))
const ViewDocumentPage = lazy(() => import('@/pages/ViewDocumentPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))

function PageLoader() {
  const { t } = useLanguageStore()
  return (
    <div className="min-h-dvh flex items-center justify-center" role="status" aria-live="polite">
      <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" aria-hidden="true" />
      <span className="sr-only">{t('common.loadingPage')}</span>
    </div>
  )
}

function hasStoredAuthSession() {
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (key?.startsWith('sb-') && key.endsWith('-auth-token') && window.localStorage.getItem(key)) {
        return true
      }
    }
  } catch {
    // Storage can be unavailable in strict browser privacy modes.
  }
  return false
}

function hasAuthCallbackParameters() {
  const query = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.slice(1))
  return query.has('code')
    || hash.has('access_token')
    || hash.get('type') === 'recovery'
    || hash.has('error')
}

function AuthInitializer() {
  const { pathname } = useLocation()
  const initialize = useAuthStore((state) => state.initialize)

  useEffect(() => {
    if (pathname !== '/' || hasStoredAuthSession() || hasAuthCallbackParameters()) {
      void initialize()
    }
  }, [initialize, pathname])

  return null
}

function HomeRedirect() {
  const { user, initialized, loading } = useAuthStore()
  const [shouldWaitForSession] = useState(() => hasStoredAuthSession() || hasAuthCallbackParameters())
  
  // Avoid flashing the public page for a returning authenticated user. A visitor
  // with no stored session can see the landing page while auth initializes.
  if ((!initialized || loading) && shouldWaitForSession) {
    return <PageLoader />
  }
  
  // Redirect to dashboard if user is authenticated
  if (user) return <Navigate to="/dashboard" replace />
  
  // Show landing page for non-authenticated users
  return <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>
}

function RouteMetadata() {
  const { pathname } = useLocation()

  useEffect(() => {
    document.title = getRouteTitle(pathname)
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = pathname === '/' ? 'index,follow' : 'noindex,nofollow,noarchive'
  }, [pathname])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthInitializer />
      <RouteMetadata />
      <Routes>
        {/* Public signing route. No account authentication is required. */}
        <Route path="/sign/:token" element={<Suspense fallback={<PageLoader />}><InviteSigningPage /></Suspense>} />
        {/* Public view-only route for CC recipients. No account authentication is required. */}
        <Route path="/view/:documentId" element={<Suspense fallback={<PageLoader />}><ViewDocumentPage /></Suspense>} />
        <Route path="/login" element={<Suspense fallback={<PageLoader />}><LoginPage /></Suspense>} />
        <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<Layout />}>
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/document/:id/edit"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}><DocumentEditorPage /></Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/document/:id"
            element={
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}><DocumentPreviewPage /></Suspense>
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
