import { describe, expect, it } from 'vitest'
import {
  isRightAngleRotation,
  normalizeRotation,
  rotatedOutputSize,
} from './imageRotation'

describe('normalizeRotation', () => {
  it('wraps degrees to 0-359', () => {
    expect(normalizeRotation(0)).toBe(0)
    expect(normalizeRotation(360)).toBe(0)
    expect(normalizeRotation(450)).toBe(90)
    expect(normalizeRotation(-90)).toBe(270)
  })
})

describe('isRightAngleRotation', () => {
  it('detects multiples of 90', () => {
    expect(isRightAngleRotation(0)).toBe(true)
    expect(isRightAngleRotation(90)).toBe(true)
    expect(isRightAngleRotation(180)).toBe(true)
    expect(isRightAngleRotation(270)).toBe(true)
    expect(isRightAngleRotation(45)).toBe(false)
  })
})

describe('rotatedOutputSize', () => {
  it('keeps dimensions for 0 and 180 degrees', () => {
    expect(rotatedOutputSize(2, 3, 0)).toEqual({ width: 2, height: 3 })
    expect(rotatedOutputSize(2, 3, 180)).toEqual({ width: 2, height: 3 })
  })

  it('swaps dimensions for 90 and 270 degrees', () => {
    expect(rotatedOutputSize(2, 3, 90)).toEqual({ width: 3, height: 2 })
    expect(rotatedOutputSize(2, 3, 270)).toEqual({ width: 3, height: 2 })
  })

  it('expands bounds for arbitrary rotation', () => {
    const size = rotatedOutputSize(4, 2, 45)
    expect(size.width).toBeGreaterThan(4)
    expect(size.height).toBeGreaterThan(2)
  })
})
