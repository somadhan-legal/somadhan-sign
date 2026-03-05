import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore()

  if (!initialized || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
