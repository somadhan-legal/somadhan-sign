import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { Upload, MousePointerClick, Users, Mail, PenTool, CheckCircle2, FileText } from 'lucide-react'
import { useLanguageStore } from '@/stores/languageStore'

export default function HowItWorks() {
  const { t } = useLanguageStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState(0)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 0.8', 'end 0.2'],
  })

  const steps = [
    {
      icon: Upload,
      titleKey: 'landing.step1Title',
      descKey: 'landing.step1Desc',
      color: 'hsl(var(--primary))',
    },
    {
      icon: MousePointerClick,
      titleKey: 'landing.step2Title',
      descKey: 'landing.step2Desc',
      color: 'hsl(var(--accent-coral))',
    },
    {
      icon: Users,
      titleKey: 'landing.step3Title',
      descKey: 'landing.step3Desc',
      color: 'hsl(var(--primary))',
    },
    {
      icon: Mail,
      titleKey: 'landing.step4Title',
      descKey: 'landing.step4Desc',
      color: 'hsl(var(--accent-coral))',
    },
  ]

  // Update active step based on scroll progress
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (value) => {
      const stepIndex = Math.min(Math.floor(value * steps.length), steps.length - 1)
      setActiveStep(stepIndex)
    })
    return () => unsubscribe()
  }, [scrollYProgress, steps.length])

  const lineHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" ref={containerRef}>
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[hsl(var(--primary))]/5 blur-3xl animate-pulse-glow" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-[hsl(var(--accent-coral))]/5 blur-3xl animate-pulse-glow" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="px-4 sm:px-6 lg:px-10 relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-20"
        >
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] mb-4">
            {t('landing.howItWorks')}
          </span>
          <h2 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            {t('landing.howItWorksDesc')}
          </h2>
        </motion.div>

        {/* Interactive scroll experience */}
        <div className="max-w-5xl mx-auto">
          {/* Progress line */}
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-8 lg:left-1/2 top-0 bottom-0 w-px bg-[hsl(var(--border))] -translate-x-1/2" />
            {/* Animated progress fill */}
            <motion.div
              className="absolute left-8 lg:left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--accent-coral))]"
              style={{ height: lineHeight }}
            />

            {/* Steps */}
            <div className="space-y-20 lg:space-y-32">
              {steps.map((step, index) => {
                const Icon = step.icon
                const isActive = activeStep === index
                const isLeft = index % 2 === 0

                return (
                  <ScrollStep
                    key={index}
                    index={index}
                    isLeft={isLeft}
                    isActive={isActive}
                    color={step.color}
                    icon={Icon}
                    titleKey={step.titleKey}
                    descKey={step.descKey}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* Interactive demo at the end */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="mt-24 lg:mt-32"
        >
          <InteractiveDemo />
        </motion.div>
      </div>
    </section>
  )
}

// ─── Scroll Step ───
function ScrollStep({
  index,
  isLeft,
  isActive,
  color,
  icon: Icon,
  titleKey,
  descKey,
}: {
  index: number
  isLeft: boolean
  isActive: boolean
  color: string
  icon: React.ComponentType<{ className?: string }>
  titleKey: string
  descKey: string
}) {
  const { t } = useLanguageStore()

  return (
    <div className={`relative flex items-center ${isLeft ? 'lg:flex-row' : 'lg:flex-row-reverse'}`}>
      {/* Dot on the line */}
      <div className="absolute left-8 lg:left-1/2 -translate-x-1/2 z-10">
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.4, delay: 0.2, type: 'spring', stiffness: 200 }}
          className="relative"
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-[hsl(var(--background))] transition-all duration-500"
            style={{
              background: isActive ? color : 'hsl(var(--muted-foreground) / 0.3)',
              boxShadow: isActive ? `0 0 20px ${color}` : 'none',
            }}
          />
          {isActive && (
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{ background: color }}
              animate={{ scale: [1, 2, 1], opacity: [0.5, 0, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          )}
        </motion.div>
      </div>

      {/* Content card */}
      <div className={`pl-20 lg:pl-0 w-full lg:w-1/2 ${isLeft ? 'lg:pr-16' : 'lg:pl-16'}`}>
        <motion.div
          initial={{ opacity: 0, x: isLeft ? -40 : 40, y: 20 }}
          whileInView={{ opacity: 1, x: 0, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className={`group relative rounded-2xl p-6 lg:p-8 transition-all duration-500 ${
            isActive
              ? 'glass shadow-xl scale-100'
              : 'opacity-60 hover:opacity-100'
          }`}
        >
          {/* Step number */}
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500"
              style={{
                background: isActive ? color : 'hsl(var(--muted))',
              }}
            >
              <Icon className="w-6 h-6 text-white" />
            </div>
            <span
              className="text-5xl font-black tracking-tighter transition-all duration-500"
              style={{ color: isActive ? color : 'hsl(var(--muted-foreground) / 0.3)' }}
            >
              {String(index + 1).padStart(2, '0')}
            </span>
          </div>

          <h3 className="text-xl font-bold mb-2">{t(titleKey)}</h3>
          <p className="text-[hsl(var(--muted-foreground))] leading-relaxed">{t(descKey)}</p>
        </motion.div>
      </div>

      {/* Spacer for the other half on desktop */}
      <div className="hidden lg:block w-1/2" />
    </div>
  )
}

// ─── Interactive Demo ───
function InteractiveDemo() {
  const [demoStep, setDemoStep] = useState(0)
  const [autoPlay, setAutoPlay] = useState(true)

  const demoSteps = [
    {
      label: 'Upload PDF',
      icon: FileText,
      visual: <DemoUploadVisual />,
    },
    {
      label: 'Place Fields',
      icon: MousePointerClick,
      visual: <DemoFieldsVisual />,
    },
    {
      label: 'Invite Signers',
      icon: Users,
      visual: <DemoInviteVisual />,
    },
    {
      label: 'Sign & Complete',
      icon: CheckCircle2,
      visual: <DemoSignVisual />,
    },
  ]

  useEffect(() => {
    if (!autoPlay) return
    const timer = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % demoSteps.length)
    }, 3000)
    return () => clearInterval(timer)
  }, [autoPlay, demoSteps.length])

  const CurrentVisual = demoSteps[demoStep].visual

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <p className="text-sm font-semibold tracking-wider uppercase text-[hsl(var(--muted-foreground))] mb-2">
          See it in action
        </p>
        <h3 className="text-2xl font-bold">From upload to signed in seconds</h3>
      </div>

      {/* Demo container */}
      <div
        className="relative rounded-3xl overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))]"
        onMouseEnter={() => setAutoPlay(false)}
        onMouseLeave={() => setAutoPlay(true)}
      >
        {/* Step tabs */}
        <div className="flex border-b border-[hsl(var(--border))]">
          {demoSteps.map((step, i) => {
            const Icon = step.icon
            return (
              <button
                key={i}
                onClick={() => setDemoStep(i)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-4 text-sm font-medium transition-all relative ${
                  demoStep === i
                    ? 'text-[hsl(var(--primary))]'
                    : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{step.label}</span>
                {demoStep === i && (
                  <motion.div
                    layoutId="demoTabIndicator"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[hsl(var(--primary))]"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Visual area */}
        <div className="relative h-[320px] sm:h-[400px] flex items-center justify-center p-8 overflow-hidden">
          {/* Grid background */}
          <div className="absolute inset-0 grid-pattern opacity-30" />

          <AnimatePresence mode="wait">
            <motion.div
              key={demoStep}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -20 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 w-full max-w-md"
            >
              {CurrentVisual}
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {demoSteps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  demoStep === i ? 'w-8 bg-[hsl(var(--primary))]' : 'w-1.5 bg-[hsl(var(--muted-foreground) / 0.3)]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Demo Visuals ───

function DemoUploadVisual() {
  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border-2 border-dashed border-[hsl(var(--primary))]/40 p-12 text-center bg-[hsl(var(--primary))]/5"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block mb-3"
        >
          <Upload className="w-10 h-10 text-[hsl(var(--primary))] mx-auto" />
        </motion.div>
        <p className="text-sm font-medium">Drag & drop your PDF here</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">or click to browse</p>
      </motion.div>

      {/* Simulated file appearing */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
      >
        <div className="w-10 h-10 rounded-lg bg-[hsl(var(--primary))]/10 flex items-center justify-center">
          <FileText className="w-5 h-5 text-[hsl(var(--primary))]" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-medium">Contract_Agreement.pdf</p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">2.4 MB · 5 pages</p>
        </div>
        <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
      </motion.div>
    </div>
  )
}

function DemoFieldsVisual() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4">
        {/* Fake PDF page */}
        <div className="space-y-2">
          {[80, 60, 70, 50].map((width, i) => (
            <div
              key={i}
              className="h-2 rounded-full bg-[hsl(var(--muted-foreground) / 0.15)]"
              style={{ width: `${width}%` }}
            />
          ))}
        </div>

        {/* Signature field being placed */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="absolute right-8 bottom-16"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-32 h-12 rounded-lg border-2 border-dashed border-[hsl(var(--accent-coral))] bg-[hsl(var(--accent-coral))]/10 flex items-center justify-center"
          >
            <PenTool className="w-4 h-4 text-[hsl(var(--accent-coral))]" />
            <span className="text-xs ml-1 text-[hsl(var(--accent-coral))] font-medium">Sign here</span>
          </motion.div>
        </motion.div>

        {/* Click ripple */}
        <motion.div
          initial={{ scale: 0, opacity: 0.5 }}
          animate={{ scale: [0, 2, 0], opacity: [0.5, 0, 0] }}
          transition={{ delay: 0.4, duration: 1 }}
          className="absolute right-14 bottom-20 w-6 h-6 rounded-full border-2 border-[hsl(var(--accent-coral))]"
        />
      </div>

      {/* Field type pills */}
      <div className="flex gap-2 flex-wrap justify-center">
        {['Signature', 'Initials', 'Date', 'Text'].map((type, i) => (
          <motion.span
            key={type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 + i * 0.1 }}
            className="px-3 py-1 rounded-full text-xs font-medium bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]"
          >
            {type}
          </motion.span>
        ))}
      </div>
    </div>
  )
}

function DemoInviteVisual() {
  const emails = ['alice@example.com', 'bob@example.com', 'carol@example.com']
  return (
    <div className="space-y-3">
      {emails.map((email, i) => (
        <motion.div
          key={email}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.15 }}
          className="flex items-center gap-3 p-3 rounded-xl bg-[hsl(var(--background))] border border-[hsl(var(--border))]"
        >
          <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))]/10 flex items-center justify-center text-xs font-bold text-[hsl(var(--primary))]">
            {email[0].toUpperCase()}
          </div>
          <span className="text-sm flex-1 text-left">{email}</span>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: i * 0.15 + 0.3 }}
          >
            <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
          </motion.div>
        </motion.div>
      ))}

      {/* Email being sent animation */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-center gap-2 pt-2"
      >
        <motion.div
          animate={{ x: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Mail className="w-5 h-5 text-[hsl(var(--primary))]" />
        </motion.div>
        <span className="text-sm font-medium text-[hsl(var(--primary))]">Sending invitations...</span>
      </motion.div>
    </div>
  )
}

function DemoSignVisual() {
  return (
    <div className="space-y-4">
      {/* Signature drawing animation */}
      <div className="rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-6">
        <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3 text-left">Signature</p>
        <svg viewBox="0 0 200 60" className="w-full h-16">
          <motion.path
            d="M 10 40 Q 30 10, 50 35 T 90 30 Q 110 15, 130 35 T 180 25"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, ease: 'easeInOut' }}
          />
        </svg>
      </div>

      {/* Completion checkmarks */}
      <div className="space-y-2">
        {['alice@example.com', 'bob@example.com', 'carol@example.com'].map((email, i) => (
          <motion.div
            key={email}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 + i * 0.2 }}
            className="flex items-center gap-2 text-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.6 + i * 0.2, type: 'spring', stiffness: 200 }}
            >
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--success))]" />
            </motion.div>
            <span className="text-[hsl(var(--muted-foreground))]">{email}</span>
            <span className="text-[hsl(var(--success))] text-xs font-medium ml-auto">Signed</span>
          </motion.div>
        ))}
      </div>

      {/* Complete badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.4, type: 'spring', stiffness: 200 }}
        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-[hsl(var(--success))]/10"
      >
        <CheckCircle2 className="w-5 h-5 text-[hsl(var(--success))]" />
        <span className="font-bold text-[hsl(var(--success))]">Document Complete!</span>
      </motion.div>
    </div>
  )
}
