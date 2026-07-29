import { describe, expect, it } from 'vitest'
import { getFittedSignatureFontSize } from './typedSignature'

describe('getFittedSignatureFontSize', () => {
  it('keeps the preferred size when the signature already fits', () => {
    expect(getFittedSignatureFontSize('Amina', (size) => size * 3, 500)).toBe(64)
  })

  it('shrinks a long signature until it fits', () => {
    const size = getFittedSignatureFontSize('A long name', (candidate) => candidate * 8, 320)
    expect(size).toBe(40)
  })

  it('stops at a readable minimum and lets the canvas apply a final width cap', () => {
    expect(getFittedSignatureFontSize('Very long name', (size) => size * 100, 320)).toBe(24)
  })
})
