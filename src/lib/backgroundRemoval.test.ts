import { describe, expect, it } from 'vitest'
import {
  applyBackgroundRemovalToImageData,
  colorDistance,
  detectEdgeBackgroundColor,
  toleranceToThreshold,
} from './backgroundRemoval'

function makeImage(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = fill(x, y)
      const offset = (y * width + x) * 4
      data[offset] = r
      data[offset + 1] = g
      data[offset + 2] = b
      data[offset + 3] = a
    }
  }
  return data
}

const WHITE: [number, number, number, number] = [255, 255, 255, 255]
const RED: [number, number, number, number] = [220, 20, 20, 255]

describe('backgroundRemoval', () => {
  it('maps tolerance to a color distance threshold', () => {
    expect(toleranceToThreshold(0)).toBe(0)
    expect(toleranceToThreshold(100)).toBeCloseTo(
      colorDistance({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 }),
    )
  })

  it('detects edge background color using the median border sample', () => {
    const data = makeImage(3, 3, (x, y) => {
      if (x === 1 && y === 1) return [10, 20, 30, 255]
      return WHITE
    })

    expect(detectEdgeBackgroundColor(data, 3, 3)).toEqual({ r: 255, g: 255, b: 255 })
  })

  it('returns finite colors when width and height are fractional', () => {
    const data = makeImage(4, 4, () => WHITE)

    const color = detectEdgeBackgroundColor(data, 4.8, 3.2)
    expect(color).toEqual({ r: 255, g: 255, b: 255 })
    expect(Number.isFinite(color.r)).toBe(true)
  })

  it('removes edge-connected background while keeping the subject', () => {
    const data = makeImage(3, 3, (x, y) => {
      if (x === 1 && y === 1) return RED
      return WHITE
    })

    applyBackgroundRemovalToImageData(data, 3, 3, {
      keyColor: { r: 255, g: 255, b: 255 },
      tolerance: 5,
      fromEdgesOnly: true,
    })

    expect(data[(1 * 3 + 1) * 4 + 3]).toBe(255)
    expect(data[(0 * 3 + 0) * 4 + 3]).toBe(0)
    expect(data[(1 * 3 + 0) * 4 + 3]).toBe(0)
  })

  it('can remove all matching pixels when edge-only is disabled', () => {
    const data = makeImage(3, 3, (x, y) => {
      if (x === 2 && y === 2) return RED
      return WHITE
    })

    applyBackgroundRemovalToImageData(data, 3, 3, {
      keyColor: { r: 255, g: 255, b: 255 },
      tolerance: 5,
      fromEdgesOnly: false,
    })

    expect(data[(1 * 3 + 1) * 4 + 3]).toBe(0)
    expect(data[(2 * 3 + 2) * 4 + 3]).toBe(255)
  })
})
