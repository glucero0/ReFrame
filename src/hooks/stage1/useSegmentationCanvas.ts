import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { Canvas, FabricImage, type FabricObject } from 'fabric'
import { useStage1Store } from '../../store/stage1Store'
import { scaleRegionToDisplay, scaleRegionToSource } from '../../lib/regionGeometry'
import {
  fabricObjectToRegion,
  findCoreRegionObject,
  getCanvasScale,
  labelTextForRegion,
  regionToFabricObject,
} from '../../lib/stage1FabricRegions'
import { drawExportBoundsOverlay } from '../../lib/stage1ExportOverlay'
import { isRotationSliderDragging } from '../../lib/previewInteractionGate'
import type { Region } from '../../lib/regionTypes'
import { imageToObjectUrl } from '../../lib/imageLoader'

export type SegmentationCanvasRefs = {
  fabricRef: RefObject<Canvas | null>
  syncingRef: RefObject<boolean>
  fitScaleRef: RefObject<number>
}

export function useSegmentationCanvas(
  containerRef: RefObject<HTMLDivElement | null>,
  canvasElRef: RefObject<HTMLCanvasElement | null>,
): { canvasReady: boolean; refs: SegmentationCanvasRefs } {
  const fabricRef = useRef<Canvas | null>(null)
  const syncingRef = useRef(false)
  const fitScaleRef = useRef(1)
  const [canvasReady, setCanvasReady] = useState(false)

  const sourceImage = useStage1Store((s) => s.sourceImage)
  const regions = useStage1Store((s) => s.regions)
  const padding = useStage1Store((s) => s.padding)
  const activeTool = useStage1Store((s) => s.activeTool)
  const zoom = useStage1Store((s) => s.zoom)
  const setRegions = useStage1Store((s) => s.setRegions)
  const pushUndo = useStage1Store((s) => s.pushUndo)

  const syncRegionsToCanvas = useCallback(
    (canvas: Canvas, regionList: Region[]) => {
      syncingRef.current = true
      const activeRegionId = useStage1Store.getState().selectedRegionId

      const scale = getCanvasScale(canvas)
      const toRemove = canvas
        .getObjects()
        .filter((o) => (o.get('data') as { regionId?: string })?.regionId)
      toRemove.forEach((o) => canvas.remove(o))

      for (const region of regionList) {
        const displayRegion = scaleRegionToDisplay(region, scale)
        const shape = regionToFabricObject(displayRegion)
        shape.set({
          selectable: activeTool === 'select',
          evented: activeTool === 'select',
          hasControls: activeTool === 'select',
        })
        canvas.add(shape)
        canvas.add(labelTextForRegion(displayRegion))
      }

      if (activeRegionId) {
        const shape = findCoreRegionObject(canvas, activeRegionId)
        if (shape) {
          canvas.setActiveObject(shape)
        }
      }

      canvas.requestRenderAll()
      syncingRef.current = false
    },
    [activeTool],
  )

  const applyCanvasZoom = useCallback(
    (canvas: Canvas, zoomLevel: number) => {
      const bg = canvas.backgroundImage as FabricImage | undefined
      if (!bg || !sourceImage) return

      const displayScale = fitScaleRef.current * zoomLevel
      const displayW = sourceImage.naturalWidth * displayScale
      const displayH = sourceImage.naturalHeight * displayScale

      canvas.setDimensions({ width: displayW, height: displayH })
      bg.set({ scaleX: displayScale, scaleY: displayScale })
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0])
    },
    [sourceImage],
  )

  useEffect(() => {
    if (!canvasElRef.current || !sourceImage) {
      setCanvasReady(false)
      return
    }

    let disposed = false
    const canvas = new Canvas(canvasElRef.current, {
      selection: activeTool === 'select',
      preserveObjectStacking: true,
    })
    fabricRef.current = canvas

    const setup = async () => {
      const dataUrl = imageToObjectUrl(sourceImage)
      const bg = await FabricImage.fromURL(dataUrl, { crossOrigin: 'anonymous' })
      if (disposed) return

      const maxW = containerRef.current?.clientWidth ?? 900
      const maxH = containerRef.current?.clientHeight ?? 520
      const scale = Math.min(
        1,
        maxW / sourceImage.naturalWidth,
        maxH / sourceImage.naturalHeight,
      )
      fitScaleRef.current = scale
      const zoomLevel = useStage1Store.getState().zoom
      const displayScale = scale * zoomLevel
      const displayW = sourceImage.naturalWidth * displayScale
      const displayH = sourceImage.naturalHeight * displayScale

      canvas.setDimensions({ width: displayW, height: displayH })
      bg.set({
        scaleX: displayScale,
        scaleY: displayScale,
        selectable: false,
        evented: false,
      })
      canvas.backgroundImage = bg
      canvas.requestRenderAll()
      setCanvasReady(true)
    }

    void setup()

    return () => {
      disposed = true
      setCanvasReady(false)
      canvas.dispose()
      fabricRef.current = null
    }
  }, [sourceImage])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !canvasReady) return
    syncRegionsToCanvas(canvas, regions)
  }, [regions, padding, syncRegionsToCanvas, canvasReady])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !canvasReady) return
    applyCanvasZoom(canvas, zoom)
    syncRegionsToCanvas(canvas, regions)
  }, [zoom, canvasReady, applyCanvasZoom, syncRegionsToCanvas, regions, padding])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    canvas.selection = activeTool === 'select'
    canvas.getObjects().forEach((obj) => {
      const data = obj.get('data') as { isLabel?: boolean; regionId?: string }
      if (data?.regionId && !data.isLabel) {
        obj.set({
          selectable: activeTool === 'select',
          evented: activeTool === 'select',
          hasControls: activeTool === 'select',
        })
      }
    })
    canvas.requestRenderAll()
  }, [activeTool])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !canvasReady) return

    const drawOverlay = () => {
      if (syncingRef.current || isRotationSliderDragging()) return
      const { regions: regionList, padding: regionPadding } = useStage1Store.getState()
      drawExportBoundsOverlay(canvas, regionList, regionPadding, getCanvasScale(canvas))
    }

    canvas.on('before:render', drawOverlay)
    return () => {
      canvas.off('before:render', drawOverlay)
    }
  }, [canvasReady])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const onModified = (e: { target?: FabricObject }) => {
      if (syncingRef.current || !e.target) return
      const data = e.target.get('data') as { regionId?: string; isLabel?: boolean }
      if (!data?.regionId || data.isLabel) return

      const scale = getCanvasScale(canvas)
      const currentRegions = useStage1Store.getState().regions
      const existing = currentRegions.find((r) => r.id === data.regionId)
      if (!existing) return

      const displayRegion = fabricObjectToRegion(
        e.target,
        existing.label,
        existing.id,
      )
      if (!displayRegion) return

      pushUndo()
      const sourceRegion = scaleRegionToSource(displayRegion, scale)
      const next = currentRegions.map((r) =>
        r.id === sourceRegion.id ? { ...sourceRegion, rotation: r.rotation } : r,
      )
      setRegions(next)
    }

    canvas.on('object:modified', onModified)
    return () => {
      canvas.off('object:modified', onModified)
    }
  }, [pushUndo, setRegions, canvasReady])

  return {
    canvasReady,
    refs: { fabricRef, syncingRef, fitScaleRef },
  }
}
