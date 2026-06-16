import { applyFiltersToContext, canvasToBlob } from './filters'
import type {
  EllipseRegion,
  ExportFormat,
  FilterSettings,
  ProcessedCut,
  RectRegion,
  Region,
} from './regionTypes'
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

async function cropRectRegion(
  image: HTMLImageElement,
  region: RectRegion,
  padding: number,
  filters: FilterSettings,
  format: ExportFormat,
): Promise<Blob> {
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

  const canvas = document.createElement('canvas')
  canvas.width = padded.w
  canvas.height = padded.h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  if (format === 'jpg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, padded.w, padded.h)
  }

  ctx.drawImage(
    image,
    padded.x,
    padded.y,
    padded.w,
    padded.h,
    0,
    0,
    padded.w,
    padded.h,
  )

  applyFiltersToContext(ctx, padded.w, padded.h, filters)
  return canvasToBlob(canvas, format)
}

async function cropEllipseRegion(
  image: HTMLImageElement,
  region: EllipseRegion,
  padding: number,
  filters: FilterSettings,
  format: ExportFormat,
): Promise<Blob> {
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
  const w = Math.max(1, right - left)
  const h = Math.max(1, bottom - top)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  if (format === 'jpg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }

  ctx.save()
  ctx.beginPath()
  const localCx = cx - left
  const localCy = cy - top
  ctx.ellipse(localCx, localCy, rx, ry, 0, 0, Math.PI * 2)
  ctx.clip()

  ctx.drawImage(image, left, top, w, h, 0, 0, w, h)
  ctx.restore()

  applyFiltersToContext(ctx, w, h, filters)
  return canvasToBlob(canvas, format === 'jpg' ? 'jpg' : 'png')
}

export async function cropRegion(
  image: HTMLImageElement,
  region: Region,
  padding: number,
  filters: FilterSettings,
  format: ExportFormat,
): Promise<Blob> {
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
    const filters = regionFilters[region.id] ?? DEFAULT_FILTERS
    const effectiveFormat =
      region.type === 'ellipse' && format === 'png' ? 'png' : format
    const [blob, originalBlob] = await Promise.all([
      cropRegion(image, region, padding, filters, effectiveFormat),
      cropRegion(image, region, padding, DEFAULT_FILTERS, effectiveFormat),
    ])
    cuts.push({
      regionId: region.id,
      label: region.label,
      blob,
      previewUrl: URL.createObjectURL(blob),
      originalPreviewUrl: URL.createObjectURL(originalBlob),
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
