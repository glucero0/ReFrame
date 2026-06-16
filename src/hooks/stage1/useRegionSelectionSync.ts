import { useEffect } from 'react'
import type { FabricObject } from 'fabric'
import { useStage1Store } from '../../store/stage1Store'
import { findCoreRegionObject } from '../../lib/stage1FabricRegions'
import type { SegmentationCanvasRefs } from './useSegmentationCanvas'

export function useRegionSelectionSync(
  refs: SegmentationCanvasRefs,
  canvasReady: boolean,
): void {
  const selectedRegionId = useStage1Store((s) => s.selectedRegionId)
  const selectRegion = useStage1Store((s) => s.selectRegion)
  const regions = useStage1Store((s) => s.regions)

  useEffect(() => {
    const canvas = refs.fabricRef.current
    if (!canvas || !canvasReady) return

    const syncSelectionFromCanvas = (e: { selected?: FabricObject[] }) => {
      if (refs.syncingRef.current) return
      const obj = e.selected?.[0]
      const data = obj?.get('data') as { regionId?: string; isLabel?: boolean } | undefined
      if (data?.regionId && !data.isLabel) {
        selectRegion(data.regionId)
      }
    }

    const onSelectionCleared = () => {
      if (refs.syncingRef.current) return
      selectRegion(null)
    }

    canvas.on('selection:created', syncSelectionFromCanvas)
    canvas.on('selection:updated', syncSelectionFromCanvas)
    canvas.on('selection:cleared', onSelectionCleared)

    return () => {
      canvas.off('selection:created', syncSelectionFromCanvas)
      canvas.off('selection:updated', syncSelectionFromCanvas)
      canvas.off('selection:cleared', onSelectionCleared)
    }
  }, [canvasReady, refs.fabricRef, refs.syncingRef, selectRegion])

  useEffect(() => {
    const canvas = refs.fabricRef.current
    if (!canvas || !canvasReady || refs.syncingRef.current) return

    if (!selectedRegionId) {
      if (canvas.getActiveObject()) {
        canvas.discardActiveObject()
        canvas.requestRenderAll()
      }
      return
    }

    const shape = findCoreRegionObject(canvas, selectedRegionId)
    if (shape && canvas.getActiveObject() !== shape) {
      refs.syncingRef.current = true
      canvas.setActiveObject(shape)
      canvas.requestRenderAll()
      refs.syncingRef.current = false
    }
  }, [canvasReady, refs.fabricRef, refs.syncingRef, regions, selectedRegionId])
}
