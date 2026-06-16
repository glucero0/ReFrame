import type { Region } from './regionTypes'

export function scaleRegionToSource(region: Region, scale: number): Region {
  if (scale === 1) return region
  const factor = 1 / scale

  if (region.type === 'rect') {
    return {
      ...region,
      x: region.x * factor,
      y: region.y * factor,
      w: region.w * factor,
      h: region.h * factor,
    }
  }

  return {
    ...region,
    cx: region.cx * factor,
    cy: region.cy * factor,
    rx: region.rx * factor,
    ry: region.ry * factor,
  }
}

export function scaleRegionToDisplay(region: Region, scale: number): Region {
  if (scale === 1) return region
  if (region.type === 'rect') {
    return {
      ...region,
      x: region.x * scale,
      y: region.y * scale,
      w: region.w * scale,
      h: region.h * scale,
    }
  }
  return {
    ...region,
    cx: region.cx * scale,
    cy: region.cy * scale,
    rx: region.rx * scale,
    ry: region.ry * scale,
  }
}

/** Source-space region expanded by padding, then scaled to canvas display coordinates. */
export function paddedRegionToDisplay(
  region: Region,
  scale: number,
  padding: number,
): Region {
  if (padding <= 0) return scaleRegionToDisplay(region, scale)

  if (region.type === 'rect') {
    return {
      ...region,
      type: 'rect',
      x: (region.x - padding) * scale,
      y: (region.y - padding) * scale,
      w: (region.w + padding * 2) * scale,
      h: (region.h + padding * 2) * scale,
    }
  }

  return {
    ...region,
    type: 'ellipse',
    cx: region.cx * scale,
    cy: region.cy * scale,
    rx: (region.rx + padding) * scale,
    ry: (region.ry + padding) * scale,
  }
}
