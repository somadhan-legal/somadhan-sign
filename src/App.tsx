import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router'
import { MotionConfig } from 'framer-motion'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import NotFoundPage from '@/pages/NotFoundPage'
import { useLanguageStore } from '@/stores/languageStore'

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

function HomeRedirect() {
  const { user, initialized, loading } = useAuthStore()
  
  // Show loading while checking auth state
  if (!initialized || loading) {
    return <PageLoader />
  }
  
  // Redirect to dashboard if user is authenticated
  if (user) return <Navigate to="/dashboard" replace />
  
  // Show landing page for non-authenticated users
  return <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
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
    </MotionConfig>
  )
}
