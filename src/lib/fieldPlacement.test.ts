import { describe, expect, it } from 'vitest'
import { adjustFieldWithKeyboard, getFieldPlacement } from './fieldPlacement'

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

describe('adjustFieldWithKeyboard', () => {
  const field = { x: 40, y: 47, width: 20, height: 6 }

  it('moves fields and supports fine adjustments', () => {
    expect(adjustFieldWithKeyboard(field, 'ArrowRight', false, false).x).toBe(41)
    expect(adjustFieldWithKeyboard(field, 'ArrowUp', false, true).y).toBe(46.75)
  })

  it('resizes fields without moving their top-left corner', () => {
    expect(adjustFieldWithKeyboard(field, 'ArrowRight', true, false)).toEqual({
      ...field,
      width: 21,
    })
    expect(adjustFieldWithKeyboard(field, 'ArrowUp', true, true).height).toBe(5.75)
  })

  it('keeps movement and size inside page bounds', () => {
    expect(adjustFieldWithKeyboard({ x: 96, y: 97, width: 4, height: 3 }, 'ArrowRight', false, false).x).toBe(96)
    expect(adjustFieldWithKeyboard({ x: 96, y: 97, width: 4, height: 3 }, 'ArrowDown', true, false).height).toBe(3)
  })
})
