import { describe, expect, it } from 'vitest'
import {
  assertFileWithinLimits,
  assertImageWithinLimits,
  assertRegionCountWithinLimits,
  clampExportDimensions,
  MAX_CUT_REGIONS,
  MAX_EXPORT_PIXELS,
  MAX_IMAGE_DIMENSION,
  MAX_IMAGE_PIXELS,
  MAX_UPLOAD_FILE_BYTES,
  ResourceLimitError,
} from './limits'

describe('limits', () => {
  it('rejects oversized files', () => {
    expect(() => assertFileWithinLimits(MAX_UPLOAD_FILE_BYTES + 1)).toThrow(
      ResourceLimitError,
    )
  })

  it('rejects images over dimension cap', () => {
    expect(() =>
      assertImageWithinLimits(MAX_IMAGE_DIMENSION + 1, 100),
    ).toThrow(ResourceLimitError)
  })

  it('rejects images over pixel cap', () => {
    const side = Math.ceil(Math.sqrt(MAX_IMAGE_PIXELS)) + 1
    expect(() => assertImageWithinLimits(side, side)).toThrow(ResourceLimitError)
  })

  it('clamps export dimensions to pixel budget', () => {
    const { pixelWidth, pixelHeight } = clampExportDimensions(10000, 10000)
    expect(pixelWidth).toBeLessThanOrEqual(8192)
    expect(pixelHeight).toBeLessThanOrEqual(8192)
    expect(pixelWidth * pixelHeight).toBeLessThanOrEqual(MAX_EXPORT_PIXELS)
  })

  it('rejects too many regions', () => {
    expect(() => assertRegionCountWithinLimits(MAX_CUT_REGIONS + 1)).toThrow(
      ResourceLimitError,
    )
  })
})
