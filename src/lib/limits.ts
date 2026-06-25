/** Client-side resource limits to reduce DoS risk from huge images / exports. */

export const MAX_UPLOAD_FILE_BYTES = 25 * 1024 * 1024
export const MAX_IMAGE_DIMENSION = 8192
export const MAX_IMAGE_PIXELS = 16_777_216 // 4096 × 4096

export const MAX_EXPORT_DIMENSION = 8192
export const MAX_EXPORT_PIXELS = 16_777_216

export const MAX_CUT_REGIONS = 64

export class ResourceLimitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ResourceLimitError'
  }
}

export function formatMegapixels(pixels: number): string {
  return `${(pixels / 1_000_000).toFixed(1)} MP`
}

export function assertFileWithinLimits(fileSizeBytes: number): void {
  if (fileSizeBytes > MAX_UPLOAD_FILE_BYTES) {
    const maxMb = Math.round(MAX_UPLOAD_FILE_BYTES / (1024 * 1024))
    throw new ResourceLimitError(
      `Image file is too large. Maximum size is ${maxMb} MB.`,
    )
  }
}

export function assertImageWithinLimits(width: number, height: number): void {
  if (width <= 0 || height <= 0) {
    throw new ResourceLimitError('Image has invalid dimensions.')
  }

  if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
    throw new ResourceLimitError(
      `Image is too large. Maximum dimension is ${MAX_IMAGE_DIMENSION} px per side.`,
    )
  }

  const pixels = width * height
  if (pixels > MAX_IMAGE_PIXELS) {
    throw new ResourceLimitError(
      `Image has too many pixels (${formatMegapixels(pixels)}). Maximum is ${formatMegapixels(MAX_IMAGE_PIXELS)}.`,
    )
  }
}

export function clampExportDimensions(
  width: number,
  height: number,
): { pixelWidth: number; pixelHeight: number } {
  let pixelWidth = Math.max(1, Math.round(width))
  let pixelHeight = Math.max(1, Math.round(height))

  pixelWidth = Math.min(pixelWidth, MAX_EXPORT_DIMENSION)
  pixelHeight = Math.min(pixelHeight, MAX_EXPORT_DIMENSION)

  const pixels = pixelWidth * pixelHeight
  if (pixels > MAX_EXPORT_PIXELS) {
    const scale = Math.sqrt(MAX_EXPORT_PIXELS / pixels)
    pixelWidth = Math.max(1, Math.floor(pixelWidth * scale))
    pixelHeight = Math.max(1, Math.floor(pixelHeight * scale))
  }

  return { pixelWidth, pixelHeight }
}

export function assertRegionCountWithinLimits(count: number): void {
  if (count > MAX_CUT_REGIONS) {
    throw new ResourceLimitError(
      `Too many cut regions. Maximum is ${MAX_CUT_REGIONS}.`,
    )
  }
}
