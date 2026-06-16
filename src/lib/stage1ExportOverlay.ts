import type { Canvas } from 'fabric'
import { paddedRegionToDisplay } from './regionGeometry'
import type { Region } from './regionTypes'

export function drawExportBoundsOverlay(
  canvas: Canvas,
  regionList: Region[],
  regionPadding: number,
  scale: number,
): void {
  if (regionPadding <= 0) return
  const ctx = canvas.getContext()
  if (!ctx) return

  ctx.save()
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.9)'
  ctx.lineWidth = 1
  ctx.setLineDash([6, 4])

  for (const region of regionList) {
    const exportRegion = paddedRegionToDisplay(region, scale, regionPadding)
    if (exportRegion.type === 'rect') {
      ctx.strokeRect(exportRegion.x, exportRegion.y, exportRegion.w, exportRegion.h)
    } else {
      ctx.beginPath()
      ctx.ellipse(
        exportRegion.cx,
        exportRegion.cy,
        exportRegion.rx,
        exportRegion.ry,
        0,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
    }
  }

  ctx.restore()
}
