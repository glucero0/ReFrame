export function normalizeRotation(degrees: number): number {
  const rounded = Math.round(degrees * 1000) / 1000
  return ((rounded % 360) + 360) % 360
}

export function isRightAngleRotation(degrees: number): boolean {
  const normalized = normalizeRotation(degrees)
  return normalized % 90 === 0
}

/** Output canvas size after rotating an image of the given dimensions. */
export function rotatedOutputSize(
  width: number,
  height: number,
  degrees: number,
): { width: number; height: number } {
  const angle = normalizeRotation(degrees)
  if (angle === 0) {
    return { width, height }
  }

  if (isRightAngleRotation(angle)) {
    if (angle === 90 || angle === 270) {
      return { width: height, height: width }
    }
    return { width, height }
  }

  const rad = (angle * Math.PI) / 180
  const sin = Math.abs(Math.sin(rad))
  const cos = Math.abs(Math.cos(rad))
  return {
    width: Math.max(1, Math.ceil(width * cos + height * sin)),
    height: Math.max(1, Math.ceil(width * sin + height * cos)),
  }
}

type RotateCanvasOptions = {
  /** Fill with white before drawing (JPG without transparency). */
  jpgOpaque?: boolean
}

function rotateCanvasRightAngle(
  source: HTMLCanvasElement,
  degrees: number,
  options?: RotateCanvasOptions,
): HTMLCanvasElement {
  const w = source.width
  const h = source.height
  const srcCtx = source.getContext('2d')
  if (!srcCtx) throw new Error('Could not get canvas context')

  const srcData = srcCtx.getImageData(0, 0, w, h)
  const outW = degrees === 90 || degrees === 270 ? h : w
  const outH = degrees === 90 || degrees === 270 ? w : h

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const outCtx = outCanvas.getContext('2d')
  if (!outCtx) throw new Error('Could not get canvas context')

  if (options?.jpgOpaque) {
    outCtx.fillStyle = '#ffffff'
    outCtx.fillRect(0, 0, outW, outH)
  }

  const outData = outCtx.createImageData(outW, outH)

  for (let sy = 0; sy < h; sy += 1) {
    for (let sx = 0; sx < w; sx += 1) {
      let dx: number
      let dy: number
      if (degrees === 90) {
        dx = h - 1 - sy
        dy = sx
      } else if (degrees === 180) {
        dx = w - 1 - sx
        dy = h - 1 - sy
      } else if (degrees === 270) {
        dx = sy
        dy = w - 1 - sx
      } else {
        dx = sx
        dy = sy
      }

      const si = (sy * w + sx) * 4
      const di = (dy * outW + dx) * 4
      outData.data[di] = srcData.data[si]
      outData.data[di + 1] = srcData.data[si + 1]
      outData.data[di + 2] = srcData.data[si + 2]
      outData.data[di + 3] = srcData.data[si + 3]
    }
  }

  outCtx.putImageData(outData, 0, 0)
  return outCanvas
}

function rotateCanvasArbitrary(
  source: HTMLCanvasElement,
  degrees: number,
  options?: RotateCanvasOptions,
): HTMLCanvasElement {
  const w = source.width
  const h = source.height
  const rad = (degrees * Math.PI) / 180
  const { width: outW, height: outH } = rotatedOutputSize(w, h, degrees)

  const outCanvas = document.createElement('canvas')
  outCanvas.width = outW
  outCanvas.height = outH
  const ctx = outCanvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  if (options?.jpgOpaque) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, outW, outH)
  }

  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(outW / 2, outH / 2)
  ctx.rotate(rad)
  ctx.drawImage(source, -w / 2, -h / 2)

  return outCanvas
}

/** Rotate canvas contents clockwise by degrees. Returns the source when angle is 0. */
export function rotateCanvas(
  source: HTMLCanvasElement,
  degrees: number,
  options?: RotateCanvasOptions,
): HTMLCanvasElement {
  const angle = normalizeRotation(degrees)
  if (angle === 0) return source

  if (isRightAngleRotation(angle)) {
    return rotateCanvasRightAngle(source, angle, options)
  }

  return rotateCanvasArbitrary(source, angle, options)
}
