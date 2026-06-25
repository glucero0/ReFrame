import {
  ALL_SIZE_PRESETS,
  LAYOUT_HEIGHT,
  LAYOUT_WIDTH,
  type PublishDpi,
  type SizePresetId,
} from './stage3Types'
import { clampExportDimensions } from './limits'

export type ExportDimensions = {
  pixelWidth: number
  pixelHeight: number
  pageWidthPt?: number
  pageHeightPt?: number
}

const PT_PER_INCH = 72

function finalizeExportDimensions(
  pixelWidth: number,
  pixelHeight: number,
  pageWidthPt?: number,
  pageHeightPt?: number,
): ExportDimensions {
  const clamped = clampExportDimensions(pixelWidth, pixelHeight)
  if (pageWidthPt != null && pageHeightPt != null) {
    return {
      ...clamped,
      pageWidthPt,
      pageHeightPt,
    }
  }
  return clamped
}

export function findSizePreset(id: SizePresetId) {
  return ALL_SIZE_PRESETS.find((preset) => preset.id === id)
}

export function computeExportDimensions(
  presetId: SizePresetId,
  customWidth: number,
  customHeight: number,
  dpi: PublishDpi,
  forPdf: boolean,
): ExportDimensions {
  const preset = findSizePreset(presetId)

  if (presetId === 'custom') {
    const pixelWidth = Math.max(1, Math.round(customWidth))
    const pixelHeight = Math.max(1, Math.round(customHeight))
    if (forPdf) {
      return finalizeExportDimensions(
        pixelWidth,
        pixelHeight,
        (pixelWidth / dpi) * PT_PER_INCH,
        (pixelHeight / dpi) * PT_PER_INCH,
      )
    }
    return finalizeExportDimensions(pixelWidth, pixelHeight)
  }

  if (!preset) {
    return finalizeExportDimensions(LAYOUT_WIDTH, LAYOUT_HEIGHT)
  }

  if (preset.kind === 'pixels' && preset.widthPx && preset.heightPx) {
    return finalizeExportDimensions(preset.widthPx, preset.heightPx)
  }

  if (preset.kind === 'print' && preset.widthIn && preset.heightIn) {
    const pixelWidth = Math.max(1, Math.round(preset.widthIn * dpi))
    const pixelHeight = Math.max(1, Math.round(preset.heightIn * dpi))
    return finalizeExportDimensions(
      pixelWidth,
      pixelHeight,
      preset.widthIn * PT_PER_INCH,
      preset.heightIn * PT_PER_INCH,
    )
  }

  return finalizeExportDimensions(LAYOUT_WIDTH, LAYOUT_HEIGHT)
}

/** Scale-to-fit letterbox placement for a layout rendered at native size. */
export function computeLetterboxPlacement(
  layoutWidth: number,
  layoutHeight: number,
  outputWidth: number,
  outputHeight: number,
): { drawWidth: number; drawHeight: number; offsetX: number; offsetY: number; scale: number } {
  const scale = Math.min(outputWidth / layoutWidth, outputHeight / layoutHeight)
  const drawWidth = layoutWidth * scale
  const drawHeight = layoutHeight * scale
  return {
    scale,
    drawWidth,
    drawHeight,
    offsetX: (outputWidth - drawWidth) / 2,
    offsetY: (outputHeight - drawHeight) / 2,
  }
}

type FabricJsonObject = { data?: { kind?: string } }

export function layoutJsonHasContent(json: string | null): boolean {
  if (!json) return false
  try {
    const parsed = JSON.parse(json) as { objects?: FabricJsonObject[] }
    const objects = parsed.objects ?? []
    return objects.some((obj) => {
      const kind = obj.data?.kind
      return kind === 'cutout' || kind === 'text' || kind === 'shape'
    })
  } catch {
    return false
  }
}

export function mimeTypeForImageFormat(format: 'png' | 'jpeg' | 'webp'): string {
  if (format === 'jpeg') return 'image/jpeg'
  if (format === 'webp') return 'image/webp'
  return 'image/png'
}

export function fileExtensionForImageFormat(format: 'png' | 'jpeg' | 'webp'): string {
  if (format === 'jpeg') return 'jpg'
  if (format === 'webp') return 'webp'
  return 'png'
}
