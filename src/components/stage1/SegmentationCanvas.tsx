import { useEffect, useRef } from 'react'
import { useStage1Store } from '../../store/stage1Store'
import { useSegmentationCanvas } from '../../hooks/stage1/useSegmentationCanvas'
import { useRegionDrawing } from '../../hooks/stage1/useRegionDrawing'
import { useRegionSelectionSync } from '../../hooks/stage1/useRegionSelectionSync'

export default function SegmentationCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)

  const sourceImage = useStage1Store((s) => s.sourceImage)
  const activeTool = useStage1Store((s) => s.activeTool)
  const zoom = useStage1Store((s) => s.zoom)
  const removeRegion = useStage1Store((s) => s.removeRegion)
  const setZoom = useStage1Store((s) => s.setZoom)

  const { canvasReady, refs } = useSegmentationCanvas(containerRef, canvasElRef)
  useRegionSelectionSync(refs, canvasReady)
  useRegionDrawing(refs, canvasReady, activeTool)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const canvas = refs.fabricRef.current
      if (!canvas || activeTool !== 'select') return
      const active = canvas.getActiveObject()
      if (!active) return
      const data = active.get('data') as { regionId?: string }
      if (!data?.regionId) return
      e.preventDefault()
      removeRegion(data.regionId)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeTool, refs.fabricRef, removeRegion])

  const handleWheel = (e: React.WheelEvent) => {
    if (!e.ctrlKey) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.1 : 0.1
    setZoom(useStage1Store.getState().zoom + delta)
  }

  if (!sourceImage) {
    return (
      <div className="flex h-full min-h-0 items-center justify-center rounded border border-dashed border-gray-300 bg-gray-50 text-sm text-gray-500">
        Upload or paste an image to begin cutting regions.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex shrink-0 items-center gap-2 text-sm text-gray-600">
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50"
          onClick={() => setZoom(zoom - 0.1)}
        >
          −
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-2 py-1 hover:bg-gray-50"
          onClick={() => setZoom(zoom + 0.1)}
        >
          +
        </button>
        <span className="text-xs text-gray-500">
          Ctrl+scroll to zoom; scrollbars pan when zoomed. Dashed outline shows export bounds.
        </span>
      </div>
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto rounded border border-gray-300 bg-gray-100"
        onWheel={handleWheel}
      >
        <canvas ref={canvasElRef} />
      </div>
    </div>
  )
}
