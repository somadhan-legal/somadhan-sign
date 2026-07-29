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
    ['/verify', 'Verify completed document | Somadhan Sign'],
    ['/document/id/edit', 'Prepare document | Somadhan Sign'],
    ['/document/id', 'Document details | Somadhan Sign'],
    ['/missing', 'Page not found | Somadhan Sign'],
  ])('returns the correct title for %s', (pathname, title) => {
    expect(getRouteTitle(pathname)).toBe(title)
  })

  it.each([
    ['/', 'Somadhan Sign | সহজ ইলেকট্রনিক স্বাক্ষর'],
    ['/login', 'সাইন ইন বা অ্যাকাউন্ট তৈরি করুন | Somadhan Sign'],
    ['/reset-password', 'পাসওয়ার্ড রিসেট করুন | Somadhan Sign'],
    ['/dashboard', 'আমার ডকুমেন্টস | Somadhan Sign'],
    ['/sign/token', 'ডকুমেন্ট স্বাক্ষর করুন | Somadhan Sign'],
    ['/view/token', 'ডকুমেন্ট দেখুন | Somadhan Sign'],
    ['/verify', 'সম্পন্ন ডকুমেন্ট যাচাই করুন | Somadhan Sign'],
    ['/document/id/edit', 'ডকুমেন্ট প্রস্তুত করুন | Somadhan Sign'],
    ['/document/id', 'ডকুমেন্টের বিস্তারিত | Somadhan Sign'],
    ['/missing', 'পৃষ্ঠা পাওয়া যায়নি | Somadhan Sign'],
  ])('returns the Bangla title for %s', (pathname, title) => {
    expect(getRouteTitle(pathname, 'bn')).toBe(title)
  })
})
