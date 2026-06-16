import type { ProcessedCut } from './regionTypes'
import { STAGE2_CANVAS_HEIGHT, STAGE2_CANVAS_WIDTH } from './stage2Types'

export const MAX_CUTOUT_DISPLAY = 180
export const CUTOUT_LAYOUT_GAP = 20

export function cutoutDisplayScale(width: number, height: number): number {
  return Math.min(1, MAX_CUTOUT_DISPLAY / Math.max(width, height, 1))
}

export function cutoutLayoutSlotSize(gap = CUTOUT_LAYOUT_GAP): number {
  return MAX_CUTOUT_DISPLAY + gap
}

export function cutoutLayoutPosition(
  index: number,
  canvasWidth = STAGE2_CANVAS_WIDTH,
  _canvasHeight = STAGE2_CANVAS_HEIGHT,
  gap = CUTOUT_LAYOUT_GAP,
): { x: number; y: number } {
  const slot = cutoutLayoutSlotSize(gap)
  const cols = Math.max(1, Math.floor((canvasWidth - gap) / slot))
  const col = index % cols
  const row = Math.floor(index / cols)
  return {
    x: gap + col * slot,
    y: gap + row * slot,
  }
}

export function findCutByRegionId(
  cuts: ProcessedCut[],
  regionId: string,
): ProcessedCut | undefined {
  return cuts.find((c) => c.regionId === regionId)
}

export function nextCutoutPlacement(
  index: number,
  spacing = CUTOUT_LAYOUT_GAP,
): { x: number; y: number } {
  return cutoutLayoutPosition(index, STAGE2_CANVAS_WIDTH, STAGE2_CANVAS_HEIGHT, spacing)
}
