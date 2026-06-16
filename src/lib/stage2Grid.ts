import type { CSSProperties } from 'react'
import type { Canvas, FabricImage } from 'fabric'
import {
  cutoutLayoutPosition,
  cutoutLayoutSlotSize,
} from './stage2Cutouts'
import { STAGE2_CANVAS_WIDTH } from './stage2Types'

export const DEFAULT_GRID_SIZE = 40

export function snapToGrid(value: number, gridSize: number): number {
  if (gridSize <= 0) return value
  return Math.round(value / gridSize) * gridSize
}

export function gridColumns(canvasWidth: number, gridSize: number): number {
  return Math.max(1, Math.floor(canvasWidth / gridSize))
}

export function gridCellPosition(index: number, gridSize: number, canvasWidth: number): {
  x: number
  y: number
} {
  const cols = gridColumns(canvasWidth, gridSize)
  const col = index % cols
  const row = Math.floor(index / cols)
  return { x: col * gridSize, y: row * gridSize }
}

export function getImageNaturalSize(img: FabricImage): { width: number; height: number } {
  const element = img.getElement() as HTMLImageElement | undefined
  const width = img.width ?? element?.naturalWidth ?? element?.width ?? 1
  const height = img.height ?? element?.naturalHeight ?? element?.height ?? 1
  return { width: Math.max(width, 1), height: Math.max(height, 1) }
}

export function autofitScale(
  naturalWidth: number,
  naturalHeight: number,
  cellSize: number,
): number {
  const w = Math.max(naturalWidth, 1)
  const h = Math.max(naturalHeight, 1)
  const padding = 4
  const fit = Math.min(cellSize - padding, cellSize - padding)
  return Math.min(fit / w, fit / h, 1)
}

export function applyCutoutToGrid(
  img: FabricImage,
  x: number,
  y: number,
  gridSize: number,
  snap: boolean,
  autofit: boolean,
): void {
  const left = snap || autofit ? snapToGrid(x, gridSize) : x
  const top = snap || autofit ? snapToGrid(y, gridSize) : y

  const updates: Partial<FabricImage> = { left, top }

  if (autofit) {
    const { width, height } = getImageNaturalSize(img)
    const scale = autofitScale(width, height, gridSize)
    updates.scaleX = scale
    updates.scaleY = scale
  }

  img.set(updates)
  img.setCoords()
}

export function snapObjectPosition(obj: FabricImage, gridSize: number): void {
  obj.set({
    left: snapToGrid(obj.left ?? 0, gridSize),
    top: snapToGrid(obj.top ?? 0, gridSize),
  })
  obj.setCoords()
}

export function snapFabricObjectPosition(
  obj: {
    left?: number
    top?: number
    setCoords?: () => void
    set: (props: { left: number; top: number }) => void
  },
  gridSize: number,
): void {
  obj.set({
    left: snapToGrid(obj.left ?? 0, gridSize),
    top: snapToGrid(obj.top ?? 0, gridSize),
  })
  obj.setCoords?.()
}

export async function rearrangeCutoutsOnGrid(
  canvas: Canvas,
  gridSize: number,
  autofit: boolean,
): Promise<void> {
  const cutouts = canvas
    .getObjects()
    .filter((obj) => (obj.get('data') as { kind?: string })?.kind === 'cutout') as FabricImage[]

  cutouts.forEach((img, index) => {
    const { x, y } = autofit
      ? gridCellPosition(index, gridSize, STAGE2_CANVAS_WIDTH)
      : cutoutLayoutPosition(index)
    applyCutoutToGrid(img, x, y, autofit ? gridSize : cutoutLayoutSlotSize(), true, autofit)
  })

  canvas.requestRenderAll()
}

export function resolveShapeFill(fillColor: string, transparent: boolean): string {
  return transparent ? 'transparent' : fillColor
}

export function isTransparentFill(fill: unknown): boolean {
  return fill === 'transparent' || fill === 'rgba(0,0,0,0)' || fill === ''
}

export function gridBackgroundStyle(
  showGrid: boolean,
  gridSize: number,
): CSSProperties {
  if (!showGrid) {
    return { backgroundColor: '#ffffff' }
  }
  return {
    backgroundColor: '#ffffff',
    backgroundImage: [
      'linear-gradient(to right, rgba(148, 163, 184, 0.45) 1px, transparent 1px)',
      'linear-gradient(to bottom, rgba(148, 163, 184, 0.45) 1px, transparent 1px)',
    ].join(', '),
    backgroundSize: `${gridSize}px ${gridSize}px`,
  }
}
