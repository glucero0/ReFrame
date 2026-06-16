import { useEffect, useRef, useState } from 'react'
import type { Canvas } from 'fabric'
import { useStage1Store } from '../../store/stage1Store'
import { useStage2Store } from '../../store/stage2Store'
import {
  createLayoutCanvas,
  loadLayoutOntoCanvas,
} from '../../lib/stage2LayoutCanvas'

export function usePublishCanvas(): {
  canvasElRef: React.RefObject<HTMLCanvasElement | null>
  fabricRef: React.RefObject<Canvas | null>
  canvasReady: boolean
  loadError: string | null
} {
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const [canvasReady, setCanvasReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const processedCuts = useStage1Store((s) => s.processedCuts)
  const stage2CanvasJson = useStage2Store((s) => s.stage2CanvasJson)

  useEffect(() => {
    if (!canvasElRef.current) return

    let disposed = false
    const canvas = createLayoutCanvas(canvasElRef.current)
    fabricRef.current = canvas

    const init = async () => {
      setLoadError(null)
      const json = useStage2Store.getState().stage2CanvasJson
      const cuts = useStage1Store.getState().processedCuts
      const loaded = await loadLayoutOntoCanvas(canvas, json, cuts)
      if (disposed) return
      if (!loaded) {
        setLoadError(
          'No layout to publish. Go back to Layout and add cutouts, text, or shapes.',
        )
        setCanvasReady(false)
        return
      }
      setCanvasReady(true)
    }

    void init()

    return () => {
      disposed = true
      setCanvasReady(false)
      canvas.dispose()
      fabricRef.current = null
    }
  }, [stage2CanvasJson, processedCuts])

  return { canvasElRef, fabricRef, canvasReady, loadError }
}
