import { describe, expect, it } from 'vitest'
import { getRouteTitle } from './routeMetadata'

describe('getRouteTitle', () => {
  it.each([
    ['/', 'Somadhan Sign | Clear electronic signing'],
    ['/login', 'Sign in or create an account | Somadhan Sign'],
    ['/reset-password', 'Reset password | Somadhan Sign'],
    ['/dashboard', 'My documents | Somadhan Sign'],
    ['/sign/token', 'Sign a document | Somadhan Sign'],
    ['/view/token', 'View document | Somadhan Sign'],
    ['/document/id/edit', 'Prepare document | Somadhan Sign'],
    ['/document/id', 'Document details | Somadhan Sign'],
    ['/missing', 'Page not found | Somadhan Sign'],
  ])('returns the correct title for %s', (pathname, title) => {
    expect(getRouteTitle(pathname)).toBe(title)
  })
})
