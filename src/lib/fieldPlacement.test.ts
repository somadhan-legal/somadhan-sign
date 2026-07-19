import { describe, expect, it } from 'vitest'
import { getFieldPlacement } from './fieldPlacement'

describe('getFieldPlacement', () => {
  it('centers a signature field on the pointer', () => {
    expect(getFieldPlacement('signature', 300, 400, 600, 800)).toEqual({
      x: 40,
      y: 47,
      width: 20,
      height: 6,
    })
  })

  it('keeps the whole field inside the top-left page edge', () => {
    expect(getFieldPlacement('text', 0, 0, 600, 800)).toEqual({
      x: 0,
      y: 0,
      width: 18,
      height: 4,
    })
  })

  it('keeps the whole field inside the bottom-right page edge', () => {
    expect(getFieldPlacement('checkbox', 600, 800, 600, 800)).toEqual({
      x: 96,
      y: 96,
      width: 4,
      height: 4,
    })
  })
})
