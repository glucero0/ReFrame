import {
  Ellipse,
  FabricImage,
  FabricText,
  Rect,
  type Canvas,
  type FabricObject,
} from 'fabric'
import {
  regionFromEllipse,
  regionFromRect,
  type Region,
} from './regionTypes'

export const MIN_REGION_SIZE = 8

export function getCanvasScale(canvas: Canvas): number {
  const bg = canvas.backgroundImage as FabricImage | undefined
  return bg?.scaleX ?? 1
}

export function regionToFabricObject(region: Region): FabricObject {
  const common = {
    stroke: '#2563eb',
    strokeWidth: 2,
    fill: 'rgba(37, 99, 235, 0.12)',
    cornerColor: '#2563eb',
    transparentCorners: false,
    data: { regionId: region.id },
  }

  if (region.type === 'rect') {
    return new Rect({
      ...common,
      left: region.x,
      top: region.y,
      width: region.w,
      height: region.h,
    })
  }

  return new Ellipse({
    ...common,
    left: region.cx,
    top: region.cy,
    rx: region.rx,
    ry: region.ry,
    originX: 'center',
    originY: 'center',
  })
}

export function labelTextForRegion(region: Region): FabricText {
  const x = region.type === 'rect' ? region.x + 4 : region.cx
  const y = region.type === 'rect' ? region.y + 4 : region.cy - region.ry + 4
  return new FabricText(String(region.label), {
    left: x,
    top: y,
    fontSize: 14,
    fill: '#1d4ed8',
    fontWeight: 'bold',
    selectable: false,
    evented: false,
    data: { regionId: region.id, isLabel: true },
  })
}

export function findCoreRegionObject(
  canvas: Canvas,
  regionId: string,
): FabricObject | undefined {
  return canvas.getObjects().find((obj) => {
    const data = obj.get('data') as { regionId?: string; isLabel?: boolean }
    return data?.regionId === regionId && !data.isLabel
  })
}

export function fabricObjectToRegion(
  obj: FabricObject,
  label: number,
  id: string,
): Region | null {
  if (obj instanceof Rect) {
    const left = obj.left ?? 0
    const top = obj.top ?? 0
    const w = (obj.width ?? 0) * (obj.scaleX ?? 1)
    const h = (obj.height ?? 0) * (obj.scaleY ?? 1)
    const region = regionFromRect(left, top, w, h, label)
    return { ...region, id }
  }

  if (obj instanceof Ellipse) {
    const cx = obj.left ?? 0
    const cy = obj.top ?? 0
    const rx = (obj.rx ?? 0) * (obj.scaleX ?? 1)
    const ry = (obj.ry ?? 0) * (obj.scaleY ?? 1)
    const region = regionFromEllipse(cx, cy, rx, ry, label)
    return { ...region, id }
  }

  return null
}
