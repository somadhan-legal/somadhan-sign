import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Eye, EyeOff, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useLanguageStore } from '@/stores/languageStore'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Modal from '@/components/ui/Modal'
import { getAuthErrorMessage } from '@/lib/authError'

type AuthMode = 'login' | 'signup' | 'verify-otp' | 'forgot-password'

export default function LoginPage() {
  const { t, lang, toggle: toggleLang } = useLanguageStore()
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : 'login'
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showVerifiedPopup, setShowVerifiedPopup] = useState(false)
  const [resendTimer, setResendTimer] = useState(0)
  const [otpAttempts, setOtpAttempts] = useState<number[]>([])
  const [blockedUntil, setBlockedUntil] = useState<number | null>(null)

  const {
    user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resendSignupOtp,
    verifySignupOtp,
    resetPassword,
  } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && !showVerifiedPopup) navigate('/dashboard', { replace: true })
  }, [user, navigate, showVerifiedPopup])

  // Timer countdown for OTP resend
  useEffect(() => {
    if (resendTimer > 0) {
      const interval = setInterval(() => {
        setResendTimer(prev => prev - 1)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [resendTimer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setMessage('')
    setSubmitting(true)

    try {
      switch (mode) {
        case 'login':
          await signInWithEmail(email, password)
          navigate('/dashboard')
          break
        case 'signup':
          if (blockedUntil && Date.now() < blockedUntil) {
            const remainingMin = Math.ceil((blockedUntil - Date.now()) / 60000)
            setError(t('login.tooManyAttempts').replace('{minutes}', String(remainingMin)))
            return
          }
          await signUpWithEmail(email, password, name)
          setMessage(t('login.verificationSent'))
          setMode('verify-otp')
          setResendTimer(60)
          setOtpAttempts([Date.now()])
          break
        case 'verify-otp':
          await verifySignupOtp(email, otpCode)
          setShowVerifiedPopup(true)
          break
        case 'forgot-password':
          await resetPassword(email)
          setMessage(t('login.resetLinkSent'))
          break
      }
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, t('login.genericError'), lang))
    } finally {
      setSubmitting(false)
    }
  }

  const handleGoogleSignIn = async () => {
    if (submitting) return
    setError('')
    setSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, t('login.googleStartFailed'), lang))
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh overflow-hidden bg-[hsl(var(--background))]">
      {/* Left - Branding */}
      <div className="hidden md:flex md:w-[42%] bg-[#075056] p-8 lg:p-12 flex-col justify-between relative overflow-hidden">
        <div className="landing-solid-lines absolute inset-0 opacity-10" />

        <div className="relative z-10 flex items-center justify-between">
          <a href="/">
            <img src={SomadhanLogoDark} alt="SomadhanSign" className="h-11 lg:h-14 cursor-pointer" />
          </a>
          <button type="button" onClick={toggleLang} aria-label={t(lang === 'en' ? 'common.switchToBangla' : 'common.switchToEnglish')} className="min-h-11 min-w-11 text-white/60 hover:text-white text-xs font-bold px-2 py-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer" title={lang === 'en' ? 'বাংলা' : 'English'}>
            {lang === 'en' ? 'বাং' : 'EN'}
          </button>
        </div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-full max-w-md">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/55">{t('login.brandingEyebrow')}</p>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.04em] text-white lg:text-5xl">
              {t('login.brandingNewTitle1')}<br />{t('login.brandingNewTitle2')}
            </h1>
            <p className="mt-5 max-w-sm text-sm leading-6 text-white/65 lg:text-base lg:leading-7">{t('login.brandingDesc')}</p>

            <div className="mt-8 rounded-3xl border border-white/20 bg-white p-5 text-[#232323] shadow-2xl lg:p-7">
              <div className="flex items-center justify-between border-b border-[#d9e2e3] pb-4">
                <span className="text-xs font-extrabold uppercase tracking-[0.16em]">{t('landing.demoDocument')}</span>
                <span className="rounded-full bg-[#075056] px-3 py-1 text-[10px] font-bold uppercase text-white">{t('landing.demoReadyStatus')}</span>
              </div>
              <div className="mt-8 space-y-3">
                {[100, 82, 94, 66].map((width) => <div key={width} className="h-2 bg-[#d9e2e3]" style={{ width: `${width}%` }} />)}
              </div>
              <div className="mt-9 ml-auto flex h-12 w-32 items-center justify-center rounded-lg border-2 border-[#F95943] px-2 text-center text-xs font-extrabold text-[#F95943]">{t('landing.demoSignHere')}</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-center text-white/40 text-xs">
          &copy; {new Date().getFullYear()} {t('login.copyright')}
        </div>
      </div>

      {/* Right - Auth Form */}
      <div className="flex-1 flex items-center justify-center px-5 py-8 sm:p-8 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6 shadow-[0_24px_80px_hsl(var(--foreground)/0.08)] sm:p-8 md:border-0 md:p-0 md:shadow-none">
          <div className="mb-8 flex items-center justify-between md:hidden">
            <a href="/"><img src={SomadhanLogoDark} alt="SomadhanSign" className="h-10 rounded-lg bg-[#075056] px-2 py-1" /></a>
            <button type="button" onClick={toggleLang} aria-label={t(lang === 'en' ? 'common.switchToBangla' : 'common.switchToEnglish')} className="min-h-11 min-w-11 rounded-xl text-xs font-bold hover:bg-[hsl(var(--muted))]">{lang === 'en' ? 'বাংলা' : 'EN'}</button>
          </div>

          {/* Forgot Password Screen */}
          {mode === 'forgot-password' ? (
            <div>
              <div className="w-14 h-14 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-[hsl(var(--primary))]" />
              </div>
              <h2 className="text-2xl font-bold mb-1 text-center">{t('login.resetPassword')}</h2>
              <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center">
                {t('login.resetPasswordDesc')}
              </p>

              {error && (
                <div role="alert" className="mb-4 p-3 rounded-lg bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div role="status" className="mb-4 p-3 rounded-lg bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-sm">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label={t('login.email')}
                  name="email"
                  autoComplete="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Button type="submit" className="w-full h-11" disabled={submitting}>
                  {submitting ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" /><span className="sr-only">{t('login.sendingResetLink')}</span></>
                  ) : (
                    t('login.sendResetLink')
                  )}
                </Button>
              </form>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => { setMode('login'); setError(''); setMessage('') }}
                  className="text-xs text-[hsl(var(--muted-foreground))] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> {t('login.backToSignIn')}
                </button>
              </div>
            </div>
          ) : mode === 'verify-otp' ? (
            <div>
              <div className="w-14 h-14 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-[hsl(var(--primary))]" />
              </div>
              <h2 className="text-2xl font-bold mb-1 text-center">{t('login.verifyEmail')}</h2>
              <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center">
                {t('login.verifyEmailDesc')} <strong>{email}</strong>
              </p>

              {error && (
                <div role="alert" className="mb-4 p-3 rounded-lg bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div role="status" className="mb-4 p-3 rounded-lg bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-sm">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label={t('login.otpLabel')}
                  name="one-time-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  type="text"
                  placeholder="123456"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                />

                <Button type="submit" className="w-full h-11" disabled={submitting || otpCode.length < 6}>
                  {submitting ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" /><span className="sr-only">{t('login.verifyingCode')}</span></>
                  ) : (
                    t('login.verifyCode')
                  )}
                </Button>
              </form>

              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4 text-center">
                {t('login.didNotReceiveCode')}{' '}
                <button
                  type="button"
                  disabled={submitting || resendTimer > 0}
                  onClick={async () => {
                    if (submitting || resendTimer > 0) return
                    
                    // Check if blocked
                    if (blockedUntil && Date.now() < blockedUntil) {
                      const remainingMin = Math.ceil((blockedUntil - Date.now()) / 60000)
                      setError(t('login.tooManyAttempts').replace('{minutes}', String(remainingMin)))
                      return
                    }
                    
                    // Check rate limiting: 3 attempts in 3 minutes
                    const now = Date.now()
                    const threeMinutesAgo = now - 3 * 60 * 1000
                    const recentAttempts = otpAttempts.filter(t => t > threeMinutesAgo)
                    
                    if (recentAttempts.length >= 3) {
                      const blockUntil = now + 60 * 60 * 1000 // 1 hour
                      setBlockedUntil(blockUntil)
                      setError(t('login.otpBlocked'))
                      return
                    }
                    
                    setError('')
                    setMessage('')
                    setSubmitting(true)
                    try {
                      await resendSignupOtp(email)
                      setMessage(t('login.newOtpSent'))
                      setResendTimer(60)
                      setOtpAttempts([...recentAttempts, now])
                    } catch (err: unknown) {
                      setError(getAuthErrorMessage(err, t('login.resendFailed'), lang))
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                  className="text-[hsl(var(--primary))] hover:underline cursor-pointer font-medium disabled:opacity-50"
                >
                  {resendTimer > 0
                    ? t('login.resendOtpCountdown').replace('{seconds}', String(resendTimer))
                    : t('login.resendOtp')}
                </button>
              </p>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => { setMode('signup'); setError(''); setMessage(''); setOtpCode('') }}
                  className="text-xs text-[hsl(var(--muted-foreground))] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> {t('login.backToSignup')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-1">
                {mode === 'login' ? t('login.welcomeBack') : t('login.createAccount')}
              </h2>
              <p className="text-[hsl(var(--muted-foreground))] mb-6">
                {mode === 'login'
                  ? t('login.signInToContinue')
                  : t('login.createAccountDesc')}
              </p>

              {/* Google Sign In */}
              <Button
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={submitting}
                className="w-full h-11 mb-4"
                type="button"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('login.continueWithGoogle')}
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[hsl(var(--border))]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[hsl(var(--background))] px-2 text-[hsl(var(--muted-foreground))]">
                    {t('login.orContinueWithEmail')}
                  </span>
                </div>
              </div>

              {error && (
                <div role="alert" className="mb-4 p-3 rounded-lg bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))] text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div role="status" className="mb-4 p-3 rounded-lg bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] text-sm">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <Input
                    label={t('login.fullName')}
                    name="name"
                    autoComplete="name"
                    placeholder={t('login.namePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                  />
                )}

                <Input
                  label={t('login.email')}
                  name="email"
                  autoComplete="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                {mode === 'login' && (
                  <div className="relative">
                    <Input
                      label={t('login.password')}
                      name="password"
                      autoComplete="current-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('login.passwordPlaceholder')}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                      className="absolute right-1 bottom-0 flex h-11 w-11 items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}
                {mode === 'signup' && (
                  <div>
                    <div className="relative">
                      <Input
                        label={t('login.password')}
                        name="new-password"
                        autoComplete="new-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('login.passwordPlaceholder')}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                        className="absolute right-1 bottom-0 flex h-11 w-11 items-center justify-center text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-[hsl(var(--muted-foreground))]">{t('login.passwordHint')}</p>
                  </div>
                )}

                {mode === 'login' && (
                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={() => { setMode('forgot-password'); setError(''); setMessage('') }}
                      className="text-xs text-[hsl(var(--primary))] hover:underline cursor-pointer"
                    >
                      {t('login.forgotPassword')}
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full h-11" disabled={submitting}>
                  {submitting ? (
                    <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" /><span className="sr-only">{mode === 'login' ? t('login.signingIn') : t('login.creatingAccount')}</span></>
                  ) : mode === 'login' ? (
                    t('login.signIn')
                  ) : (
                    t('login.signUp')
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                {mode === 'login' ? (
                  <p>
                    {t('login.noAccount')}{' '}
                    <button
                      onClick={() => { setMode('signup'); setError(''); setMessage('') }}
                      className="text-[hsl(var(--primary))] font-medium hover:underline cursor-pointer"
                    >
                      {t('login.signUpLink')}
                    </button>
                  </p>
                ) : (
                  <p>
                    {t('login.hasAccount')}{' '}
                    <button
                      onClick={() => { setMode('login'); setError(''); setMessage('') }}
                      className="text-[hsl(var(--primary))] font-medium hover:underline cursor-pointer"
                    >
                      {t('login.signInLink')}
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account Verified Popup */}
      <Modal
        isOpen={showVerifiedPopup}
        onClose={() => {
          setShowVerifiedPopup(false)
          navigate('/dashboard')
        }}
        className="text-center"
        size="sm"
      >
            <div className="w-16 h-16 rounded-full bg-[hsl(var(--success))]/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-[hsl(var(--success))]" />
            </div>
            <h3 className="text-xl font-bold mb-2">{t('login.accountVerified')}</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              {t('login.accountVerifiedDesc')}
            </p>
            <Button
              className="w-full h-11"
              onClick={() => {
                setShowVerifiedPopup(false)
                navigate('/dashboard')
              }}
            >
              {t('login.letsGo')}
            </Button>
      </Modal>
    </div>
  )
}
