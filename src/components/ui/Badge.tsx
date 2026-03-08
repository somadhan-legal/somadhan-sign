import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'outline'
  className?: string
  style?: React.CSSProperties
}

const variantStyles: Record<string, { bg: string; color: string; border: string }> = {
  default: { bg: 'hsl(var(--primary) / 0.15)', color: 'hsl(var(--primary))', border: 'hsl(var(--primary) / 0.3)' },
  success: { bg: '#dcfce7', color: '#15803d', border: '#86efac' },
  warning: { bg: '#fef3c7', color: '#b45309', border: '#fcd34d' },
  destructive: { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5' },
  outline: { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' },
}

const darkVariantStyles: Record<string, { bg: string; color: string; border: string }> = {
  default: { bg: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))', border: 'hsl(var(--primary) / 0.4)' },
  success: { bg: '#052e16', color: '#4ade80', border: '#166534' },
  warning: { bg: '#451a03', color: '#fbbf24', border: '#92400e' },
  destructive: { bg: '#450a0a', color: '#f87171', border: '#991b1b' },
  outline: { bg: '#1e293b', color: '#94a3b8', border: '#334155' },
}

export default function Badge({ children, variant = 'default', className, style }: BadgeProps) {
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  const colors = (isDark ? darkVariantStyles : variantStyles)[variant] || variantStyles.default
  return (
    <span
      style={{ backgroundColor: colors.bg, color: colors.color, borderColor: colors.border, ...style }}
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold',
        className
      )}
    >
      {children}
    </span>
  )
}
