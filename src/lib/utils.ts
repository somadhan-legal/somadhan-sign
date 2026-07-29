import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0] || '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatDate(date: string, locale = 'en-US'): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatSigningDate(value: string): string {
  const dateValue = value.startsWith('date:') ? value.slice(5) : value
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue)
  if (!match) return dateValue
  return `${match[3]}/${match[2]}/${match[1]}`
}
