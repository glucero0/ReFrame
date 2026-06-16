import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_FILTERS,
  cloneRegions,
  ensureRegionFilters,
  nextRegionLabel,
  regionFromEllipse,
  regionFromRect,
  type Region,
} from './regionTypes'

beforeEach(() => {
  vi.stubGlobal('crypto', {
    randomUUID: vi.fn(() => 'test-region-id'),
  })
})

describe('regionFromRect', () => {
  it('normalizes negative width and height', () => {
    const region = regionFromRect(50, 60, -30, -40, 1)
    expect(region).toMatchObject({
      id: 'test-region-id',
      type: 'rect',
      x: 20,
      y: 20,
      w: 30,
      h: 40,
      label: 1,
    })
  })

  it('preserves positive dimensions', () => {
    const region = regionFromRect(10, 20, 100, 50, 2)
    expect(region).toMatchObject({
      type: 'rect',
      x: 10,
      y: 20,
      w: 100,
      h: 50,
      label: 2,
    })
  })
})

describe('regionFromEllipse', () => {
  it('uses absolute radii', () => {
    const region = regionFromEllipse(100, 200, -25, -15, 3)
    expect(region).toMatchObject({
      id: 'test-region-id',
      type: 'ellipse',
      cx: 100,
      cy: 200,
      rx: 25,
      ry: 15,
      label: 3,
    })
  })
})

describe('nextRegionLabel', () => {
  it('starts at 1 for empty regions', () => {
    expect(nextRegionLabel([])).toBe(1)
  })

  it('returns max label plus one', () => {
    const regions: Region[] = [
      { id: 'a', type: 'rect', x: 0, y: 0, w: 1, h: 1, label: 1 },
      { id: 'b', type: 'rect', x: 0, y: 0, w: 1, h: 1, label: 5 },
    ]
    expect(nextRegionLabel(regions)).toBe(6)
  })
})

describe('cloneRegions', () => {
  it('returns shallow copies', () => {
    const regions: Region[] = [
      { id: 'a', type: 'rect', x: 0, y: 0, w: 10, h: 10, label: 1 },
    ]
    const cloned = cloneRegions(regions)
    expect(cloned).toEqual(regions)
    expect(cloned).not.toBe(regions)
    expect(cloned[0]).not.toBe(regions[0])
  })
})

describe('ensureRegionFilters', () => {
  const regions: Region[] = [
    { id: 'keep', type: 'rect', x: 0, y: 0, w: 1, h: 1, label: 1 },
    { id: 'new', type: 'rect', x: 0, y: 0, w: 1, h: 1, label: 2 },
  ]

  it('preserves existing filter settings for known regions', () => {
    const existing = {
      keep: { ...DEFAULT_FILTERS, brightness: 42 },
      stale: { ...DEFAULT_FILTERS, contrast: 99 },
    }
    const next = ensureRegionFilters(regions, existing)
    expect(next.keep.brightness).toBe(42)
    expect(next.new).toEqual(DEFAULT_FILTERS)
    expect(next.stale).toBeUndefined()
  })

  it('clones filter objects so mutations do not alias store state', () => {
    const existing = {
      keep: { ...DEFAULT_FILTERS, brightness: 10 },
    }
    const next = ensureRegionFilters(regions, existing)
    next.keep.brightness = 999
    expect(existing.keep.brightness).toBe(10)
  })
})
