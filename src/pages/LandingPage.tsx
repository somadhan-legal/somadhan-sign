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
import SomadhanLogo from '@/assets/somadhan-logo.svg'

export default function LandingPage() {
  const features = [
    {
      icon: <Upload className="w-6 h-6" />,
      title: 'Upload Documents',
      description: 'Upload any PDF document and prepare it for signing in seconds.',
    },
    {
      icon: <PenTool className="w-6 h-6" />,
      title: 'Place Signature Fields',
      description:
        'Drag and drop signature fields anywhere on the document. Assign each field to a specific signer.',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: 'Multi-Party Signing',
      description:
        'Invite multiple signers. Each signer sees only their assigned fields with guided navigation.',
    },
    {
      icon: <Send className="w-6 h-6" />,
      title: 'Send & Track',
      description:
        'Send documents for signing and track progress in real-time from your dashboard.',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Secure & Private',
      description:
        'Built on Supabase with Row Level Security. Your documents are encrypted and protected.',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Sign Anywhere',
      description:
        'Draw, type, or upload your signature. Sign all fields at once or one by one.',
    },
  ]

  const steps = [
    { num: '01', title: 'Upload your PDF', desc: 'Drag and drop or browse to upload' },
    { num: '02', title: 'Define signature fields', desc: 'Click on the PDF to place fields' },
    { num: '03', title: 'Assign signers', desc: 'Add emails and assign fields to each signer' },
    { num: '04', title: 'Send for signing', desc: 'Signers receive an email with a link' },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--primary))]/5 via-transparent to-teal-100/20" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <img src={SomadhanLogo} alt="" className="w-5 h-5" />
              Document Signing Made Simple
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Sign documents with{' '}
              <span className="text-[hsl(var(--primary))]">Somadhan</span>
            </h1>
            <p className="text-lg text-[hsl(var(--muted-foreground))] mb-8 max-w-2xl mx-auto">
              Upload documents, define signature fields, invite multiple signers,
              and get everything signed — all in one beautiful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/login?mode=signup">
                <Button size="lg" className="text-base px-8">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-base px-8">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
              Get documents signed in four simple steps
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step) => (
              <div key={step.num} className="text-center">
                <div className="text-4xl font-bold text-[hsl(var(--primary))]/20 mb-3">
                  {step.num}
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Everything you need</h2>
            <p className="text-[hsl(var(--muted-foreground))] max-w-xl mx-auto">
              Powerful features to handle any document signing workflow
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white rounded-2xl border border-[hsl(var(--border))] p-6 hover:shadow-lg transition-shadow"
              >
                <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary))]/10 flex items-center justify-center text-[hsl(var(--primary))] mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-[hsl(var(--primary))] to-teal-800 rounded-3xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-white/70 mb-8 max-w-xl mx-auto">
              Join thousands of users who trust Somadhan for their document signing needs.
            </p>
            <Link to="/login">
              <Button
                size="lg"
                className="bg-white text-[hsl(var(--primary))] hover:bg-white/90 text-base px-8"
              >
                Create Free Account
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <div className="flex items-center justify-center gap-6 mt-8 text-white/60 text-sm">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Free to start
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> No credit card
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Unlimited documents
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={SomadhanLogo} alt="Somadhan" className="w-7 h-7 rounded-lg" />
            <span className="font-semibold">Somadhan</span>
          </div>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            &copy; {new Date().getFullYear()} Somadhan. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
