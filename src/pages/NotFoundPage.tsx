import { Link } from 'react-router-dom'
import { FileQuestion, Home } from 'lucide-react'
import Button from '@/components/ui/Button'

export default function NotFoundPage() {
  return (
    <main className="min-h-screen bg-[hsl(var(--background))] px-6 flex items-center justify-center">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-6 h-16 w-16 rounded-2xl bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] flex items-center justify-center">
          <FileQuestion className="h-8 w-8" />
        </div>
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.18em] text-[hsl(var(--primary))]">404</p>
        <h1 className="text-3xl font-bold tracking-tight">This page could not be found</h1>
        <p className="mt-3 text-[hsl(var(--muted-foreground))]">
          The link may be incorrect or the page may have moved.
        </p>
        <Link to="/" className="mt-7 inline-block">
          <Button size="lg">
            <Home className="mr-2 h-4 w-4" />
            Return home
          </Button>
        </Link>
      </div>
    </main>
  )
}
