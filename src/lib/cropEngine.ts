import { applyFiltersToContext, canvasToBlob } from './filters'
import { rotateCanvas } from './imageRotation'
import { normalizeFilterSettings } from './filterDefaults'
import type {
  EllipseRegion,
  ExportFormat,
  FilterSettings,
  ProcessedCut,
  RectRegion,
  Region,
} from './regionTypes'
import type { Rgb } from './backgroundRemoval'
import { DEFAULT_FILTERS } from './regionTypes'

function clampRectToImage(
  x: number,
  y: number,
  w: number,
  h: number,
  imgW: number,
  imgH: number,
): { x: number; y: number; w: number; h: number } {
  const sx = Math.max(0, x)
  const sy = Math.max(0, y)
  const ex = Math.min(imgW, x + w)
  const ey = Math.min(imgH, y + h)
  return { x: sx, y: sy, w: Math.max(1, ex - sx), h: Math.max(1, ey - sy) }
}

function integerCanvasSize(w: number, h: number): { w: number; h: number } {
  return {
    w: Math.max(1, Math.round(w)),
    h: Math.max(1, Math.round(h)),
  }
}

async function cropRectRegion(
  image: HTMLImageElement,
  region: RectRegion,
  padding: number,
  rawFilters: FilterSettings,
  format: ExportFormat,
): Promise<{ blob: Blob; detectedBackgroundColor: Rgb | null }> {
  const filters = normalizeFilterSettings(rawFilters)
  const imgW = image.naturalWidth
  const imgH = image.naturalHeight
  const padded = clampRectToImage(
    region.x - padding,
    region.y - padding,
    region.w + padding * 2,
    region.h + padding * 2,
    imgW,
    imgH,
  )
  const { w, h } = integerCanvasSize(padded.w, padded.h)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) throw new Error('Could not get canvas context')

  if (format === 'jpg' && !filters.bgRemove) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }

  ctx.drawImage(
    image,
    padded.x,
    padded.y,
    padded.w,
    padded.h,
    0,
    0,
    w,
    h,
  )

  const detectedBackgroundColor = applyFiltersToContext(ctx, w, h, filters)
  const outputFormat = filters.bgRemove ? 'png' : format
  const rotated = rotateCanvas(canvas, region.rotation, {
    jpgOpaque: outputFormat === 'jpg',
  })
  const blob = await canvasToBlob(rotated, outputFormat)
  return { blob, detectedBackgroundColor }
}

async function cropEllipseRegion(
  image: HTMLImageElement,
  region: EllipseRegion,
  padding: number,
  rawFilters: FilterSettings,
  format: ExportFormat,
): Promise<{ blob: Blob; detectedBackgroundColor: Rgb | null }> {
  const filters = normalizeFilterSettings(rawFilters)
  const imgW = image.naturalWidth
  const imgH = image.naturalHeight
  const rx = region.rx + padding
  const ry = region.ry + padding
  const cx = region.cx
  const cy = region.cy

  const left = Math.max(0, cx - rx)
  const top = Math.max(0, cy - ry)
  const right = Math.min(imgW, cx + rx)
  const bottom = Math.min(imgH, cy + ry)
  const boundsW = Math.max(1, right - left)
  const boundsH = Math.max(1, bottom - top)
  const { w, h } = integerCanvasSize(boundsW, boundsH)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { alpha: true })
  if (!ctx) throw new Error('Could not get canvas context')

  if (format === 'jpg' && !filters.bgRemove) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }

  ctx.save()
  ctx.beginPath()
  const localCx = cx - left
  const localCy = cy - top
  ctx.ellipse(localCx, localCy, rx, ry, 0, 0, Math.PI * 2)
  ctx.clip()

  ctx.drawImage(image, left, top, boundsW, boundsH, 0, 0, w, h)
  ctx.restore()

  const detectedBackgroundColor = applyFiltersToContext(ctx, w, h, filters)
  const outputFormat = filters.bgRemove ? 'png' : format === 'jpg' ? 'jpg' : 'png'
  const rotated = rotateCanvas(canvas, region.rotation, {
    jpgOpaque: outputFormat === 'jpg',
  })
  const blob = await canvasToBlob(rotated, outputFormat)
  return { blob, detectedBackgroundColor }
}

export async function cropRegion(
  image: HTMLImageElement,
  region: Region,
  padding: number,
  filters: FilterSettings,
  format: ExportFormat,
): Promise<{ blob: Blob; detectedBackgroundColor: Rgb | null }> {
  if (region.type === 'rect') {
    return cropRectRegion(image, region, padding, filters, format)
  }
  const ellipseFormat: ExportFormat =
    format === 'jpg' ? 'jpg' : 'png'
  return cropEllipseRegion(image, region, padding, filters, ellipseFormat)
}

export async function cropAllRegions(
  image: HTMLImageElement,
  regions: Region[],
  padding: number,
  regionFilters: Record<string, FilterSettings>,
  format: ExportFormat,
): Promise<ProcessedCut[]> {
  const cuts: ProcessedCut[] = []

  for (const region of regions) {
    const filters = normalizeFilterSettings(regionFilters[region.id] ?? DEFAULT_FILTERS)
    const effectiveFormat = filters.bgRemove
      ? 'png'
      : region.type === 'ellipse' && format === 'png'
        ? 'png'
        : format
    const [edited, original] = await Promise.all([
      cropRegion(image, region, padding, filters, effectiveFormat),
      cropRegion(image, region, padding, DEFAULT_FILTERS, effectiveFormat),
    ])
    cuts.push({
      regionId: region.id,
      label: region.label,
      blob: edited.blob,
      previewUrl: URL.createObjectURL(edited.blob),
      originalPreviewUrl: URL.createObjectURL(original.blob),
      detectedBackgroundColor: edited.detectedBackgroundColor,
      bakedRotation: region.rotation,
    })
  }

  return cuts
}

export function revokeProcessedCuts(cuts: ProcessedCut[]): void {
  for (const cut of cuts) {
    URL.revokeObjectURL(cut.previewUrl)
    URL.revokeObjectURL(cut.originalPreviewUrl)
  }
}

export function revokeProcessedCut(cut: ProcessedCut): void {
  URL.revokeObjectURL(cut.previewUrl)
  URL.revokeObjectURL(cut.originalPreviewUrl)
}

export async function cropSingleProcessedCut(
  image: HTMLImageElement,
  region: Region,
  padding: number,
  regionFilters: Record<string, FilterSettings>,
  format: ExportFormat,
): Promise<ProcessedCut> {
  const filters = normalizeFilterSettings(regionFilters[region.id] ?? DEFAULT_FILTERS)
  const effectiveFormat = filters.bgRemove
    ? 'png'
    : region.type === 'ellipse' && format === 'png'
      ? 'png'
      : format
  const [edited, original] = await Promise.all([
    cropRegion(image, region, padding, filters, effectiveFormat),
    cropRegion(image, region, padding, DEFAULT_FILTERS, effectiveFormat),
  ])
  return {
    regionId: region.id,
    label: region.label,
    blob: edited.blob,
    previewUrl: URL.createObjectURL(edited.blob),
    originalPreviewUrl: URL.createObjectURL(original.blob),
    detectedBackgroundColor: edited.detectedBackgroundColor,
    bakedRotation: region.rotation,
  }
}
