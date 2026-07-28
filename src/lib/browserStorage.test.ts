import { describe, expect, it } from 'vitest'
import { readLocalPreference, writeLocalPreference } from './browserStorage'

describe('browser preference storage outside a browser', () => {
  it('falls back safely when local storage is unavailable', () => {
    expect(readLocalPreference('theme')).toBeNull()
    expect(writeLocalPreference('theme', 'dark')).toBe(false)
  })

  it('falls back safely when a browser denies storage access', () => {
    const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window')
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        get localStorage() {
          throw new DOMException('Storage access denied', 'SecurityError')
        },
      },
    })

    try {
      expect(readLocalPreference('theme')).toBeNull()
      expect(writeLocalPreference('theme', 'dark')).toBe(false)
    } finally {
      if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow)
      else Reflect.deleteProperty(globalThis, 'window')
    }
  })
})
