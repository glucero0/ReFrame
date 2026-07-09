import type { Rgb } from './backgroundRemoval'
import { applyFiltersToContext, canvasToBlob } from './filters'
import { loadImageFromUrl } from './imageLoader'
import { rotateCanvas } from './imageRotation'
import type { FilterSettings } from './regionTypes'
import { DEFAULT_FILTERS, normalizeFilterSettings } from './regionTypes'

export type StandaloneCutoutRender = {
  blob: Blob
  previewUrl: string
  originalPreviewUrl: string
  detectedBackgroundColor: Rgb | null
}

function revokeRenderUrls(previous?: Pick<StandaloneCutoutRender, 'previewUrl' | 'originalPreviewUrl'>): void {
  if (!previous) return
  URL.revokeObjectURL(previous.previewUrl)
  URL.revokeObjectURL(previous.originalPreviewUrl)
}

export async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob)
  try {
    const image = await loadImageFromUrl(url)
    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) throw new Error('Could not get canvas context')
    ctx.drawImage(image, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function renderStandaloneCutout(
  baseBlob: Blob,
  filters: FilterSettings,
  rotation: number,
  previous?: Pick<StandaloneCutoutRender, 'previewUrl' | 'originalPreviewUrl'>,
): Promise<StandaloneCutoutRender> {
  const normalizedFilters = normalizeFilterSettings(filters)
  const sourceCanvas = await blobToCanvas(baseBlob)

  const originalCanvas = document.createElement('canvas')
  originalCanvas.width = sourceCanvas.width
  originalCanvas.height = sourceCanvas.height
  const originalCtx = originalCanvas.getContext('2d', { alpha: true })
  if (!originalCtx) throw new Error('Could not get canvas context')
  originalCtx.drawImage(sourceCanvas, 0, 0)
  applyFiltersToContext(originalCtx, originalCanvas.width, originalCanvas.height, DEFAULT_FILTERS)
  const originalRotated = rotateCanvas(originalCanvas, rotation, { jpgOpaque: false })
  const originalBlob = await canvasToBlob(originalRotated, 'png')

  const editedCanvas = document.createElement('canvas')
  editedCanvas.width = sourceCanvas.width
  editedCanvas.height = sourceCanvas.height
  const editedCtx = editedCanvas.getContext('2d', { alpha: true })
  if (!editedCtx) throw new Error('Could not get canvas context')
  editedCtx.drawImage(sourceCanvas, 0, 0)
  const detectedBackgroundColor = applyFiltersToContext(
    editedCtx,
    editedCanvas.width,
    editedCanvas.height,
    normalizedFilters,
  )
  const editedRotated = rotateCanvas(editedCanvas, rotation, { jpgOpaque: false })
  const blob = await canvasToBlob(editedRotated, 'png')

  revokeRenderUrls(previous)

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    originalPreviewUrl: URL.createObjectURL(originalBlob),
    detectedBackgroundColor,
  }
}
