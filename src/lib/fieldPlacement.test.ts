import { describe, expect, it } from 'vitest'
import {
  adjustFieldWithKeyboard,
  fieldsOverlap,
  getFieldPlacement,
  getOverlappingField,
} from './fieldPlacement'

describe('getFieldPlacement', () => {
  it('centers a signature field on the pointer', () => {
    expect(getFieldPlacement('signature', 300, 400, 600, 800)).toEqual({
      x: 39,
      y: 46.5,
      width: 22,
      height: 7,
    })
  })

  it('keeps the whole field inside the top-left page edge', () => {
    expect(getFieldPlacement('text', 0, 0, 600, 800)).toEqual({
      x: 0,
      y: 0,
      width: 20,
      height: 5,
    })
  })

  it('keeps the whole field inside the bottom-right page edge', () => {
    expect(getFieldPlacement('checkbox', 600, 800, 600, 800)).toEqual({
      x: 95,
      y: 96.25,
      width: 5,
      height: 3.75,
    })
  })

  it('keeps checkbox fields visually square on portrait and landscape pages', () => {
    const portrait = getFieldPlacement('checkbox', 300, 400, 600, 800)
    const landscape = getFieldPlacement('checkbox', 400, 300, 800, 600)

    expect(portrait.width * 600 / 100).toBeCloseTo(portrait.height * 800 / 100)
    expect(landscape.width * 800 / 100).toBeCloseTo(landscape.height * 600 / 100)
  })
})

describe('field overlap detection', () => {
  const field = { id: 'field-1', page_number: 1, x: 10, y: 10, width: 20, height: 8 }

  it('detects intersecting and contained fields', () => {
    expect(fieldsOverlap(field, { x: 25, y: 12, width: 10, height: 5 })).toBe(true)
    expect(fieldsOverlap(field, { x: 12, y: 12, width: 4, height: 3 })).toBe(true)
  })

  it('allows fields to touch without overlapping', () => {
    expect(fieldsOverlap(field, { x: 30, y: 10, width: 10, height: 8 })).toBe(false)
    expect(fieldsOverlap(field, { x: 10, y: 18, width: 20, height: 8 })).toBe(false)
  })

  it('checks only the same page and can exclude the field being moved', () => {
    const otherPage = { ...field, id: 'field-2', page_number: 2 }
    const candidate = { page_number: 1, x: 12, y: 12, width: 5, height: 4 }

    expect(getOverlappingField([otherPage], candidate)).toBeUndefined()
    expect(getOverlappingField([field], candidate)?.id).toBe('field-1')
    expect(getOverlappingField([field], candidate, 'field-1')).toBeUndefined()
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
