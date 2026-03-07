import { Link } from 'react-router-dom'
import {
  Upload,
  PenTool,
  Send,
  Shield,
  Zap,
  Users,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import { useLanguageStore } from '@/stores/languageStore'

export default function LandingPage() {
  const { t, lang } = useLanguageStore()
  
  const renderHeroTitle = () => {
    if (lang === 'bn') {
      return (
        <>
          <span style={{ whiteSpace: 'pre-wrap' }}>{t('landing.heroTitle1')}</span>
          <br />
          <span style={{ whiteSpace: 'pre-wrap' }}>সমাধান  <span className="text-[hsl(var(--accent-coral))]">সাইন</span>  দিয়ে</span>
        </>
      )
    }
    return (
      <>
        {t('landing.heroTitle1')}{' '}
        <span>Somadhan <span className="text-[hsl(var(--accent-coral))]">Sign</span></span>
      </>
    )
  }
  
  const features = [
    {
      icon: <Upload className="w-6 h-6" />,
      titleKey: 'landing.feat.upload',
      descKey: 'landing.feat.uploadDesc',
    },
    {
      icon: <PenTool className="w-6 h-6" />,
      titleKey: 'landing.feat.fields',
      descKey: 'landing.feat.fieldsDesc',
    },
    {
      icon: <Users className="w-6 h-6" />,
      titleKey: 'landing.feat.multi',
      descKey: 'landing.feat.multiDesc',
    },
    {
      icon: <Send className="w-6 h-6" />,
      titleKey: 'landing.feat.track',
      descKey: 'landing.feat.trackDesc',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      titleKey: 'landing.feat.secure',
      descKey: 'landing.feat.secureDesc',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      titleKey: 'landing.feat.anywhere',
      descKey: 'landing.feat.anywhereDesc',
    },
  ]

  const steps = [
    { num: '01', titleKey: 'landing.step1Title', descKey: 'landing.step1Desc' },
    { num: '02', titleKey: 'landing.step2Title', descKey: 'landing.step2Desc' },
    { num: '03', titleKey: 'landing.step3Title', descKey: 'landing.step3Desc' },
    { num: '04', titleKey: 'landing.step4Title', descKey: 'landing.step4Desc' },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[hsl(var(--primary))]/8 via-[hsl(var(--background))] to-[hsl(var(--background))]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.12),transparent_70%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              {renderHeroTitle()}
            </h1>
            <p className="text-lg text-[hsl(var(--muted-foreground))] mb-8 max-w-2xl mx-auto">
              {t('landing.heroDesc')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/login?mode=signup">
                <Button size="lg" className="text-base px-8">
                  {t('landing.getStartedFree')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-base px-8">
                  {t('landing.signIn')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-[hsl(var(--card))]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t('landing.howItWorks')}</h2>
            <p className="text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
              {t('landing.howItWorksDesc')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="text-4xl font-bold text-[hsl(var(--primary))] mb-3">
                  {step.num}
                </div>
                <h3 className="font-semibold mb-2">{t(step.titleKey)}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{t(step.descKey)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">{t('landing.everything')}</h2>
            <p className="text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
              {t('landing.everythingDesc')}
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.titleKey}
                className="bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))] p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center text-[hsl(var(--primary))] mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{t(feature.titleKey)}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {t(feature.descKey)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[hsl(var(--primary))] via-[hsl(var(--primary))]/80 to-[hsl(var(--primary))]/60 rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">{t('landing.ctaTitle')}</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              {t('landing.ctaDesc')}
            </p>
            <Link to="/login">
              <Button
                size="lg"
                className="bg-white text-[hsl(var(--primary))] hover:bg-white/90 text-base px-8"
              >
                {t('landing.createFreeAccount')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <div className="flex items-center justify-center gap-6 mt-8 text-white/60 text-sm">
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
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            &copy; {new Date().getFullYear()} {t('landing.footer')}
          </p>
        </div>
      </footer>
    </div>
  )
}
