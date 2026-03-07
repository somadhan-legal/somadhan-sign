import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle2, Lock } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import SomadhanLogoLight from '@/assets/sign_Somadhan_light.svg'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'
import { useThemeStore } from '@/stores/themeStore'
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
  const { isDark } = useThemeStore()
  const { t } = useLanguageStore()

  useEffect(() => {
    // Check URL for error parameters
    const params = new URLSearchParams(window.location.hash.substring(1))
    const errorParam = params.get('error')
    const errorDesc = params.get('error_description')
    
    if (errorParam) {
      if (errorParam === 'access_denied' || errorDesc?.includes('expired') || errorDesc?.includes('invalid')) {
        setError(t('reset.linkExpired'))
      } else {
        setError(errorDesc || t('reset.errorOccurred'))
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
      setError(t('reset.passwordTooShort'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('reset.passwordsDoNotMatch'))
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      setSuccess(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('reset.failedToUpdate'))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="bg-[hsl(var(--card))] rounded-2xl p-8 max-w-sm w-full text-center shadow-xl">
          <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-9 h-9 text-[hsl(var(--success))]" />
          </div>
          <h3 className="text-xl font-bold mb-2">{t('reset.passwordUpdated')}</h3>
          <p className="text-[hsl(var(--muted-foreground))] mb-6">
            {t('reset.passwordUpdatedDesc')}
          </p>
          <Button
            className="w-full h-11"
            onClick={() => navigate('/login')}
          >
            {t('reset.goToLogin')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
      <div className="bg-[hsl(var(--card))] rounded-2xl p-8 max-w-md w-full shadow-xl">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-14" />
        </div>

        <div className="w-14 h-14 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-[hsl(var(--primary))]" />
        </div>
        <h2 className="text-2xl font-bold mb-1 text-center">{t('reset.setNewPassword')}</h2>
        <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center">
          {t('reset.enterNewPassword')}
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] text-sm">
            {error}
            {error.includes('expired') || error.includes('invalid') ? (
              <div className="mt-3">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  {t('reset.backToLogin')}
                </Button>
              </div>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label={t('reset.newPassword')}
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
            label={t('reset.confirmPassword')}
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
              t('reset.updatePassword')
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
