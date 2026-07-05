import { describe, expect, it } from 'vitest'
import {
  paddedRegionToDisplay,
  scaleRegionToDisplay,
  scaleRegionToSource,
} from './regionGeometry'
import type { Region } from './regionTypes'

describe('paddedRegionToDisplay', () => {
  const rect: Region = {
    id: 'r1',
    type: 'rect',
    x: 10,
    y: 20,
    w: 100,
    h: 50,
    label: 1,
    rotation: 0,
  }

  const ellipse: Region = {
    id: 'e1',
    type: 'ellipse',
    cx: 200,
    cy: 150,
    rx: 40,
    ry: 30,
    label: 2,
    rotation: 0,
  }

  it('expands rect bounds by padding in source space then scales', () => {
    const result = paddedRegionToDisplay(rect, 1, 5)
    expect(result.type).toBe('rect')
    if (result.type !== 'rect') return
    expect(result.x).toBe(5)
    expect(result.y).toBe(15)
    expect(result.w).toBe(110)
    expect(result.h).toBe(60)
  })

  it('expands ellipse radii by padding then scales', () => {
    const result = paddedRegionToDisplay(ellipse, 1, 8)
    expect(result.type).toBe('ellipse')
    if (result.type !== 'ellipse') return
    expect(result.cx).toBe(200)
    expect(result.cy).toBe(150)
    expect(result.rx).toBe(48)
    expect(result.ry).toBe(38)
  })

  it('applies scale after padding for rects', () => {
    const result = paddedRegionToDisplay(rect, 2, 5)
    expect(result.type).toBe('rect')
    if (result.type !== 'rect') return
    expect(result.x).toBe(10)
    expect(result.y).toBe(30)
    expect(result.w).toBe(220)
    expect(result.h).toBe(120)
  })
})

describe('scale round-trip', () => {
  const rect: Region = {
    id: 'r1',
    type: 'rect',
    x: 12,
    y: 34,
    w: 80,
    h: 40,
    label: 1,
    rotation: 0,
  }

  const ellipse: Region = {
    id: 'e1',
    type: 'ellipse',
    cx: 100,
    cy: 200,
    rx: 25,
    ry: 15,
    label: 2,
    rotation: 0,
  }

  it.each([
    ['rect', rect],
    ['ellipse', ellipse],
  ] as const)('preserves %s through display and back to source', (_kind, source) => {
    const scale = 0.75
    const display = scaleRegionToDisplay(source, scale)
    const roundTrip = scaleRegionToSource(display, scale)
    expect(roundTrip).toEqual(source)
  })

  it('returns same region when scale is 1', () => {
    expect(scaleRegionToDisplay(rect, 1)).toEqual(rect)
    expect(scaleRegionToSource(rect, 1)).toEqual(rect)
  })
})
