import { describe, expect, it } from 'vitest'
import {
  computeExportDimensions,
  computeLetterboxPlacement,
  layoutJsonHasContent,
} from './stage3Export'

describe('computeExportDimensions', () => {
  it('returns original pixel size for original preset', () => {
    expect(computeExportDimensions('original', 0, 0, 300, false)).toEqual({
      pixelWidth: 1000,
      pixelHeight: 800,
    })
  })

  it('computes print preset pixels from dpi', () => {
    const dims = computeExportDimensions('letter', 0, 0, 300, true)
    expect(dims.pixelWidth).toBe(Math.round(8.5 * 300))
    expect(dims.pixelHeight).toBe(Math.round(11 * 300))
    expect(dims.pageWidthPt).toBeCloseTo(8.5 * 72)
    expect(dims.pageHeightPt).toBeCloseTo(11 * 72)
  })

  it('uses custom pixel dimensions', () => {
    expect(computeExportDimensions('custom', 640, 480, 150, false)).toEqual({
      pixelWidth: 640,
      pixelHeight: 480,
    })
  })
})

describe('computeLetterboxPlacement', () => {
  it('centers layout with uniform scale', () => {
    const placement = computeLetterboxPlacement(1000, 800, 2000, 2000)
    expect(placement.scale).toBe(2)
    expect(placement.drawWidth).toBe(2000)
    expect(placement.drawHeight).toBe(1600)
    expect(placement.offsetX).toBe(0)
    expect(placement.offsetY).toBe(200)
  })
})

describe('layoutJsonHasContent', () => {
  it('returns false for null or background-only json', () => {
    expect(layoutJsonHasContent(null)).toBe(false)
    expect(
      layoutJsonHasContent(
        JSON.stringify({
          objects: [{ data: { kind: 'background' } }],
        }),
      ),
    ).toBe(false)
  })

  it('detects cutouts, text, and shapes', () => {
    expect(
      layoutJsonHasContent(
        JSON.stringify({ objects: [{ data: { kind: 'cutout' } }] }),
      ),
    ).toBe(true)
    expect(
      layoutJsonHasContent(
        JSON.stringify({ objects: [{ data: { kind: 'text' } }] }),
      ),
    ).toBe(true)
  })
})
