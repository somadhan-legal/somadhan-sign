import { describe, expect, it } from 'vitest'
import { fitSingleLineFieldText, normalizeFieldText } from './fieldText'

const measureMonospace = (text: string, size: number) => text.length * size

describe('normalizeFieldText', () => {
  it('turns pasted multiline content into one clean line', () => {
    expect(normalizeFieldText('  Approved\n\t by   counsel  ')).toBe('Approved by counsel')
  })
})

describe('fitSingleLineFieldText', () => {
  it('keeps short text at the preferred size', () => {
    expect(fitSingleLineFieldText('OK', measureMonospace, 40, 14)).toEqual({
      text: 'OK',
      size: 14,
    })
  })

  it('shrinks text before shortening it', () => {
    expect(fitSingleLineFieldText('Approved', measureMonospace, 80, 14)).toEqual({
      text: 'Approved',
      size: 10,
    })
  })

  it('shortens text at the minimum readable size', () => {
    expect(fitSingleLineFieldText('A very long approval', measureMonospace, 48, 14)).toEqual({
      text: 'A ver...',
      size: 6,
    })
  })
})
