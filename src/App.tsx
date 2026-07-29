import { useEffect, lazy, Suspense, useState } from 'react'
import {
  Navigate,
  Outlet,
  RouterProvider,
  createBrowserRouter,
  useLocation,
  useParams,
} from 'react-router'
import { useAuthStore } from '@/stores/authStore'
import Layout from '@/components/layout/Layout'
import ProtectedRoute from '@/components/layout/ProtectedRoute'
import NotFoundPage from '@/pages/NotFoundPage'
import { useLanguageStore } from '@/stores/languageStore'
import { getRouteTitle } from '@/lib/routeMetadata'
import { clearAuthReturnTo, readAuthReturnTo } from '@/lib/authRedirect'

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
  const [authReturnTo] = useState(() => readAuthReturnTo())

  useEffect(() => {
    if (user && authReturnTo) clearAuthReturnTo()
  }, [authReturnTo, user])
  
  // Avoid flashing the public page for a returning authenticated user. A visitor
  // with no stored session can see the landing page while auth initializes.
  if ((!initialized || loading) && shouldWaitForSession) {
    return <PageLoader />
  }
  
  // Redirect to dashboard if user is authenticated
  if (user) return <Navigate to={authReturnTo || '/dashboard'} replace />
  
  // Show landing page for non-authenticated users
  return <Suspense fallback={<PageLoader />}><LandingPage /></Suspense>
}

function PublicSigningRoute() {
  const { token } = useParams<{ token: string }>()
  return <Suspense fallback={<PageLoader />}><InviteSigningPage key={token} /></Suspense>
}

function PublicViewerRoute() {
  const { documentId } = useParams<{ documentId: string }>()
  return <Suspense fallback={<PageLoader />}><ViewDocumentPage key={documentId} /></Suspense>
}

function RouteMetadata() {
  const { pathname } = useLocation()
  const lang = useLanguageStore((state) => state.lang)

  useEffect(() => {
    document.title = getRouteTitle(pathname, lang)
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    if (!robots) {
      robots = document.createElement('meta')
      robots.name = 'robots'
      document.head.appendChild(robots)
    }
    robots.content = pathname === '/' ? 'index,follow' : 'noindex,nofollow,noarchive'
  }, [lang, pathname])

  return null
}

function AppShell() {
  return (
    <>
      <AuthInitializer />
      <RouteMetadata />
      <Outlet />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: '/sign/:token', element: <PublicSigningRoute /> },
      { path: '/view/:documentId', element: <PublicViewerRoute /> },
      { path: '/login', element: <Suspense fallback={<PageLoader />}><LoginPage /></Suspense> },
      { path: '/reset-password', element: <Suspense fallback={<PageLoader />}><ResetPasswordPage /></Suspense> },
      { path: '/', element: <HomeRedirect /> },
      {
        element: <Layout />,
        children: [
          {
            path: '/dashboard',
            element: (
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}><DashboardPage /></Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/document/:id/edit',
            element: (
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}><DocumentEditorPage /></Suspense>
              </ProtectedRoute>
            ),
          },
          {
            path: '/document/:id',
            element: (
              <ProtectedRoute>
                <Suspense fallback={<PageLoader />}><DocumentPreviewPage /></Suspense>
              </ProtectedRoute>
            ),
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
