import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline'
  className?: string
  style?: React.CSSProperties
}

export default function Badge({ children, variant = 'default', className, style }: BadgeProps) {
  return (
    <span
      style={style}
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]': variant === 'default',
          'bg-green-100 text-green-700': variant === 'success',
          'bg-amber-100 text-amber-700': variant === 'warning',
          'bg-red-100 text-red-700': variant === 'destructive',
          'border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))]': variant === 'outline',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
