const AUTH_RETURN_TO_KEY = 'somadhan-sign-auth-return-to'
const DEFAULT_AUTH_RETURN_TO = '/dashboard'
const AUTH_ENTRY_ROUTES = new Set(['/login', '/reset-password'])

export function getSafeAuthReturnTo(value?: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return DEFAULT_AUTH_RETURN_TO
  }

  try {
    const parsed = new URL(value, 'https://somadhan-sign.local')
    if (parsed.origin !== 'https://somadhan-sign.local' || AUTH_ENTRY_ROUTES.has(parsed.pathname)) {
      return DEFAULT_AUTH_RETURN_TO
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return DEFAULT_AUTH_RETURN_TO
  }
}

export function rememberAuthReturnTo(value: string): void {
  try {
    window.sessionStorage.setItem(AUTH_RETURN_TO_KEY, getSafeAuthReturnTo(value))
  } catch {
    // Session storage can be unavailable in strict browser privacy modes.
  }
}

export function readAuthReturnTo(): string | null {
  try {
    const stored = window.sessionStorage.getItem(AUTH_RETURN_TO_KEY)
    return stored ? getSafeAuthReturnTo(stored) : null
  } catch {
    return null
  }
}

export function clearAuthReturnTo(): void {
  try {
    window.sessionStorage.removeItem(AUTH_RETURN_TO_KEY)
  } catch {
    // Session storage can be unavailable in strict browser privacy modes.
  }
}
