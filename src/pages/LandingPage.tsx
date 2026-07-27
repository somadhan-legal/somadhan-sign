import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { motion, MotionConfig } from 'framer-motion'
import {
  ArrowRight,
  Check,
  FileCheck2,
  Fingerprint,
  History,
  Menu,
  Moon,
  MousePointer2,
  Send,
  ShieldCheck,
  Sun,
  Users,
  X,
} from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { useLanguageStore } from '@/stores/languageStore'
import { useThemeStore } from '@/stores/themeStore'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'
import SomadhanLogoLight from '@/assets/sign_Somadhan_light.svg'
import HowItWorks from '@/components/HowItWorks'

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] as const },
}

export default function LandingPage() {
  const { t, lang, toggle: toggleLang } = useLanguageStore()
  const { isDark, toggle: toggleTheme } = useThemeStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const logo = isDark ? SomadhanLogoDark : SomadhanLogoLight

  useEffect(() => {
    if (!menuOpen) return

    const desktopQuery = window.matchMedia('(min-width: 1024px)')
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      window.requestAnimationFrame(() => menuButtonRef.current?.focus())
    }
    const handleDesktopChange = (event: MediaQueryListEvent) => {
      if (event.matches) setMenuOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    desktopQuery.addEventListener('change', handleDesktopChange)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      desktopQuery.removeEventListener('change', handleDesktopChange)
    }
  }, [menuOpen])

  const features = [
    { icon: MousePointer2, title: t('landing.feat.fields'), copy: t('landing.feat.fieldsDesc'), tone: 'coral' },
    { icon: Users, title: t('landing.feat.multi'), copy: t('landing.feat.multiDesc'), tone: 'teal' },
    { icon: Send, title: t('landing.feat.track'), copy: t('landing.feat.trackDesc'), tone: 'teal' },
    { icon: ShieldCheck, title: t('landing.feat.secure'), copy: t('landing.feat.secureDesc'), tone: 'coral' },
  ]

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing-shell min-h-dvh overflow-x-hidden bg-[hsl(var(--background))]">
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-[hsl(var(--primary))] px-4 py-2 font-semibold text-white shadow-lg transition-transform focus:translate-y-0"
      >
        {t('common.skipToContent')}
      </a>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[hsl(var(--border))] bg-[hsl(var(--background)/0.94)] backdrop-blur-xl">
        <div className="landing-container flex h-20 items-center justify-between">
          <a href="#top" aria-label={t('common.homeLabel')} className="shrink-0">
            <img src={logo} alt="Somadhan Sign" className="h-10 w-auto sm:h-11" />
          </a>

          <nav className="hidden items-center gap-8 text-sm font-semibold lg:flex" aria-label={t('common.primaryNavigation')}>
            <a href="#product" className="landing-nav-link">{t('landing.navProduct')}</a>
            <a href="#capabilities" className="landing-nav-link">{t('landing.navCapabilities')}</a>
            <a href="#security" className="landing-nav-link">{t('landing.navSecurity')}</a>
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <button onClick={toggleLang} aria-label={t(lang === 'en' ? 'common.switchToBangla' : 'common.switchToEnglish')} className="landing-icon-button px-3 text-xs font-extrabold" title={lang === 'en' ? 'বাংলা' : 'English'}>
              {lang === 'en' ? 'বাংলা' : 'EN'}
            </button>
            <button onClick={toggleTheme} aria-label={isDark ? t('nav.lightMode') : t('nav.darkMode')} className="landing-icon-button" title={isDark ? t('nav.lightMode') : t('nav.darkMode')}>
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/login" className={buttonStyles({ variant: 'ghost', size: 'sm' })}>{t('landing.signIn')}</Link>
            <Link to="/login?mode=signup" className={buttonStyles({ size: 'sm' })}>{t('landing.getStartedFree')}</Link>
          </div>

          <button
            ref={menuButtonRef}
            className="landing-icon-button landing-mobile-menu-button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={t(menuOpen ? 'common.closeMenu' : 'common.openMenu')}
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-navigation"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 py-5 lg:hidden">
            <nav id="landing-mobile-navigation" className="flex flex-col gap-1" aria-label={t('common.mobileNavigation')}>
              {[
                ['#product', t('landing.navProduct')],
                ['#capabilities', t('landing.navCapabilities')],
                ['#security', t('landing.navSecurity')],
              ].map(([href, label]) => (
                <a key={href} href={href} onClick={() => setMenuOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-[hsl(var(--muted))]">{label}</a>
              ))}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to="/login" className={buttonStyles({ variant: 'outline', className: 'w-full' })}>{t('landing.signIn')}</Link>
                <Link to="/login?mode=signup" className={buttonStyles({ className: 'w-full' })}>{t('nav.getStarted')}</Link>
              </div>
              <div className="mt-3 flex gap-2">
                <button onClick={toggleLang} aria-label={t(lang === 'en' ? 'common.switchToBangla' : 'common.switchToEnglish')} className="landing-icon-button flex-1 px-4 text-xs font-extrabold">{lang === 'en' ? 'বাংলা' : 'EN'}</button>
                <button onClick={toggleTheme} aria-label={isDark ? t('nav.lightMode') : t('nav.darkMode')} className="landing-icon-button flex-1">
                  {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main id="main-content" tabIndex={-1} className="outline-none">
        <section id="top" className="relative flex min-h-[min(900px,100svh)] items-center pt-24">
          <div className="landing-rule-grid absolute inset-0 opacity-60" aria-hidden="true" />
          <div className="landing-container relative grid items-center gap-14 py-20 lg:grid-cols-[0.92fr_1.08fr] lg:py-24">
            <div className="max-w-2xl">
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="landing-kicker mb-7"
              >
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent-coral))]" />
                {t('landing.heroKicker')}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="landing-display text-balance"
              >
                {t('landing.heroNewTitle')}
                <span className="block text-[hsl(var(--primary))]">{t('landing.heroNewAccent')}</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2 }}
                className="mt-7 max-w-xl text-lg leading-8 text-[hsl(var(--muted-foreground))] sm:text-xl"
              >
                {t('landing.heroNewDesc')}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.32 }}
                className="mt-9 flex flex-col gap-3 sm:flex-row"
              >
                <Link to="/login?mode=signup" className={buttonStyles({ size: 'lg', className: 'group h-13 w-full px-7 text-base sm:w-auto' })}>
                  {t('landing.getStartedFree')}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <a href="#product" className="inline-flex h-13 items-center justify-center rounded-lg border border-[hsl(var(--border))] px-7 text-base font-semibold transition-colors hover:bg-[hsl(var(--muted))]">
                  {t('landing.watchProduct')}
                </a>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.48 }}
                className="mt-8 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[hsl(var(--muted-foreground))]"
              >
                {[t('landing.freeToStart'), t('landing.noCreditCard'), t('landing.noInstall')].map((item) => (
                  <span key={item} className="flex items-center gap-2"><Check className="h-4 w-4 text-[hsl(var(--primary))]" />{item}</span>
                ))}
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="relative mx-auto w-full max-w-[680px]"
              aria-label={t('landing.workspacePreview')}
            >
              <div className="landing-product-frame">
                <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-[hsl(var(--accent-coral))]" />
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))]">{t('landing.demoDocument')}</span>
                  </div>
                  <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-[11px] font-bold uppercase">{t('landing.demoDraft')}</span>
                </div>
                <div className="grid min-h-[450px] grid-cols-[72px_1fr] sm:grid-cols-[170px_1fr]">
                  <div className="border-r border-[hsl(var(--border))] bg-[hsl(var(--muted))] p-3 sm:p-4">
                    <p className="hidden text-[11px] font-extrabold uppercase tracking-[0.16em] text-[hsl(var(--muted-foreground))] sm:block">{t('landing.demoFields')}</p>
                    <div className="mt-4 space-y-2">
                      {[[t('editor.signature'), Fingerprint], [t('editor.initials'), FileCheck2], [t('editor.date'), History]].map(([label, Icon]) => (
                        <div key={label as string} className="flex items-center gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-2.5 text-xs font-semibold">
                          <Icon className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />
                          <span className="hidden sm:inline">{label as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="relative overflow-hidden bg-[hsl(var(--secondary))] p-5 sm:p-8">
                    <div className="landing-paper relative mx-auto min-h-[385px] max-w-[360px] p-7 sm:p-9">
                      <div className="mb-8 flex items-center justify-between">
                        <div className="h-3 w-28 bg-[hsl(var(--foreground))]" />
                        <div className="h-3 w-10 bg-[hsl(var(--accent-coral))]" />
                      </div>
                      <div className="space-y-3">
                        {[86, 100, 72, 92, 64].map((width, index) => <div key={index} className="h-2 bg-[hsl(var(--border))]" style={{ width: `${width}%` }} />)}
                      </div>
                      <motion.div
                        animate={{ y: [0, -4, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        className="absolute bottom-24 right-6 flex h-14 w-36 items-center justify-center rounded-lg border-2 border-[hsl(var(--accent-coral))] bg-[hsl(var(--background))] text-xs font-extrabold text-[hsl(var(--accent-coral))] shadow-lg sm:right-9"
                      >
                        <Fingerprint className="mr-2 h-4 w-4" /> {t('landing.demoSignHere')}
                      </motion.div>
                      <div className="absolute bottom-10 left-7 right-7 h-px bg-[hsl(var(--border))] sm:left-9 sm:right-9" />
                    </div>
                    <motion.div
                      animate={{ x: [0, 6, 0], y: [0, 4, 0] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute bottom-20 right-9 rounded-full bg-[hsl(var(--foreground))] p-2 text-[hsl(var(--background))] shadow-lg sm:right-14"
                    >
                      <MousePointer2 className="h-4 w-4" />
                    </motion.div>
                  </div>
                </div>
              </div>
              <div className="absolute -bottom-5 -left-3 hidden rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-4 py-3 shadow-xl sm:flex sm:items-center sm:gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-white">3</span>
                <div><p className="text-xs font-bold">{t('landing.demoSignersReady')}</p><p className="text-[11px] text-[hsl(var(--muted-foreground))]">{t('landing.demoFieldsAssigned')}</p></div>
              </div>
            </motion.div>
          </div>
        </section>

        <HowItWorks />

        <section id="capabilities" className="border-y border-[hsl(var(--border))] bg-[hsl(var(--muted))] py-24 lg:py-32">
          <div className="landing-container">
            <motion.div {...reveal} className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
              <div>
                <p className="landing-eyebrow">{t('landing.capabilityEyebrow')}</p>
                <h2 className="landing-section-title mt-4">{t('landing.capabilityTitle')}</h2>
              </div>
              <p className="max-w-2xl text-lg leading-8 text-[hsl(var(--muted-foreground))] lg:justify-self-end">{t('landing.capabilityDesc')}</p>
            </motion.div>

            <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--border))] md:grid-cols-2">
              {features.map(({ icon: Icon, title, copy, tone }, index) => (
                <motion.article key={title} {...reveal} transition={{ ...reveal.transition, delay: index * 0.06 }} className="group min-h-64 bg-[hsl(var(--background))] p-7 sm:p-9">
                  <div className={`mb-12 flex h-12 w-12 items-center justify-center rounded-xl ${tone === 'coral' ? 'bg-[hsl(var(--accent-coral))] text-white' : 'bg-[hsl(var(--primary))] text-white'}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
                  <p className="mt-3 max-w-md leading-7 text-[hsl(var(--muted-foreground))]">{copy}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="py-24 lg:py-32">
          <div className="landing-container grid gap-12 lg:grid-cols-2 lg:items-center">
            <motion.div {...reveal}>
              <p className="landing-eyebrow">{t('landing.securityEyebrow')}</p>
              <h2 className="landing-section-title mt-4">{t('landing.securityTitle')}</h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">{t('landing.securityDesc')}</p>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {[t('landing.securityItem1'), t('landing.securityItem2'), t('landing.securityItem3'), t('landing.securityItem4')].map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-[hsl(var(--border))] p-4 font-semibold">
                    <Check className="h-4 w-4 shrink-0 text-[hsl(var(--primary))]" />{item}
                  </div>
                ))}
              </div>
            </motion.div>
            <motion.div {...reveal} className="landing-audit-card">
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] p-5">
                <div className="flex items-center gap-3"><History className="h-5 w-5 text-[hsl(var(--primary))]" /><span className="font-bold">{t('landing.demoAuditTrail')}</span></div>
                <span className="text-xs font-bold uppercase text-[hsl(var(--primary))]">{t('landing.demoVerified')}</span>
              </div>
              <div className="space-y-6 p-6 sm:p-8">
                {[
                  [t('landing.demoDocumentCreated'), '09:42'],
                  [t('landing.demoInvitationsDelivered'), '09:44'],
                  [t('landing.demoAllSigned'), '10:17'],
                ].map(([label, time], index) => (
                  <div key={label} className="grid grid-cols-[20px_1fr_auto] items-start gap-4">
                    <div className="relative mt-1.5 h-3 w-3 rounded-full bg-[hsl(var(--primary))]">{index < 2 && <span className="absolute left-[5px] top-4 h-10 w-px bg-[hsl(var(--border))]" />}</div>
                    <div><p className="font-semibold">{label}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{t('landing.demoDocument')}</p></div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">{time}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="landing-container pb-24 lg:pb-32">
          <motion.div {...reveal} className="relative overflow-hidden rounded-[2rem] bg-[hsl(var(--primary))] px-6 py-16 text-center text-white sm:px-12 lg:py-20">
            <div className="landing-solid-lines absolute inset-0 opacity-15" aria-hidden="true" />
            <div className="relative mx-auto max-w-3xl">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-white/70">{t('landing.ctaEyebrow')}</p>
              <h2 className="mt-5 text-4xl font-bold tracking-[-0.04em] sm:text-5xl lg:text-6xl">{t('landing.ctaNewTitle')}</h2>
              <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/75">{t('landing.ctaNewDesc')}</p>
              <Link to="/login?mode=signup" className="mt-8 inline-flex h-13 items-center justify-center rounded-lg bg-white px-7 text-base font-bold text-[hsl(var(--primary))] transition-transform hover:-translate-y-0.5">
                {t('landing.createFreeAccount')}<ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-[hsl(var(--border))] py-9">
        <div className="landing-container flex flex-col items-center justify-between gap-5 sm:flex-row">
          <img src={logo} alt="Somadhan Sign" className="h-9 w-auto" />
          <p className="text-sm text-[hsl(var(--muted-foreground))]">&copy; {new Date().getFullYear()} {t('landing.footer')}</p>
          <div className="flex items-center gap-1 text-sm font-semibold">
            <Link to="/login" className="inline-flex min-h-11 items-center px-2">{t('landing.signIn')}</Link>
            <Link to="/login?mode=signup" className="inline-flex min-h-11 items-center px-2">{t('nav.getStarted')}</Link>
          </div>
        </div>
      </footer>
      </div>
    </MotionConfig>
  )
}
