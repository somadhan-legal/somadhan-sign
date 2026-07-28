import { useState } from 'react'
import { ArrowLeft, FileQuestion, RefreshCw, WifiOff } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useLanguageStore } from '@/stores/languageStore'
import type { DocumentLoadFailure } from '@/lib/documentLoadFailure'

interface DocumentLoadFailureStateProps {
  failure: DocumentLoadFailure | null
  onRetry: () => Promise<void>
  onBack: () => void
}

export default function DocumentLoadFailureState({
  failure,
  onRetry,
  onBack,
}: DocumentLoadFailureStateProps) {
  const { t } = useLanguageStore()
  const [retrying, setRetrying] = useState(false)
  const isMissing = failure === 'not-found'

  const retry = async () => {
    if (retrying) return
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
    }
  }

  return (
    <div className="flex min-h-full items-center justify-center px-6 py-12">
      <div className="w-full max-w-md text-center" role="alert">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]">
          {isMissing ? <FileQuestion className="h-8 w-8" /> : <WifiOff className="h-8 w-8" />}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isMissing ? t('signee.docNotFound') : t('documentLoad.failedTitle')}
        </h1>
        <p className="mt-3 text-[hsl(var(--muted-foreground))]">
          {isMissing ? t('dashboard.documentUnavailable') : t('documentLoad.failedDescription')}
        </p>
        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('dashboard.backToDashboard')}
          </Button>
          <Button onClick={() => void retry()} disabled={retrying}>
            <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? t('viewer.retrying') : t('viewer.tryAgain')}
          </Button>
        </div>
      </div>
    </div>
  )
}
