export type Rgb = { r: number; g: number; b: number }

export function isValidRgb(color: Partial<Rgb> | null | undefined): color is Rgb {
  return (
    color != null &&
    Number.isFinite(color.r) &&
    Number.isFinite(color.g) &&
    Number.isFinite(color.b)
  )
}

export function normalizeRgb(color: Partial<Rgb>): Rgb {
  return {
    r: Math.max(0, Math.min(255, Math.round(color.r ?? 255))),
    g: Math.max(0, Math.min(255, Math.round(color.g ?? 255))),
    b: Math.max(0, Math.min(255, Math.round(color.b ?? 255))),
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

export function maxRgbDistance(): number {
  return Math.sqrt(3 * 255 * 255)
}

export function colorDistance(a: Rgb, b: Rgb): number {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2)
}

export function toleranceToThreshold(tolerance: number): number {
  const safe = Number.isFinite(tolerance) ? tolerance : 35
  return (clamp(safe, 0, 100) / 100) * maxRgbDistance()
}

function medianChannel(values: number[]): number {
  const valid = values.filter((v) => Number.isFinite(v))
  if (valid.length === 0) return 255
  const sorted = [...valid].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const result =
    sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid]
  return Number.isFinite(result) ? result : 255
}

function pixelDimensions(width: number, height: number): { width: number; height: number } {
  return {
    width: Math.max(1, Math.floor(width)),
    height: Math.max(1, Math.floor(height)),
  }
}

export function detectEdgeBackgroundColor(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): Rgb {
  const { width: w, height: h } = pixelDimensions(width, height)
  const reds: number[] = []
  const greens: number[] = []
  const blues: number[] = []

  const sample = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const i = (y * w + x) * 4
    if (i + 3 >= data.length) return
    if (data[i + 3] < 16) return
    reds.push(data[i])
    greens.push(data[i + 1])
    blues.push(data[i + 2])
  }

  for (let x = 0; x < w; x++) {
    sample(x, 0)
    if (h > 1) sample(x, h - 1)
  }
  for (let y = 1; y < h - 1; y++) {
    sample(0, y)
    if (w > 1) sample(w - 1, y)
  }

  return {
    r: medianChannel(reds),
    g: medianChannel(greens),
    b: medianChannel(blues),
  }
}

function makePixelTransparent(data: Uint8ClampedArray, pixelIndex: number): void {
  const i = pixelIndex * 4
  data[i] = 0
  data[i + 1] = 0
  data[i + 2] = 0
  data[i + 3] = 0
}

function pixelMatchesBackground(
  data: Uint8ClampedArray,
  pixelIndex: number,
  key: Rgb,
  threshold: number,
): boolean {
  const i = pixelIndex * 4
  if (data[i + 3] < 16) return false
  return (
    colorDistance(
      { r: data[i], g: data[i + 1], b: data[i + 2] },
      key,
    ) <= threshold
  )
}

function collectFloodSeeds(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  key: Rgb,
  threshold: number,
): number[] {
  const seeds: number[] = []
  const seen = new Set<number>()

  const addSeed = (x: number, y: number) => {
    const idx = y * width + x
    if (seen.has(idx)) return
    if (!pixelMatchesBackground(data, idx, key, threshold)) return
    seen.add(idx)
    seeds.push(idx)
  }

  for (let x = 0; x < width; x++) {
    addSeed(x, 0)
    if (height > 1) addSeed(x, height - 1)
  }
  for (let y = 1; y < height - 1; y++) {
    addSeed(0, y)
    if (width > 1) addSeed(width - 1, y)
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x
      if (data[idx * 4 + 3] < 16) continue
      if (!pixelMatchesBackground(data, idx, key, threshold)) continue

      const onCanvasEdge = x === 0 || x === width - 1 || y === 0 || y === height - 1
      let touchesTransparency = onCanvasEdge
      if (!touchesTransparency) {
        if (data[(y * width + (x - 1)) * 4 + 3] < 16) touchesTransparency = true
        else if (data[(y * width + (x + 1)) * 4 + 3] < 16) touchesTransparency = true
        else if (data[((y - 1) * width + x) * 4 + 3] < 16) touchesTransparency = true
        else if (data[((y + 1) * width + x) * 4 + 3] < 16) touchesTransparency = true
      }

      if (touchesTransparency) addSeed(x, y)
    }
  }

  return seeds
}

function floodRemoveFromEdges(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  key: Rgb,
  threshold: number,
): void {
  const visited = new Uint8Array(width * height)
  const queue = collectFloodSeeds(data, width, height, key, threshold)

  for (const seed of queue) {
    visited[seed] = 1
  }

  const tryEnqueue = (x: number, y: number) => {
    const idx = y * width + x
    if (visited[idx]) return
    if (!pixelMatchesBackground(data, idx, key, threshold)) return
    visited[idx] = 1
    queue.push(idx)
  }

  for (let head = 0; head < queue.length; head += 1) {
    const idx = queue[head]
    makePixelTransparent(data, idx)

    const x = idx % width
    const y = Math.floor(idx / width)
    if (x > 0) tryEnqueue(x - 1, y)
    if (x < width - 1) tryEnqueue(x + 1, y)
    if (y > 0) tryEnqueue(x, y - 1)
    if (y < height - 1) tryEnqueue(x, y + 1)
  }
}

function removeAllMatchingPixels(
  data: Uint8ClampedArray,
  key: Rgb,
  threshold: number,
): void {
  for (let pixelIndex = 0; pixelIndex < data.length / 4; pixelIndex += 1) {
    if (!pixelMatchesBackground(data, pixelIndex, key, threshold)) continue
    makePixelTransparent(data, pixelIndex)
  }
}

export function applyBackgroundRemovalToImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  options: {
    keyColor: Rgb | null
    tolerance: number
    fromEdgesOnly: boolean
  },
): Rgb {
  const { width: w, height: h } = pixelDimensions(width, height)
  const key = isValidRgb(options.keyColor)
    ? normalizeRgb(options.keyColor)
    : detectEdgeBackgroundColor(data, w, h)
  const threshold = toleranceToThreshold(options.tolerance)

  if (options.fromEdgesOnly) {
    floodRemoveFromEdges(data, w, h, key, threshold)
  } else {
    removeAllMatchingPixels(data, key, threshold)
  }

  return key
}

export function applyBackgroundRemoval(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: {
    keyColor: Rgb | null
    tolerance: number
    fromEdgesOnly: boolean
  },
): Rgb {
  const { width: w, height: h } = pixelDimensions(width, height)
  const imageData = ctx.getImageData(0, 0, w, h)
  const key = applyBackgroundRemovalToImageData(imageData.data, w, h, options)
  ctx.putImageData(imageData, 0, 0)
  return key
}

/** Sample a pixel from an img/canvas element using object-contain layout coordinates. */
export function sampleImageColorAtClientPoint(
  img: HTMLImageElement | HTMLCanvasElement,
  clientX: number,
  clientY: number,
): Rgb | null {
  const naturalWidth = img instanceof HTMLImageElement ? img.naturalWidth : img.width
  const naturalHeight = img instanceof HTMLImageElement ? img.naturalHeight : img.height
  if (naturalWidth <= 0 || naturalHeight <= 0) return null

  const rect = img.getBoundingClientRect()
  const scale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight)
  const drawnW = naturalWidth * scale
  const drawnH = naturalHeight * scale
  const offsetX = rect.left + (rect.width - drawnW) / 2
  const offsetY = rect.top + (rect.height - drawnH) / 2

  const x = Math.floor((clientX - offsetX) / scale)
  const y = Math.floor((clientY - offsetY) / scale)
  if (x < 0 || y < 0 || x >= naturalWidth || y >= naturalHeight) return null

  if (img instanceof HTMLCanvasElement) {
    const ctx = img.getContext('2d')
    if (!ctx) return null
    const pixel = ctx.getImageData(x, y, 1, 1).data
    return { r: pixel[0], g: pixel[1], b: pixel[2] }
  }

  const canvas = document.createElement('canvas')
  canvas.width = naturalWidth
  canvas.height = naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.drawImage(img, 0, 0)
  const pixel = ctx.getImageData(x, y, 1, 1).data
  return { r: pixel[0], g: pixel[1], b: pixel[2] }
}
