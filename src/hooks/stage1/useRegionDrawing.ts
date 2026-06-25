import { useEffect } from 'react'
import { Ellipse, Rect, type TPointerEvent } from 'fabric'
import { useStage1Store } from '../../store/stage1Store'
import { scaleRegionToSource } from '../../lib/regionGeometry'
import { getCanvasScale, MIN_REGION_SIZE } from '../../lib/stage1FabricRegions'
import {
  nextRegionLabel,
  regionFromEllipse,
  regionFromRect,
  type CutTool,
  type Region,
} from '../../lib/regionTypes'
import { MAX_CUT_REGIONS } from '../../lib/limits'
import type { SegmentationCanvasRefs } from './useSegmentationCanvas'

export function useRegionDrawing(
  refs: SegmentationCanvasRefs,
  canvasReady: boolean,
  activeTool: CutTool,
): void {
  const pushUndo = useStage1Store((s) => s.pushUndo)
  const setRegions = useStage1Store((s) => s.setRegions)
  const selectRegion = useStage1Store((s) => s.selectRegion)

  useEffect(() => {
    const canvas = refs.fabricRef.current
    if (!canvas || !canvasReady) return

    let drawState: {
      startX: number
      startY: number
      preview: Rect | Ellipse | null
    } | null = null

    const onMouseDown = (opt: { e: TPointerEvent }) => {
      if (activeTool === 'select') return
      const pointer = canvas.getPointer(opt.e)
      drawState = {
        startX: pointer.x,
        startY: pointer.y,
        preview: null,
      }
    }

    const onMouseMove = (opt: { e: TPointerEvent }) => {
      if (!drawState || activeTool === 'select') return
      const pointer = canvas.getPointer(opt.e)
      const shift = 'shiftKey' in opt.e ? opt.e.shiftKey : false

      if (drawState.preview) canvas.remove(drawState.preview)

      if (activeTool === 'rect') {
        let w = pointer.x - drawState.startX
        let h = pointer.y - drawState.startY
        if (shift) {
          const size = Math.max(Math.abs(w), Math.abs(h))
          w = w < 0 ? -size : size
          h = h < 0 ? -size : size
        }
        drawState.preview = new Rect({
          left: w < 0 ? drawState.startX + w : drawState.startX,
          top: h < 0 ? drawState.startY + h : drawState.startY,
          width: Math.abs(w),
          height: Math.abs(h),
          stroke: '#2563eb',
          strokeWidth: 2,
          fill: 'rgba(37, 99, 235, 0.12)',
          selectable: false,
          evented: false,
        })
      } else {
        let rx = Math.abs(pointer.x - drawState.startX) / 2
        let ry = Math.abs(pointer.y - drawState.startY) / 2
        const cx = (pointer.x + drawState.startX) / 2
        const cy = (pointer.y + drawState.startY) / 2
        if (shift) {
          const r = Math.max(rx, ry)
          rx = r
          ry = r
        }
        drawState.preview = new Ellipse({
          left: cx,
          top: cy,
          rx,
          ry,
          originX: 'center',
          originY: 'center',
          stroke: '#2563eb',
          strokeWidth: 2,
          fill: 'rgba(37, 99, 235, 0.12)',
          selectable: false,
          evented: false,
        })
      }

      canvas.add(drawState.preview)
      canvas.requestRenderAll()
    }

    const onMouseUp = () => {
      if (!drawState || activeTool === 'select') return

      const preview = drawState.preview
      drawState = null
      if (preview) canvas.remove(preview)

      if (!preview) return

      const scale = getCanvasScale(canvas)
      const label = nextRegionLabel(useStage1Store.getState().regions)
      let displayRegion: Region | null = null

      if (preview instanceof Rect) {
        const w = preview.width ?? 0
        const h = preview.height ?? 0
        if (w >= MIN_REGION_SIZE && h >= MIN_REGION_SIZE) {
          displayRegion = regionFromRect(
            preview.left ?? 0,
            preview.top ?? 0,
            w,
            h,
            label,
          )
        }
      } else if (preview instanceof Ellipse) {
        const rx = preview.rx ?? 0
        const ry = preview.ry ?? 0
        if (rx >= MIN_REGION_SIZE / 2 && ry >= MIN_REGION_SIZE / 2) {
          displayRegion = regionFromEllipse(
            preview.left ?? 0,
            preview.top ?? 0,
            rx,
            ry,
            label,
          )
        }
      }

      if (displayRegion) {
        const currentRegions = useStage1Store.getState().regions
        if (currentRegions.length >= MAX_CUT_REGIONS) {
          alert(`Maximum of ${MAX_CUT_REGIONS} cut regions reached.`)
          canvas.requestRenderAll()
          return
        }

        pushUndo()
        const sourceRegion = scaleRegionToSource(displayRegion, scale)
        setRegions([...currentRegions, sourceRegion])
        selectRegion(sourceRegion.id)
      }

      canvas.requestRenderAll()
    }

    canvas.on('mouse:down', onMouseDown)
    canvas.on('mouse:move', onMouseMove)
    canvas.on('mouse:up', onMouseUp)

    return () => {
      canvas.off('mouse:down', onMouseDown)
      canvas.off('mouse:move', onMouseMove)
      canvas.off('mouse:up', onMouseUp)
    }
  }, [activeTool, canvasReady, pushUndo, refs.fabricRef, selectRegion, setRegions])
}
