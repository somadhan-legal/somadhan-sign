import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import SomadhanLogo from '@/assets/somadhan-logo.svg'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const { updatePassword, isRecovery, user } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Check URL for error parameters
    const params = new URLSearchParams(window.location.hash.substring(1))
    const errorParam = params.get('error')
    const errorDesc = params.get('error_description')
    
    if (errorParam) {
      if (errorParam === 'access_denied' || errorDesc?.includes('expired') || errorDesc?.includes('invalid')) {
        setError('This password reset link has expired or is invalid. Please request a new one.')
      } else {
        setError(errorDesc || 'An error occurred. Please try again.')
      }
    }

    // If no recovery session and no user, redirect to login after showing error
    if (!isRecovery && !user && !errorParam) {
      const timer = setTimeout(() => {
        if (!useAuthStore.getState().isRecovery && !useAuthStore.getState().user) {
          navigate('/login', { replace: true })
        }
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isRecovery, user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-green-600" />
          </div>
          <h3 className="text-xl font-bold mb-2">Password Updated!</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <Button
            className="w-full h-11"
            onClick={() => navigate('/login')}
          >
            Go to Login
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-xl">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src={SomadhanLogo} alt="RocketSign" className="w-9 h-9 rounded-xl" />
          <span className="text-xl font-bold">RocketSign</span>
        </div>

        <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-[hsl(var(--primary))]" />
        </div>
        <h2 className="text-2xl font-bold mb-1 text-center">Set New Password</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center">
          Enter your new password below
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            {error}
            {error.includes('expired') || error.includes('invalid') ? (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  Back to Login
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 bottom-[10px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Input
            label="Confirm Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
          />

          <Button type="submit" className="w-full h-11" disabled={submitting}>
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Update Password'
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
