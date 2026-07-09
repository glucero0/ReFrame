import { describe, expect, it } from 'vitest'
import { formatPixelDimensions } from './cutoutTrayView'

describe('formatPixelDimensions', () => {
  it('formats width and height with a multiplication sign', () => {
    expect(formatPixelDimensions(2400, 1800)).toBe('2400 × 1800 px')
  })
})
