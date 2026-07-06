export type RectRegion = {
  id: string
  type: 'rect'
  x: number
  y: number
  w: number
  h: number
  label: number
  rotation: number
}

export type EllipseRegion = {
  id: string
  type: 'ellipse'
  cx: number
  cy: number
  rx: number
  ry: number
  label: number
  rotation: number
}

export type Region = RectRegion | EllipseRegion

export type CutTool = 'select' | 'rect' | 'ellipse'

export type ExportFormat = 'png' | 'jpg'

import { DEFAULT_FILTERS } from './filterDefaults'
import type { Rgb } from './backgroundRemoval'

export type FilterSettings = import('./filterDefaults').FilterSettings

export type ProcessedCut = {
  regionId: string
  label: number
  blob: Blob
  previewUrl: string
  originalPreviewUrl: string
  detectedBackgroundColor: Rgb | null
  /** Rotation baked into blob/previewUrl at generation time. */
  bakedRotation: number
}

export { DEFAULT_FILTERS, hasActiveFilters, normalizeFilterSettings } from './filterDefaults'

export function createRegionId(): string {
  return crypto.randomUUID()
}

export function nextRegionLabel(regions: Region[]): number {
  if (regions.length === 0) return 1
  return Math.max(...regions.map((r) => r.label)) + 1
}

export function regionFromRect(
  x: number,
  y: number,
  w: number,
  h: number,
  label: number,
): RectRegion {
  return {
    id: createRegionId(),
    type: 'rect',
    x: Math.min(x, x + w),
    y: Math.min(y, y + h),
    w: Math.abs(w),
    h: Math.abs(h),
    label,
    rotation: 0,
  }
}

export function regionFromEllipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  label: number,
): EllipseRegion {
  return {
    id: createRegionId(),
    type: 'ellipse',
    cx,
    cy,
    rx: Math.abs(rx),
    ry: Math.abs(ry),
    label,
    rotation: 0,
  }
}

export function cloneRegions(regions: Region[]): Region[] {
  return regions.map((r) => ({ ...r }))
}

/** Geometry-only snapshot for live-preview invalidation (rotation is handled separately). */
export function regionGeometrySnapshot(region: Region): Record<string, string | number> {
  if (region.type === 'rect') {
    return {
      id: region.id,
      type: region.type,
      x: region.x,
      y: region.y,
      w: region.w,
      h: region.h,
      label: region.label,
    }
  }
  return {
    id: region.id,
    type: region.type,
    cx: region.cx,
    cy: region.cy,
    rx: region.rx,
    ry: region.ry,
    label: region.label,
  }
}

export function regionsGeometryKey(regions: Region[]): string {
  return regions.map((r) => JSON.stringify(regionGeometrySnapshot(r))).join('|')
}

export function cloneFilterSettings(settings: FilterSettings): FilterSettings {
  return {
    ...settings,
    bgRemoveColor: settings.bgRemoveColor ? { ...settings.bgRemoveColor } : null,
  }
}

export function ensureRegionFilters(
  regions: Region[],
  existing: Record<string, FilterSettings>,
): Record<string, FilterSettings> {
  const next: Record<string, FilterSettings> = {}
  for (const region of regions) {
    next[region.id] = existing[region.id]
      ? cloneFilterSettings(existing[region.id])
      : cloneFilterSettings(DEFAULT_FILTERS)
  }
  return next
}
