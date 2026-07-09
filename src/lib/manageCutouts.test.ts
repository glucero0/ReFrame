import { describe, expect, it } from 'vitest'
import { cutoutFileName } from './manageCutouts'

describe('cutoutFileName', () => {
  it('zero-pads labels in file names', () => {
    expect(cutoutFileName(1)).toBe('cutout-01.png')
    expect(cutoutFileName(12)).toBe('cutout-12.png')
  })
})
