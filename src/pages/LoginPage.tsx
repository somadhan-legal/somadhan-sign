import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import SomadhanLogo from '@/assets/somadhan-logo.svg'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

type AuthMode = 'login' | 'signup' | 'verify-otp' | 'forgot-password'

export default function LoginPage() {
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
            throw new Error(`Too many OTP attempts. Please try again in ${remainingMin} minutes.`)
          }
          await signUpWithEmail(email, password, name)
          setMessage('A 6-digit OTP has been sent to your email.')
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
          setMessage('Password reset link has been sent to your email. Please check your inbox.')
          break
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[hsl(var(--primary))] to-teal-900 p-12 flex-col justify-between">
        <div className="flex items-center gap-3">
          <img src={SomadhanLogo} alt="RocketSign" className="w-12 h-12 rounded-2xl" />
          <span className="text-2xl font-bold text-white">RocketSign</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white mb-4">
            Sign documents with RocketSign
          </h1>
          <p className="text-lg text-white/70">
            Upload, define signature fields, invite signers, and get documents signed — all in one place.
          </p>
        </div>
        <div className="flex gap-8 text-white/60 text-sm">
          <div>
            <div className="text-3xl font-bold text-white">10k+</div>
            Documents signed
          </div>
          <div>
            <div className="text-3xl font-bold text-white">5k+</div>
            Happy users
          </div>
          <div>
            <div className="text-3xl font-bold text-white">99.9%</div>
            Uptime
          </div>
        </div>
      </div>

      {/* Right - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <img src={SomadhanLogo} alt="RocketSign" className="w-9 h-9 rounded-xl" />
            <span className="text-xl font-bold">RocketSign</span>
          </div>

          {/* Forgot Password Screen */}
          {mode === 'forgot-password' ? (
            <div>
              <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-[hsl(var(--primary))]" />
              </div>
              <h2 className="text-2xl font-bold mb-1 text-center">Reset your password</h2>
              <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center">
                Enter your email and we'll send you a password reset link
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Button type="submit" className="w-full h-11" disabled={submitting}>
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Send Reset Link'
                  )}
                </Button>
              </form>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => { setMode('login'); setError(''); setMessage('') }}
                  className="text-xs text-[hsl(var(--muted-foreground))] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to login
                </button>
              </div>
            </div>
          ) : mode === 'verify-otp' ? (
            <div>
              <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-7 h-7 text-[hsl(var(--primary))]" />
              </div>
              <h2 className="text-2xl font-bold mb-1 text-center">Enter OTP to confirm your email</h2>
              <p className="text-[hsl(var(--muted-foreground))] mb-6 text-center">
                We sent a 6-digit code to <strong>{email}</strong>
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="6-digit OTP"
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
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    'Verify & Continue'
                  )}
                </Button>
              </form>

              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-4 text-center">
                Didn&apos;t receive the code?{' '}
                <button
                  type="button"
                  disabled={submitting || resendTimer > 0}
                  onClick={async () => {
                    if (submitting || resendTimer > 0) return
                    
                    // Check if blocked
                    if (blockedUntil && Date.now() < blockedUntil) {
                      const remainingMin = Math.ceil((blockedUntil - Date.now()) / 60000)
                      setError(`Too many attempts. Please try again in ${remainingMin} minutes.`)
                      return
                    }
                    
                    // Check rate limiting: 3 attempts in 3 minutes
                    const now = Date.now()
                    const threeMinutesAgo = now - 3 * 60 * 1000
                    const recentAttempts = otpAttempts.filter(t => t > threeMinutesAgo)
                    
                    if (recentAttempts.length >= 3) {
                      const blockUntil = now + 60 * 60 * 1000 // 1 hour
                      setBlockedUntil(blockUntil)
                      setError('Too many OTP attempts. You are blocked for 1 hour.')
                      return
                    }
                    
                    setError('')
                    setMessage('')
                    setSubmitting(true)
                    try {
                      await resendSignupOtp(email)
                      setMessage('New OTP sent! Check your email.')
                      setResendTimer(60)
                      setOtpAttempts([...recentAttempts, now])
                    } catch (err: unknown) {
                      setError(err instanceof Error ? err.message : 'Failed to resend')
                    } finally {
                      setSubmitting(false)
                    }
                  }}
                  className="text-[hsl(var(--primary))] hover:underline cursor-pointer font-medium disabled:opacity-50"
                >
                  {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP'}
                </button>
              </p>

              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => { setMode('signup'); setError(''); setMessage(''); setOtpCode('') }}
                  className="text-xs text-[hsl(var(--muted-foreground))] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to sign up
                </button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-1">
                {mode === 'login' ? 'Welcome back' : 'Create an account'}
              </h2>
              <p className="text-[hsl(var(--muted-foreground))] mb-6">
                {mode === 'login'
                  ? 'Sign in to your account to continue'
                  : 'Get started with RocketSign today'}
              </p>

              {/* Google Sign In */}
              <Button
                variant="outline"
                onClick={() => signInWithGoogle()}
                className="w-full h-11 mb-4"
                type="button"
              >
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </Button>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[hsl(var(--border))]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-[hsl(var(--muted-foreground))]">
                    Or continue with email
                  </span>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  {error}
                </div>
              )}
              {message && (
                <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                  {message}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'signup' && (
                  <Input
                    label="Full Name"
                    placeholder="John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                )}

                <Input
                  label="Email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                {mode === 'login' && (
                  <div className="relative">
                    <Input
                      label="Password"
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
                )}
                {mode === 'signup' && (
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                )}

                {mode === 'login' && (
                  <div className="flex justify-end -mt-2">
                    <button
                      type="button"
                      onClick={() => { setMode('forgot-password'); setError(''); setMessage('') }}
                      className="text-xs text-[hsl(var(--primary))] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button type="submit" className="w-full h-11" disabled={submitting}>
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : mode === 'login' ? (
                    'Sign In'
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm">
                {mode === 'login' ? (
                  <p>
                    Don&apos;t have an account?{' '}
                    <button
                      onClick={() => { setMode('signup'); setError(''); setMessage('') }}
                      className="text-[hsl(var(--primary))] font-medium hover:underline cursor-pointer"
                    >
                      Sign up
                    </button>
                  </p>
                ) : (
                  <p>
                    Already have an account?{' '}
                    <button
                      onClick={() => { setMode('login'); setError(''); setMessage('') }}
                      className="text-[hsl(var(--primary))] font-medium hover:underline cursor-pointer"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Account Verified Popup */}
      {showVerifiedPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-xl">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <h3 className="text-xl font-bold mb-2">Account Verified!</h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              Your email has been confirmed. You can now use RocketSign.
            </p>
            <Button
              className="w-full h-11"
              onClick={() => {
                setShowVerifiedPopup(false)
                navigate('/dashboard')
              }}
            >
              OK, Let&apos;s Go!
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
