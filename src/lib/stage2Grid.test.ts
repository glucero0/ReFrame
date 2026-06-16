import { describe, expect, it } from 'vitest'
import {
  autofitScale,
  gridBackgroundStyle,
  gridCellPosition,
  gridColumns,
  isTransparentFill,
  resolveShapeFill,
  snapFabricObjectPosition,
  snapToGrid,
} from './stage2Grid'

describe('snapToGrid', () => {
  it('rounds to nearest grid line', () => {
    expect(snapToGrid(23, 40)).toBe(40)
    expect(snapToGrid(39, 40)).toBe(40)
    expect(snapToGrid(41, 40)).toBe(40)
    expect(snapToGrid(61, 40)).toBe(80)
  })

  it('returns value unchanged when grid size is invalid', () => {
    expect(snapToGrid(23, 0)).toBe(23)
    expect(snapToGrid(23, -10)).toBe(23)
  })
})

describe('gridColumns', () => {
  it('computes column count from canvas width', () => {
    expect(gridColumns(1000, 40)).toBe(25)
    expect(gridColumns(30, 40)).toBe(1)
  })
})

describe('gridCellPosition', () => {
  it('places cells in row-major order', () => {
    expect(gridCellPosition(0, 40, 1000)).toEqual({ x: 0, y: 0 })
    expect(gridCellPosition(1, 40, 1000)).toEqual({ x: 40, y: 0 })
    expect(gridCellPosition(25, 40, 1000)).toEqual({ x: 0, y: 40 })
  })
})

describe('autofitScale', () => {
  it('scales large images to fit inside a cell with padding', () => {
    expect(autofitScale(200, 100, 40)).toBeCloseTo(0.18)
  })

  it('never scales above 1', () => {
    expect(autofitScale(10, 10, 40)).toBe(1)
  })
})

describe('snapFabricObjectPosition', () => {
  it('snaps object left and top to grid', () => {
    const coords = { left: 23, top: 78 }
    snapFabricObjectPosition(
      {
        ...coords,
        set(props) {
          Object.assign(coords, props)
        },
        setCoords: () => {},
      },
      40,
    )
    expect(coords).toEqual({ left: 40, top: 80 })
  })
})

describe('resolveShapeFill', () => {
  it('returns transparent when requested', () => {
    expect(resolveShapeFill('#ff0000', true)).toBe('transparent')
  })

  it('returns fill color when not transparent', () => {
    expect(resolveShapeFill('#ff0000', false)).toBe('#ff0000')
  })
})

describe('isTransparentFill', () => {
  it('detects transparent fill values', () => {
    expect(isTransparentFill('transparent')).toBe(true)
    expect(isTransparentFill('rgba(0,0,0,0)')).toBe(true)
    expect(isTransparentFill('')).toBe(true)
    expect(isTransparentFill('#fff')).toBe(false)
  })
})

describe('gridBackgroundStyle', () => {
  it('returns plain white background when grid is hidden', () => {
    expect(gridBackgroundStyle(false, 40)).toEqual({ backgroundColor: '#ffffff' })
  })

  it('includes grid lines when shown', () => {
    const style = gridBackgroundStyle(true, 40)
    expect(style.backgroundColor).toBe('#ffffff')
    expect(style.backgroundSize).toBe('40px 40px')
    expect(String(style.backgroundImage)).toContain('linear-gradient')
  })
})
