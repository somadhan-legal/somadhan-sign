import { describe, expect, it } from 'vitest'
import { readLocalPreference, writeLocalPreference } from './browserStorage'

describe('browser preference storage outside a browser', () => {
  it('falls back safely when local storage is unavailable', () => {
    expect(readLocalPreference('theme')).toBeNull()
    expect(writeLocalPreference('theme', 'dark')).toBe(false)
  })
})
