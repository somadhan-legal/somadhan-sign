import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import {
  AlertTriangle,
  Check,
  Copy,
  FileSearch,
  LoaderCircle,
  Moon,
  ShieldCheck,
  ShieldX,
  Sun,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import SomadhanLogoLight from '@/assets/sign_Somadhan_light.svg'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'
import {
  fetchDocumentVerification,
  readVerificationToken,
  type ActiveVerificationRecord,
  type VerificationResult,
} from '@/lib/documentVerification'
import { useLanguageStore } from '@/stores/languageStore'
import { useThemeStore } from '@/stores/themeStore'

type PageState = 'checking' | 'active' | 'not_found' | 'revoked' | 'unavailable'

export default function VerifyDocumentPage() {
  const { lang, toggle: toggleLanguage, t } = useLanguageStore()
  const { isDark, toggle: toggleTheme } = useThemeStore()
  const [state, setState] = useState<PageState>('checking')
  const [record, setRecord] = useState<ActiveVerificationRecord | null>(null)
  const [referenceCode, setReferenceCode] = useState('')
  const [copiedReference, setCopiedReference] = useState(false)
  const verificationRequestRef = useRef(0)
  const verificationAbortRef = useRef<AbortController | null>(null)

  const applyResult = useCallback((result: VerificationResult) => {
    if (result.status === 'active') {
      setRecord(result.record)
      setReferenceCode(result.record.referenceCode)
      setState('active')
      return
    }
    setRecord(null)
    if (result.status === 'revoked') {
      setReferenceCode(result.referenceCode || '')
      setState('revoked')
      return
    }
    setReferenceCode('')
    setState(result.status)
  }, [])

  const checkRecord = useCallback(async () => {
    const requestId = ++verificationRequestRef.current
    verificationAbortRef.current?.abort()
    const controller = new AbortController()
    verificationAbortRef.current = controller
    setState('checking')
    setRecord(null)
    const token = readVerificationToken(window.location.hash)
    if (!token) {
      if (requestId !== verificationRequestRef.current) return
      applyResult({ status: 'not_found' })
      return
    }
    const result = await fetchDocumentVerification(token, controller.signal)
    if (requestId !== verificationRequestRef.current) return
    applyResult(result)
  }, [applyResult])

  useEffect(() => {
    const initialCheck = window.setTimeout(() => void checkRecord(), 0)
    window.addEventListener('hashchange', checkRecord)
    return () => {
      window.clearTimeout(initialCheck)
      window.removeEventListener('hashchange', checkRecord)
      verificationRequestRef.current += 1
      verificationAbortRef.current?.abort()
    }
  }, [checkRecord])

  const copyReference = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedReference(true)
      window.setTimeout(() => setCopiedReference(false), 1800)
    } catch {
      setCopiedReference(false)
    }
  }

  const completedLabel = record
    ? new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'UTC',
      }).format(new Date(record.completedAt))
    : ''

  const statusPresentation = (() => {
    if (state === 'checking') {
      return {
        Icon: LoaderCircle,
        iconClass: 'animate-spin text-[hsl(var(--primary))]',
        eyebrow: t('verify.checkingEyebrow'),
        title: t('verify.checkingTitle'),
        body: t('verify.checkingBody'),
      }
    }
    if (state === 'not_found') {
      return {
        Icon: FileSearch,
        iconClass: 'text-[hsl(var(--muted-foreground))]',
        eyebrow: t('verify.notFoundEyebrow'),
        title: t('verify.notFoundTitle'),
        body: t('verify.notFoundBody'),
      }
    }
    if (state === 'revoked') {
      return {
        Icon: ShieldX,
        iconClass: 'text-[hsl(var(--destructive))]',
        eyebrow: t('verify.revokedEyebrow'),
        title: t('verify.revokedTitle'),
        body: t('verify.revokedBody'),
      }
    }
    if (state === 'unavailable') {
      return {
        Icon: AlertTriangle,
        iconClass: 'text-[hsl(var(--accent-coral))]',
        eyebrow: t('verify.unavailableEyebrow'),
        title: t('verify.unavailableTitle'),
        body: navigator.onLine ? t('verify.unavailableBody') : t('verify.offlineBody'),
      }
    }
    return {
      Icon: ShieldCheck,
      iconClass: 'text-[hsl(var(--success))]',
      eyebrow: t('verify.recordEyebrow'),
      title: t('verify.recordTitle'),
      body: t('verify.recordBody'),
    }
  })()
  const StatusIcon = statusPresentation.Icon

  return (
    <div className="min-h-dvh bg-[hsl(var(--muted)/0.35)] text-[hsl(var(--foreground))]">
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.92)] backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:h-20 sm:px-6">
          <Link to="/" aria-label={t('common.homeLabel')}>
            <img
              src={isDark ? SomadhanLogoDark : SomadhanLogoLight}
              alt="Somadhan Sign"
              className="h-10 w-auto sm:h-12"
            />
          </Link>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleLanguage}
              aria-label={t(lang === 'en' ? 'common.switchToBangla' : 'common.switchToEnglish')}
            >
              <span className="text-xs font-extrabold">{lang === 'en' ? 'বাং' : 'EN'}</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={isDark ? t('nav.lightMode') : t('nav.darkMode')}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-xl px-4 py-8 sm:px-6 sm:py-14">
        <section
          className="w-full rounded-[1.75rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-[0_24px_80px_hsl(var(--foreground)/0.08)] sm:p-9"
          aria-live="polite"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--muted))]">
            <StatusIcon className={`h-8 w-8 ${statusPresentation.iconClass}`} aria-hidden="true" />
          </div>
          <p className="mt-7 text-xs font-extrabold tracking-[0.16em] text-[hsl(var(--muted-foreground))]">
            {statusPresentation.eyebrow}
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">
            {statusPresentation.title}
          </h1>
          <p className="mt-4 leading-7 text-[hsl(var(--muted-foreground))]">
            {statusPresentation.body}
          </p>

          {state === 'active' && record && (
            <>
              <dl className="mt-7 divide-y divide-[hsl(var(--border))] rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4">
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <dt className="text-sm text-[hsl(var(--muted-foreground))]">{t('verify.recordStatus')}</dt>
                  <dd className="flex items-center gap-1.5 text-sm font-bold text-[hsl(var(--success))]">
                    <Check className="h-4 w-4" /> {t('verify.active')}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <dt className="text-sm text-[hsl(var(--muted-foreground))]">{t('verify.completed')}</dt>
                  <dd className="text-right text-sm font-semibold">{completedLabel} UTC</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3.5">
                  <dt className="text-sm text-[hsl(var(--muted-foreground))]">{t('verify.reference')}</dt>
                  <dd className="flex items-center gap-1 font-mono text-xs font-bold">
                    {record.referenceCode}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => void copyReference(record.referenceCode)}
                      aria-label={t('verify.copyReference')}
                    >
                      {copiedReference
                        ? <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                        : <Copy className="h-4 w-4" />}
                    </Button>
                  </dd>
                </div>
              </dl>

              <div className="mt-6 rounded-2xl bg-[hsl(var(--muted))] p-5">
                <h2 className="font-bold">{t('verify.guidanceTitle')}</h2>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
                  {t('verify.guidanceBody')}
                </p>
                <p className="mt-3 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  {t('verify.privacyNote')}
                </p>
              </div>
            </>
          )}

          {referenceCode && state === 'revoked' && (
            <p className="mt-6 rounded-xl bg-[hsl(var(--muted))] px-4 py-3 font-mono text-xs font-bold">
              {referenceCode}
            </p>
          )}

          {state === 'unavailable' && (
            <Button className="mt-7 w-full" size="lg" onClick={() => void checkRecord()}>
              {t('verify.tryAgain')}
            </Button>
          )}

          <p className="mt-7 border-t border-[hsl(var(--border))] pt-5 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
            {t('verify.disclaimer')}
          </p>
          <Link to="/" className="mt-5 inline-flex text-sm font-bold text-[hsl(var(--primary))] hover:underline">
            {t('verify.goHome')}
          </Link>
        </section>
      </main>
    </div>
  )
}
