import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
  Upload,
  PenTool,
  Send,
  Shield,
  Zap,
  Users,
  CheckCircle2,
  ArrowRight,
  Star,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { useLanguageStore } from '@/stores/languageStore'
import { useThemeStore } from '@/stores/themeStore'
import SomadhanLogoDark from '@/assets/sign_Somadhan_dark.svg'
import SomadhanLogoLight from '@/assets/sign_Somadhan_light.svg'
import HowItWorks from '@/components/HowItWorks'

export default function LandingPage() {
  const { t, lang, toggle: toggleLang } = useLanguageStore()
  const { isDark, toggle: toggleTheme } = useThemeStore()
  const heroRef = useRef<HTMLDivElement>(null)

  const { scrollYProgress: heroScroll } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  const heroY = useTransform(heroScroll, [0, 1], [0, 150])
  const heroOpacity = useTransform(heroScroll, [0, 0.8], [1, 0])
  const heroScale = useTransform(heroScroll, [0, 1], [1, 0.95])

  const renderHeroTitle = () => {
    if (lang === 'bn') {
      return (
        <>
          <span style={{ whiteSpace: 'pre-wrap' }}>{t('landing.heroTitle1')}</span>
          <br />
          <span style={{ whiteSpace: 'pre-wrap' }}>সমাধান <span className="gradient-text">সাইন</span> দিয়ে</span>
        </>
      )
    }
    return (
      <>
        {t('landing.heroTitle1')}{' '}
        <span className="gradient-text">Somadhan Sign</span>
      </>
    )
  }

  const features = [
    {
      icon: Upload,
      titleKey: 'landing.feat.upload',
      descKey: 'landing.feat.uploadDesc',
    },
    {
      icon: PenTool,
      titleKey: 'landing.feat.fields',
      descKey: 'landing.feat.fieldsDesc',
    },
    {
      icon: Users,
      titleKey: 'landing.feat.multi',
      descKey: 'landing.feat.multiDesc',
    },
    {
      icon: Send,
      titleKey: 'landing.feat.track',
      descKey: 'landing.feat.trackDesc',
    },
    {
      icon: Shield,
      titleKey: 'landing.feat.secure',
      descKey: 'landing.feat.secureDesc',
    },
    {
      icon: Zap,
      titleKey: 'landing.feat.anywhere',
      descKey: 'landing.feat.anywhereDesc',
    },
  ]

  return (
    <div className="overflow-x-hidden">
      {/* ─── Navbar ─── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 glass border-b border-[hsl(var(--border) / 0.2)]"
      >
        <div className="px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          <a href="https://sign.somadhan.com" className="flex items-center gap-2">
            <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-8" />
          </a>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer"
            >
              {lang === 'en' ? 'বাং' : 'EN'}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-[hsl(var(--muted))] transition-colors cursor-pointer text-[hsl(var(--muted-foreground))]"
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-sm">
                {t('landing.signIn')}
              </Button>
            </Link>
            <Link to="/login?mode=signup">
              <Button size="sm" className="text-sm">
                {t('landing.getStartedFree')}
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ─── Hero ─── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
      >
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 grid-pattern opacity-20" />
          <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[hsl(var(--primary))]/8 blur-[100px] animate-pulse-glow" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[hsl(var(--accent-coral))]/8 blur-[100px] animate-pulse-glow" style={{ animationDelay: '1s' }} />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity, scale: heroScale }}
          className="relative z-10 text-center max-w-4xl mx-auto px-4 sm:px-6"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass mb-8"
          >
            <Star className="w-3.5 h-3.5 text-[hsl(var(--accent-coral))] fill-[hsl(var(--accent-coral))]" />
            <span className="text-xs font-medium tracking-wide">
              The modern way to sign documents
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
          >
            {renderHeroTitle()}
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-lg sm:text-xl text-[hsl(var(--muted-foreground))] mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            {t('landing.heroDesc')}
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link to="/login?mode=signup">
              <Button size="lg" className="text-base px-8 h-12 group">
                {t('landing.getStartedFree')}
                <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="outline" size="lg" className="text-base px-8 h-12">
                {t('landing.signIn')}
              </Button>
            </Link>
          </motion.div>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.8 }}
            className="flex items-center justify-center gap-6 mt-12 text-sm text-[hsl(var(--muted-foreground))]"
          >
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
              {t('landing.freeToStart')}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
              {t('landing.noCreditCard')}
            </span>
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
              {t('landing.unlimitedDocs')}
            </span>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          style={{ opacity: heroOpacity }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-[hsl(var(--muted-foreground) / 0.3)] flex items-start justify-center p-1.5"
          >
            <div className="w-1 h-2 rounded-full bg-[hsl(var(--muted-foreground) / 0.5)]" />
          </motion.div>
        </motion.div>
      </section>

      {/* ─── How It Works ─── */}
      <HowItWorks />

      {/* ─── Features ─── */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 dot-pattern opacity-30 pointer-events-none" />

        <div className="px-4 sm:px-6 lg:px-10 relative">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-[hsl(var(--accent-coral))]/10 text-[hsl(var(--accent-coral))] mb-4">
              Features
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              {t('landing.everything')}
            </h2>
            <p className="text-[hsl(var(--muted-foreground))] max-w-xl mx-auto text-lg">
              {t('landing.everythingDesc')}
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.titleKey}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.5, delay: index * 0.08 }}
                  whileHover={{ y: -4 }}
                  className="group relative rounded-2xl p-6 glass hover:shadow-xl transition-shadow"
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                    <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-[hsl(var(--primary))]/10 blur-2xl" />
                  </div>

                  <div className="relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[hsl(var(--primary))]/15 to-[hsl(var(--accent-coral))]/10 flex items-center justify-center text-[hsl(var(--primary))] mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">{t(feature.titleKey)}</h3>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                      {t(feature.descKey)}
                    </p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ─── CTA ─── */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="px-4 sm:px-6 lg:px-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-5xl mx-auto rounded-3xl overflow-hidden"
          >
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary))]/90 to-[hsl(var(--accent-coral))]/80" />

            {/* Decorative shapes */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full border border-white/10 animate-float-slow" />
              <div className="absolute -bottom-32 -left-16 w-80 h-80 rounded-full border border-white/10 animate-float" />
              <div className="absolute top-1/2 right-1/3 w-32 h-32 rounded-full border border-white/10 animate-float-slow" style={{ animationDelay: '2s' }} />
            </div>

            <div className="relative z-10 p-12 lg:p-16 text-center text-white">
              <h2 className="text-3xl lg:text-4xl font-bold mb-4">
                {t('landing.ctaTitle')}
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto text-lg">
                {t('landing.ctaDesc')}
              </p>
              <Link to="/login?mode=signup">
                <Button
                  size="lg"
                  className="bg-white text-[hsl(var(--primary))] hover:bg-white/90 text-base px-8 h-12 group"
                >
                  {t('landing.createFreeAccount')}
                  <ArrowRight className="w-5 h-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <div className="flex items-center justify-center gap-6 mt-8 text-white/70 text-sm">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {t('landing.freeToStart')}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {t('landing.noCreditCard')}
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" /> {t('landing.unlimitedDocs')}
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[hsl(var(--border))] py-12">
        <div className="px-4 sm:px-6 lg:px-10 max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={isDark ? SomadhanLogoDark : SomadhanLogoLight} alt="SomadhanSign" className="h-7" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              &copy; {new Date().getFullYear()} {t('landing.footer')}
            </p>
            <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
              <a href="https://sign.somadhan.com" className="hover:text-[hsl(var(--foreground))] transition-colors">
                {t('nav.getStarted')}
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
