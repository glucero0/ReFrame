import { describe, expect, it } from 'vitest'
import {
  CUTOUT_LAYOUT_GAP,
  MAX_CUTOUT_DISPLAY,
  cutoutDisplayScale,
  cutoutLayoutPosition,
  cutoutLayoutSlotSize,
  findCutByRegionId,
  nextCutoutPlacement,
} from './stage2Cutouts'
import type { ProcessedCut } from './regionTypes'

describe('cutoutDisplayScale', () => {
  it('scales down large images to fit MAX_CUTOUT_DISPLAY', () => {
    expect(cutoutDisplayScale(360, 200)).toBe(0.5)
    expect(cutoutDisplayScale(200, 360)).toBe(0.5)
  })

  it('never scales up beyond 1', () => {
    expect(cutoutDisplayScale(100, 80)).toBe(1)
    expect(cutoutDisplayScale(180, 180)).toBe(1)
  })

  it('handles zero dimensions safely', () => {
    expect(cutoutDisplayScale(0, 0)).toBe(1)
  })
})

describe('cutoutLayoutSlotSize', () => {
  it('combines display max and gap', () => {
    expect(cutoutLayoutSlotSize()).toBe(MAX_CUTOUT_DISPLAY + CUTOUT_LAYOUT_GAP)
    expect(cutoutLayoutSlotSize(10)).toBe(MAX_CUTOUT_DISPLAY + 10)
  })
})

describe('cutoutLayoutPosition', () => {
  const canvasWidth = 1000
  const gap = 20
  const slot = cutoutLayoutSlotSize(gap)
  const cols = Math.max(1, Math.floor((canvasWidth - gap) / slot))

  it('places index 0 at the top-left slot', () => {
    expect(cutoutLayoutPosition(0, canvasWidth, 800, gap)).toEqual({
      x: gap,
      y: gap,
    })
  })

  it('wraps to the next row after filling columns', () => {
    const nextRowIndex = cols
    expect(cutoutLayoutPosition(nextRowIndex, canvasWidth, 800, gap)).toEqual({
      x: gap,
      y: gap + slot,
    })
  })

  it('assigns unique non-overlapping positions for sequential indices', () => {
    const positions = Array.from({ length: cols * 2 + 1 }, (_, index) =>
      cutoutLayoutPosition(index, canvasWidth, 800, gap),
    )
    const keys = positions.map((p) => `${p.x},${p.y}`)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe('findCutByRegionId', () => {
  const cuts: ProcessedCut[] = [
    {
      regionId: 'a',
      label: 1,
      blob: new Blob(),
      previewUrl: 'a.png',
      originalPreviewUrl: 'a-orig.png',
      detectedBackgroundColor: null,
      bakedRotation: 0,
    },
    {
      regionId: 'b',
      label: 2,
      blob: new Blob(),
      previewUrl: 'b.png',
      originalPreviewUrl: 'b-orig.png',
      detectedBackgroundColor: null,
      bakedRotation: 0,
    },
  ]

  it('returns matching cut by region id', () => {
    expect(findCutByRegionId(cuts, 'b')?.label).toBe(2)
  })

  it('returns undefined when not found', () => {
    expect(findCutByRegionId(cuts, 'missing')).toBeUndefined()
  })
})

describe('nextCutoutPlacement', () => {
  it('uses default canvas width and gap', () => {
    expect(nextCutoutPlacement(0)).toEqual(cutoutLayoutPosition(0))
    expect(nextCutoutPlacement(3)).toEqual(cutoutLayoutPosition(3))
  })
})
