import { cn } from '@/lib/utils'

type ButtonStyleOptions = {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  className?: string
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonStyleOptions = {}) {
  return cn(
    'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[hsl(var(--background))] disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
    {
      'bg-[hsl(var(--primary))] text-white hover:opacity-90 focus:ring-[hsl(var(--primary))]':
        variant === 'primary',
      'bg-[hsl(var(--secondary))] text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))]/80':
        variant === 'secondary',
      'border-2 border-[hsl(var(--border))] bg-transparent hover:bg-[hsl(var(--accent))]':
        variant === 'outline',
      'bg-transparent hover:bg-[hsl(var(--accent))]':
        variant === 'ghost',
      'bg-[hsl(var(--destructive))] text-white hover:opacity-90':
        variant === 'destructive',
    },
    {
      'h-10 px-3 text-sm': size === 'sm',
      'h-11 px-4 text-sm': size === 'md',
      'h-12 px-6 text-base': size === 'lg',
      'h-11 w-11': size === 'icon',
    },
    className
  )
}
