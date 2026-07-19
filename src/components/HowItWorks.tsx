import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Check, CheckCircle2, FileText, Fingerprint, Mail, MousePointer2, Send, Users } from 'lucide-react'
import { useLanguageStore } from '@/stores/languageStore'

const stepIcons = [FileText, MousePointer2, Users, CheckCircle2]

export default function HowItWorks() {
  const { t } = useLanguageStore()
  const reduceMotion = useReducedMotion()
  const [activeStep, setActiveStep] = useState(0)
  const [paused, setPaused] = useState(false)

  const steps = [
    { label: t('landing.demoUpload'), caption: t('landing.demoUploadCaption') },
    { label: t('landing.demoPrepare'), caption: t('landing.demoPrepareCaption') },
    { label: t('landing.demoInvite'), caption: t('landing.demoInviteCaption') },
    { label: t('landing.demoComplete'), caption: t('landing.demoCompleteCaption') },
  ]

  useEffect(() => {
    if (paused || reduceMotion) return
    const timer = window.setInterval(() => setActiveStep((step) => (step + 1) % steps.length), 3600)
    return () => window.clearInterval(timer)
  }, [paused, reduceMotion, steps.length])

  return (
    <section id="product" className="py-24 lg:py-32">
      <div className="landing-container">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="landing-eyebrow">{t('landing.productEyebrow')}</p>
          <h2 className="landing-section-title mt-4">{t('landing.productTitle')}</h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[hsl(var(--muted-foreground))]">{t('landing.productDesc')}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="mt-14 overflow-hidden rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_24px_80px_hsl(var(--foreground)/0.08)]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
        >
          <div className="grid lg:grid-cols-[330px_1fr]">
            <div className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 lg:border-b-0 lg:border-r lg:p-6">
              <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
                {steps.map((step, index) => {
                  const Icon = stepIcons[index]
                  const active = activeStep === index
                  return (
                    <button
                      key={step.label}
                      onClick={() => setActiveStep(index)}
                      aria-label={`${step.label}: ${step.caption}`}
                      className={`min-w-[180px] rounded-2xl border p-4 text-left transition-colors lg:min-w-0 ${active ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))] text-white' : 'border-transparent hover:border-[hsl(var(--border))] hover:bg-[hsl(var(--muted))]'}`}
                      aria-pressed={active}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${active ? 'bg-white/14' : 'bg-[hsl(var(--muted))]'}`}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <p className="text-sm font-extrabold"><span className="mr-2 opacity-60">0{index + 1}</span>{step.label}</p>
                          <p className={`mt-1 text-xs ${active ? 'text-white/70' : 'text-[hsl(var(--muted-foreground))]'}`}>{step.caption}</p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="relative min-h-[520px] overflow-hidden bg-[hsl(var(--secondary))] p-5 sm:p-8 lg:p-12">
              <div className="landing-solid-lines absolute inset-0 opacity-40" aria-hidden="true" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={reduceMotion ? undefined : { opacity: 0, y: -12, scale: 0.99 }}
                  transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
                  className="relative z-10 flex min-h-[424px] items-center justify-center"
                >
                  {activeStep === 0 && <UploadScene />}
                  {activeStep === 1 && <PrepareScene />}
                  {activeStep === 2 && <InviteScene />}
                  {activeStep === 3 && <CompleteScene />}
                </motion.div>
              </AnimatePresence>
              <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 lg:hidden">
                {steps.map((_, index) => <span key={index} className={`h-1.5 rounded-full transition-all ${activeStep === index ? 'w-8 bg-[hsl(var(--primary))]' : 'w-1.5 bg-[hsl(var(--border))]'}`} />)}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Paper({ children }: { children?: React.ReactNode }) {
  return (
    <div className="relative mx-auto min-h-[390px] w-full max-w-[360px] border border-[hsl(var(--border))] bg-white p-8 text-[#232323] shadow-[0_20px_60px_rgba(35,35,35,0.12)] sm:p-10">
      <div className="mb-10 flex items-center justify-between"><div className="h-3 w-28 bg-[#232323]" /><div className="h-3 w-10 bg-[#F95943]" /></div>
      <div className="space-y-3">{[100, 78, 92, 64, 86, 55].map((width, index) => <div key={index} className="h-2 bg-[#d7d7d7]" style={{ width: `${width}%` }} />)}</div>
      {children}
      <div className="absolute bottom-12 left-8 right-8 h-px bg-[#d7d7d7] sm:left-10 sm:right-10" />
    </div>
  )
}

function UploadScene() {
  return (
    <div className="w-full max-w-lg">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border-2 border-dashed border-[hsl(var(--primary))] bg-[hsl(var(--background))] p-10 text-center sm:p-14">
        <motion.div animate={{ y: [0, -5, 0] }} transition={{ duration: 2.2, repeat: Infinity }} className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--primary))] text-white"><FileText className="h-7 w-7" /></motion.div>
        <p className="mt-6 text-lg font-extrabold">Agreement.pdf</p>
        <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Ready to prepare for signing</p>
        <div className="mx-auto mt-7 h-2 max-w-64 overflow-hidden rounded-full bg-[hsl(var(--muted))]"><motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 1.2 }} className="h-full bg-[hsl(var(--accent-coral))]" /></div>
      </motion.div>
    </div>
  )
}

function PrepareScene() {
  return (
    <div className="relative w-full max-w-xl">
      <Paper>
        <motion.div initial={{ opacity: 0, scale: 0.9, x: 30 }} animate={{ opacity: 1, scale: 1, x: 0 }} transition={{ delay: 0.16, type: 'spring', stiffness: 180 }} className="absolute bottom-24 right-7 flex h-14 w-36 items-center justify-center rounded-lg border-2 border-[#F95943] bg-white text-xs font-extrabold text-[#F95943] shadow-lg sm:right-10">
          <Fingerprint className="mr-2 h-4 w-4" /> SIGN HERE
        </motion.div>
      </Paper>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, x: [0, 7, 0], y: [0, 5, 0] }} transition={{ opacity: { delay: 0.25 }, duration: 2.2, repeat: Infinity }} className="absolute bottom-20 right-8 rounded-full bg-[#232323] p-2 text-white shadow-lg sm:right-16"><MousePointer2 className="h-4 w-4" /></motion.div>
    </div>
  )
}

function InviteScene() {
  const people = [['AR', 'Ariana Rahman', 'ariana@example.com'], ['NK', 'Nabil Khan', 'nabil@example.com'], ['TS', 'Tania Sultana', 'tania@example.com']]
  return (
    <div className="w-full max-w-lg rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 shadow-xl sm:p-7">
      <div className="mb-5 flex items-center justify-between"><div><p className="text-lg font-extrabold">Invite signers</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">Every signer gets their own fields</p></div><Users className="h-5 w-5 text-[hsl(var(--primary))]" /></div>
      <div className="space-y-3">
        {people.map(([initials, name, email], index) => (
          <motion.div key={email} initial={{ opacity: 0, x: -18 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.14 }} className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--border))] p-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-white">{initials}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{name}</p><p className="truncate text-xs text-[hsl(var(--muted-foreground))]">{email}</p></div>
            <Check className="h-4 w-4 text-[hsl(var(--primary))]" />
          </motion.div>
        ))}
      </div>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55 }} className="mt-5 flex items-center justify-center rounded-xl bg-[hsl(var(--primary))] py-3 text-sm font-bold text-white"><Mail className="mr-2 h-4 w-4" /> Invitations ready</motion.div>
    </div>
  )
}

function CompleteScene() {
  return (
    <div className="relative w-full max-w-xl">
      <Paper>
        <motion.svg viewBox="0 0 220 70" className="absolute bottom-24 left-8 right-8 h-20 w-[calc(100%-4rem)] sm:left-10 sm:right-10 sm:w-[calc(100%-5rem)]">
          <motion.path d="M12 50 C32 8, 48 58, 68 31 S105 22, 122 44 S162 8, 205 35" fill="none" stroke="#075056" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.25, ease: 'easeInOut' }} />
        </motion.svg>
      </Paper>
      <motion.div initial={{ scale: 0.75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.8, type: 'spring', stiffness: 180 }} className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-extrabold text-white shadow-xl"><Send className="h-4 w-4" /> Signed and complete</motion.div>
    </div>
  )
}
