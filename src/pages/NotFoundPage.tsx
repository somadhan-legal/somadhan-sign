import { Link } from 'react-router'
import { FileQuestion, Home } from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { useLanguageStore } from '@/stores/languageStore'

export default function NotFoundPage() {
  const { t } = useLanguageStore()
  return (
    <main className="min-h-dvh bg-[hsl(var(--background))] px-6 flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center">
          <FileQuestion className="h-8 w-8" />
        </div>
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">404</p>
        <h1 className="text-3xl font-bold tracking-tight">{t('notFound.title')}</h1>
        <p className="mt-3 text-[hsl(var(--muted-foreground))]">
          {t('notFound.description')}
        </p>
        <Link to="/" className={buttonStyles({ size: 'lg', className: 'mt-7' })}>
          <Home className="mr-2 h-4 w-4" />
          {t('notFound.returnHome')}
        </Link>
      </div>
    </main>
  )
}
