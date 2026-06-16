import type { FilterSettings } from './regionTypes'
import { hasActiveFilters } from './filterDefaults'

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/** Pixels at or above this level become white; darker pixels become black. */
const TEXT_THRESHOLD_LEVEL = 210

export function applyFiltersToContext(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: FilterSettings,
): void {
  if (!hasActiveFilters(settings)) return

  applyPixelAdjustments(ctx, width, height, settings)
  applyStyleFilters(ctx, width, height, settings, false)

  if (settings.sharpen) {
    applySharpen(ctx, width, height)
  }

  if (settings.vignette > 0) {
    applyVignette(ctx, width, height, settings.vignette)
  }

  if (settings.blur > 0) {
    applyStyleFilters(ctx, width, height, settings, true)
  }
}

function applyPixelAdjustments(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: FilterSettings,
): void {
  const needsPixelPass =
    settings.brightness !== 0 ||
    settings.contrast !== 0 ||
    settings.grayscale ||
    settings.threshold ||
    settings.exposure !== 0 ||
    settings.gamma !== 1 ||
    settings.tintRed !== 0 ||
    settings.tintGreen !== 0 ||
    settings.tintBlue !== 0

  if (!needsPixelPass) return

  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const brightness = settings.brightness
  const contrast = settings.contrast
  const contrastFactor =
    contrast === 0 ? 1 : (259 * (contrast + 255)) / (255 * (259 - contrast))
  const exposureFactor = Math.pow(2, settings.exposure / 100)
  const gamma = settings.gamma
  const tintR = settings.tintRed * 2.55
  const tintG = settings.tintGreen * 2.55
  const tintB = settings.tintBlue * 2.55

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 16) continue

    let r = data[i]
    let g = data[i + 1]
    let b = data[i + 2]

    if (settings.exposure !== 0) {
      r = clamp(r * exposureFactor, 0, 255)
      g = clamp(g * exposureFactor, 0, 255)
      b = clamp(b * exposureFactor, 0, 255)
    }

    if (gamma !== 1) {
      r = clamp(Math.pow(r / 255, gamma) * 255, 0, 255)
      g = clamp(Math.pow(g / 255, gamma) * 255, 0, 255)
      b = clamp(Math.pow(b / 255, gamma) * 255, 0, 255)
    }

    if (tintR !== 0 || tintG !== 0 || tintB !== 0) {
      r = clamp(r + tintR, 0, 255)
      g = clamp(g + tintG, 0, 255)
      b = clamp(b + tintB, 0, 255)
    }

    r = clamp(r + brightness, 0, 255)
    g = clamp(g + brightness, 0, 255)
    b = clamp(b + brightness, 0, 255)

    if (contrast !== 0) {
      r = clamp(contrastFactor * (r - 128) + 128, 0, 255)
      g = clamp(contrastFactor * (g - 128) + 128, 0, 255)
      b = clamp(contrastFactor * (b - 128) + 128, 0, 255)
    }

    if (settings.grayscale || settings.threshold) {
      const gray = 0.299 * r + 0.587 * g + 0.114 * b
      if (settings.threshold) {
        const v = gray >= TEXT_THRESHOLD_LEVEL ? 255 : 0
        r = g = b = v
      } else {
        r = g = b = gray
      }
    }

    data[i] = r
    data[i + 1] = g
    data[i + 2] = b
  }

  ctx.putImageData(imageData, 0, 0)
}

function applyStyleFilters(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: FilterSettings,
  blurOnly: boolean,
): void {
  const parts: string[] = []

  if (blurOnly) {
    if (settings.blur > 0) parts.push(`blur(${settings.blur}px)`)
  } else {
    if (settings.saturation !== 100) {
      parts.push(`saturate(${settings.saturation}%)`)
    }
    if (settings.hueRotate !== 0) {
      parts.push(`hue-rotate(${settings.hueRotate}deg)`)
    }
    if (settings.invert > 0) parts.push(`invert(${settings.invert}%)`)
    if (settings.sepia > 0) parts.push(`sepia(${settings.sepia}%)`)
  }

  if (parts.length === 0) return

  const source = ctx.canvas
  const temp = document.createElement('canvas')
  temp.width = width
  temp.height = height
  const tctx = temp.getContext('2d')
  if (!tctx) return

  tctx.filter = parts.join(' ')
  tctx.drawImage(source, 0, 0, width, height)
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(temp, 0, 0, width, height)
}

function applyVignette(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  amount: number,
): void {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const strength = amount / 100
  const cx = width / 2
  const cy = height / 2
  const maxDist = Math.hypot(cx, cy)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      if (data[i + 3] < 16) continue

      const dist = Math.hypot(x - cx, y - cy)
      const factor = 1 - strength * Math.pow(dist / maxDist, 2)

      data[i] = clamp(data[i] * factor, 0, 255)
      data[i + 1] = clamp(data[i + 1] * factor, 0, 255)
      data[i + 2] = clamp(data[i + 2] * factor, 0, 255)
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

function applySharpen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  if (width < 3 || height < 3) return

  const source = ctx.getImageData(0, 0, width, height)
  const output = ctx.createImageData(width, height)
  output.data.set(source.data)

  const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0]
  const strength = 0.45

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const alphaIndex = (y * width + x) * 4 + 3
      if (source.data[alphaIndex] < 16) continue

      for (let c = 0; c < 3; c++) {
        let sum = 0
        let ki = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = ((y + ky) * width + (x + kx)) * 4 + c
            sum += source.data[px] * kernel[ki]
            ki++
          }
        }
        const original = source.data[(y * width + x) * 4 + c]
        const sharpened = clamp(original + (sum - original) * strength, 0, 255)
        output.data[(y * width + x) * 4 + c] = sharpened
      }
    }
  }

  ctx.putImageData(output, 0, 0)
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpg',
  quality = 0.92,
): Promise<Blob> {
  const mime = format === 'png' ? 'image/png' : 'image/jpeg'
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to create blob'))
      },
      mime,
      quality,
    )
  })
}
