import { describe, expect, it } from 'vitest'
import type { PDFPage } from 'pdf-lib'
import { getPlacementRect, type SignedField } from './signedPdf'

const placement: SignedField = {
  field_type: 'signature',
  page_number: 1,
  x_percent: 10,
  y_percent: 20,
  width_percent: 30,
  height_percent: 10,
  signature_id: 'data:image/png;base64,',
}

const page = (rotation: number, crop = { x: 0, y: 0, width: 100, height: 200 }) => ({
  getCropBox: () => crop,
  getRotation: () => ({ angle: rotation }),
}) as unknown as PDFPage

describe('getPlacementRect', () => {
  it('maps an unrotated visual rectangle into PDF coordinates', () => {
    expect(getPlacementRect(page(0), placement)).toEqual({
      x: 10,
      y: 140,
      width: 30,
      height: 20,
      rotation: 0,
    })
  })

  it('maps a 90 degree page into the rotated visual coordinate system', () => {
    expect(getPlacementRect(page(90), placement)).toEqual({
      x: 30,
      y: 20,
      width: 60,
      height: 10,
      rotation: 90,
    })
  })

  it('maps a 180 degree page into the rotated visual coordinate system', () => {
    expect(getPlacementRect(page(180), placement)).toEqual({
      x: 90,
      y: 60,
      width: 30,
      height: 20,
      rotation: 180,
    })
  })

  it('maps a 270 degree page into the rotated visual coordinate system', () => {
    expect(getPlacementRect(page(270), placement)).toEqual({
      x: 70,
      y: 180,
      width: 60,
      height: 10,
      rotation: 270,
    })
  })

  it('respects crop-box offsets', () => {
    expect(getPlacementRect(page(0, { x: 5, y: 7, width: 100, height: 200 }), placement)).toEqual({
      x: 15,
      y: 147,
      width: 30,
      height: 20,
      rotation: 0,
    })
  })
})
