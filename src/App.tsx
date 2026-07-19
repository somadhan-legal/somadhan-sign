import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import NotFoundPage from '@/pages/NotFoundPage'

const DashboardPage = lazy(() => import('@/pages/DashboardPage'))
const DocumentEditorPage = lazy(() => import('@/pages/DocumentEditorPage'))
const DocumentPreviewPage = lazy(() => import('@/pages/DocumentPreviewPage'))
const InviteSigningPage = lazy(() => import('@/pages/InviteSigningPage'))
const ViewDocumentPage = lazy(() => import('@/pages/ViewDocumentPage'))
const ResetPasswordPage = lazy(() => import('@/pages/ResetPasswordPage'))

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function HomeRedirect() {
  const { user, initialized, loading } = useAuthStore()
  
  // Show loading while checking auth state
  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  
  // Redirect to dashboard if user is authenticated
  if (user) return <Navigate to="/dashboard" replace />
  
  // Show landing page for non-authenticated users
  return <LandingPage />
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <BrowserRouter>
      <Routes>
        {/* Public signing route — no auth required */}
        <Route path="/sign/:token" element={<Suspense fallback={<PageLoader />}><InviteSigningPage /></Suspense>} />
        {/* Public view-only route for CC recipients — no auth required */}
        <Route path="/view/:documentId" element={<Suspense fallback={<PageLoader />}><ViewDocumentPage /></Suspense>} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<HomeRedirect />} />

        <Route element={<Layout />}>
          <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense>} />
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
