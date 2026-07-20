import { Component, type ErrorInfo, type ReactNode } from 'react'
import Button from '@/components/ui/Button'
import { useLanguageStore } from '@/stores/languageStore'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error:', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    const t = useLanguageStore.getState().t

    return (
      <main className="min-h-dvh bg-[hsl(var(--background))] px-5 flex items-center justify-center">
        <div className="w-full max-w-md rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--destructive))]/10 text-2xl font-bold text-[hsl(var(--destructive))]">!</div>
          <h1 className="text-2xl font-bold">{t('errorBoundary.title')}</h1>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
            {t('errorBoundary.description')}
          </p>
          <Button className="mt-6 w-full" onClick={() => window.location.reload()}>
            {t('errorBoundary.reload')}
          </Button>
        </div>
      </main>
    )
  }
}
