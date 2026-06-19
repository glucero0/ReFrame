import { useCallback, useEffect, useRef } from 'react'
import {
  Canvas,
  Ellipse,
  FabricImage,
  FabricObject,
  IText,
  Rect,
  type TPointerEvent,
} from 'fabric'
import { useStage1Store } from '../../store/stage1Store'
import { useStage2Store } from '../../store/stage2Store'
import {
  applyCutoutToGrid,
  gridBackgroundStyle,
  isTransparentFill,
  rearrangeCutoutsOnGrid,
  resolveShapeFill,
  snapFabricObjectPosition,
  snapObjectPosition,
} from '../../lib/stage2Grid'
import {
  cutoutDisplayScale,
  cutoutLayoutPosition,
  findCutByRegionId,
} from '../../lib/stage2Cutouts'
import {
  STAGE2_CANVAS_HEIGHT,
  STAGE2_CANVAS_WIDTH,
  STAGE2_FONTS,
  createStage2Id,
  type Stage2Font,
} from '../../lib/stage2Types'
import type { ProcessedCut } from '../../lib/regionTypes'

const MIN_SHAPE = 12
const CANVAS_PROPS = ['data'] as const

type ObjectKind = 'background' | 'grid' | 'cutout' | 'text' | 'shape'

function getObjectKind(obj: FabricObject): ObjectKind | null {
  return (obj.get('data') as { kind?: ObjectKind })?.kind ?? null
}

function isLockedKind(kind: ObjectKind | null): boolean {
  return kind === 'background'
}

function isStage2Font(value: string): value is Stage2Font {
  return (STAGE2_FONTS as readonly string[]).includes(value)
}

function isStage2TextObject(obj: FabricObject | undefined): obj is IText {
  if (!obj) return false
  if (getObjectKind(obj) === 'text' || obj instanceof IText) return true
  const type = (obj as { type?: string }).type?.toLowerCase()
  return type === 'i-text' || type === 'itext' || type === 'textbox'
}

function findCanvasCutout(
  canvas: Canvas,
  regionId: string,
): FabricImage | undefined {
  const match = canvas.getObjects().find((obj) => {
    if (getObjectKind(obj) !== 'cutout') return false
    return (obj.get('data') as { regionId?: string })?.regionId === regionId
  })
  return match instanceof FabricImage ? match : undefined
}

function countCanvasCutouts(canvas: Canvas): number {
  return canvas.getObjects().filter((obj) => getObjectKind(obj) === 'cutout').length
}

function normalizeLoadedObjects(canvas: Canvas): void {
  for (const obj of canvas.getObjects()) {
    if (isStage2TextObject(obj) && getObjectKind(obj) !== 'text') {
      obj.set({
        data: {
          ...(obj.get('data') as object),
          kind: 'text',
          id: (obj.get('data') as { id?: string })?.id ?? createStage2Id(),
        },
      })
    }
  }
}

function readTextStyle(text: IText): {
  font: Stage2Font | null
  size: number
  color: string
} {
  const scale = text.scaleX ?? 1
  const font = text.fontFamily ?? 'Arial'
  return {
    font: isStage2Font(font) ? font : null,
    size: Math.round((text.fontSize ?? 24) * scale),
    color: typeof text.fill === 'string' ? text.fill : '#111827',
  }
}

function applyTextStyle(
  text: IText,
  fontFamily: Stage2Font,
  fontSize: number,
  fill: string,
): void {
  text.set({
    fontFamily,
    fontSize,
    fill,
    scaleX: 1,
    scaleY: 1,
    styles: {},
  })
  if (typeof text.initDimensions === 'function') {
    text.initDimensions()
  }
  text.setCoords()
  text.dirty = true
}

function ensureCanvasInteractivity(canvas: Canvas, selectMode: boolean): void {
  canvas.getObjects().forEach((obj) => {
    if (isLockedKind(getObjectKind(obj))) {
      obj.set({ selectable: false, evented: false, hasControls: false })
      return
    }
    obj.set({
      selectable: selectMode,
      evented: selectMode,
      hasControls: selectMode,
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: false,
      lockScalingY: false,
    })
  })
}

async function rehydrateCutoutImages(canvas: Canvas): Promise<void> {
  const cuts = useStage1Store.getState().processedCuts
  for (const obj of canvas.getObjects()) {
    if (getObjectKind(obj) !== 'cutout' || !(obj instanceof FabricImage)) continue
    const regionId = (obj.get('data') as { regionId?: string })?.regionId
    if (!regionId) continue
    const cut = findCutByRegionId(cuts, regionId)
    if (!cut) continue
    try {
      await obj.setSrc(cut.previewUrl, { crossOrigin: undefined })
      obj.setCoords()
    } catch {
      // Keep existing src if refresh fails
    }
  }
}

async function addCutoutToCanvas(
  canvas: Canvas,
  cut: ProcessedCut,
  position: { x: number; y: number },
): Promise<FabricImage> {
  const img = await FabricImage.fromURL(cut.previewUrl)
  const naturalW = img.width ?? 1
  const naturalH = img.height ?? 1
  const scale = cutoutDisplayScale(naturalW, naturalH)

  img.set({
    left: position.x,
    top: position.y,
    scaleX: scale,
    scaleY: scale,
    data: { kind: 'cutout', regionId: cut.regionId, label: cut.label },
  })

  canvas.add(img)

  const { stage2SnapToGrid, stage2AutofitToGrid, stage2GridSize } =
    useStage2Store.getState()
  if (stage2SnapToGrid || stage2AutofitToGrid) {
    applyCutoutToGrid(
      img,
      position.x,
      position.y,
      stage2GridSize,
      stage2SnapToGrid,
      stage2AutofitToGrid,
    )
  }

  img.setCoords()
  return img
}

export default function ArrangeCanvas() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasElRef = useRef<HTMLCanvasElement>(null)
  const fabricRef = useRef<Canvas | null>(null)
  const initializedRef = useRef(false)
  const lastHandledAddTextTokenRef = useRef(0)
  const skipTextStyleApplyRef = useRef(false)
  const drawingRef = useRef<{
    startX: number
    startY: number
    preview: Rect | Ellipse | null
  } | null>(null)

  const stage2ActiveTool = useStage2Store((s) => s.stage2ActiveTool)
  const stage2GridSize = useStage2Store((s) => s.stage2GridSize)
  const stage2ShowGrid = useStage2Store((s) => s.stage2ShowGrid)
  const stage2RearrangeToken = useStage2Store((s) => s.stage2RearrangeToken)
  const stage2AddTextToken = useStage2Store((s) => s.stage2AddTextToken)
  const stage2AddCutoutToken = useStage2Store((s) => s.stage2AddCutoutToken)
  const stage2DeleteToken = useStage2Store((s) => s.stage2DeleteToken)
  const stage2TextFont = useStage2Store((s) => s.stage2TextFont)
  const stage2TextSize = useStage2Store((s) => s.stage2TextSize)
  const stage2TextColor = useStage2Store((s) => s.stage2TextColor)
  const stage2ShapeFill = useStage2Store((s) => s.stage2ShapeFill)
  const stage2ShapeStroke = useStage2Store((s) => s.stage2ShapeStroke)
  const stage2ShapeTransparentFill = useStage2Store((s) => s.stage2ShapeTransparentFill)
  const stage2Selection = useStage2Store((s) => s.stage2Selection)

  const saveStage2Canvas = useStage2Store((s) => s.saveStage2Canvas)
  const markStage2Initialized = useStage2Store((s) => s.markStage2Initialized)
  const setStage2Selection = useStage2Store((s) => s.setStage2Selection)
  const setStage2TextFont = useStage2Store((s) => s.setStage2TextFont)
  const setStage2TextSize = useStage2Store((s) => s.setStage2TextSize)
  const setStage2TextColor = useStage2Store((s) => s.setStage2TextColor)
  const setStage2ShapeFill = useStage2Store((s) => s.setStage2ShapeFill)
  const setStage2ShapeStroke = useStage2Store((s) => s.setStage2ShapeStroke)
  const setStage2ShapeTransparentFill = useStage2Store(
    (s) => s.setStage2ShapeTransparentFill,
  )
  const clearStage2PendingCutout = useStage2Store((s) => s.clearStage2PendingCutout)

  const getShapeFill = useCallback(() => {
    const state = useStage2Store.getState()
    return resolveShapeFill(state.stage2ShapeFill, state.stage2ShapeTransparentFill)
  }, [])

  const persistCanvas = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas || !initializedRef.current) return
    saveStage2Canvas(JSON.stringify(canvas.toObject([...CANVAS_PROPS])))
  }, [saveStage2Canvas])

  useEffect(() => {
    const setPersist = useStage2Store.getState().setPersistLayoutSnapshot
    setPersist(persistCanvas)
    return () => setPersist(null)
  }, [persistCanvas])

  const deleteActiveSelection = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return false

    useStage2Store.getState().setStage2ActiveTool('select')
    ensureCanvasInteractivity(canvas, true)
    canvas.selection = true

    const target = canvas.getActiveObject()
    if (!target || isLockedKind(getObjectKind(target))) return false

    if (isStage2TextObject(target) && target.isEditing) {
      target.exitEditing()
    }

    canvas.remove(target)
    canvas.discardActiveObject()
    setStage2Selection(null)
    persistCanvas()
    canvas.requestRenderAll()
    return true
  }, [persistCanvas, setStage2Selection])

  const applyActiveTextStyle = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const active = canvas.getActiveObject()
    if (!isStage2TextObject(active)) return
    const { stage2TextFont, stage2TextSize, stage2TextColor } =
      useStage2Store.getState()
    applyTextStyle(active, stage2TextFont, stage2TextSize, stage2TextColor)
    canvas.requestRenderAll()
    persistCanvas()
  }, [persistCanvas])

  const syncObjectToStore = useCallback(
    (obj: FabricObject | undefined) => {
      if (!obj) {
        setStage2Selection(null)
        return
      }

      const kind = getObjectKind(obj)

      if (isStage2TextObject(obj)) {
        skipTextStyleApplyRef.current = true
        useStage2Store.getState().setStage2ActiveTool('select')
        setStage2Selection('text')
        const { font, size, color } = readTextStyle(obj)
        if (font) setStage2TextFont(font)
        setStage2TextSize(size)
        setStage2TextColor(color)
        return
      }

      if (obj instanceof Rect || obj instanceof Ellipse || kind === 'shape') {
        if (isLockedKind(kind)) {
          setStage2Selection(null)
          return
        }
        setStage2Selection('shape')
        setStage2ShapeTransparentFill(isTransparentFill(obj.fill))
        if (!isTransparentFill(obj.fill) && typeof obj.fill === 'string') {
          setStage2ShapeFill(obj.fill)
        }
        setStage2ShapeStroke(typeof obj.stroke === 'string' ? obj.stroke : '#2563eb')
        return
      }

      if (kind === 'cutout') {
        setStage2Selection('cutout')
        return
      }

      setStage2Selection(null)
    },
    [
      setStage2Selection,
      setStage2ShapeFill,
      setStage2ShapeStroke,
      setStage2ShapeTransparentFill,
      setStage2TextColor,
      setStage2TextFont,
      setStage2TextSize,
    ],
  )

  const placeCutout = useCallback(
    async (regionId: string, position?: { x: number; y: number }) => {
      const canvas = fabricRef.current
      if (!canvas) return

      const cuts = useStage1Store.getState().processedCuts
      const cut = findCutByRegionId(cuts, regionId)
      if (!cut) return

      const existing = findCanvasCutout(canvas, regionId)
      if (existing) {
        useStage2Store.getState().setStage2ActiveTool('select')
        ensureCanvasInteractivity(canvas, true)
        canvas.setActiveObject(existing)
        setStage2Selection('cutout')
        canvas.requestRenderAll()
        return
      }

      const count = countCanvasCutouts(canvas)
      const pos = position ?? cutoutLayoutPosition(count)
      const img = await addCutoutToCanvas(canvas, cut, pos)
      ensureCanvasInteractivity(canvas, true)
      canvas.setActiveObject(img)
      setStage2Selection('cutout')
      canvas.requestRenderAll()
      persistCanvas()
    },
    [persistCanvas, setStage2Selection],
  )

  useEffect(() => {
    if (!canvasElRef.current) return

    let disposed = false
    const canvas = new Canvas(canvasElRef.current, {
      width: STAGE2_CANVAS_WIDTH,
      height: STAGE2_CANVAS_HEIGHT,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    })
    fabricRef.current = canvas

    const bg = new Rect({
      left: 0,
      top: 0,
      width: STAGE2_CANVAS_WIDTH,
      height: STAGE2_CANVAS_HEIGHT,
      fill: '#ffffff',
      selectable: false,
      evented: false,
      data: { kind: 'background' },
    })
    canvas.add(bg)
    canvas.sendObjectToBack(bg)

    const onSelectionCreated = (e: { selected?: FabricObject[] }) => {
      syncObjectToStore(e.selected?.[0])
    }
    const onSelectionUpdated = (e: { selected?: FabricObject[] }) => {
      syncObjectToStore(e.selected?.[0])
    }
    const onSelectionCleared = () => setStage2Selection(null)
    const onModified = (e: { target?: FabricObject }) => {
      const target = e.target
      if (target && getObjectKind(target) !== 'background') {
        if (isStage2TextObject(target)) {
          skipTextStyleApplyRef.current = true
          syncObjectToStore(target)
        }
        const { stage2SnapToGrid, stage2GridSize } = useStage2Store.getState()
        if (stage2SnapToGrid) {
          if (target instanceof FabricImage && getObjectKind(target) === 'cutout') {
            snapObjectPosition(target, stage2GridSize)
          } else {
            snapFabricObjectPosition(target, stage2GridSize)
          }
          canvas.requestRenderAll()
        } else {
          target.setCoords?.()
        }
      }
      persistCanvas()
    }
    const onMoving = (e: { target?: FabricObject }) => {
      const { stage2SnapToGrid, stage2GridSize } = useStage2Store.getState()
      if (!stage2SnapToGrid) return
      const target = e.target
      if (!target || isLockedKind(getObjectKind(target))) return
      snapFabricObjectPosition(target, stage2GridSize)
    }

    canvas.on('selection:created', onSelectionCreated)
    canvas.on('selection:updated', onSelectionUpdated)
    canvas.on('selection:cleared', onSelectionCleared)
    canvas.on('object:modified', onModified)
    canvas.on('object:moving', onMoving)

    const onMouseDownExitEdit = (opt: { target?: FabricObject }) => {
      const active = canvas.getActiveObject()
      if (
        isStage2TextObject(active) &&
        active.isEditing &&
        opt.target !== active
      ) {
        active.exitEditing()
        canvas.requestRenderAll()
      }
    }

    const onTextEditingExited = () => {
      persistCanvas()
    }

    canvas.on('mouse:down', onMouseDownExitEdit)
    canvas.on('text:editing:exited', onTextEditingExited)

    const init = async () => {
      const json = useStage2Store.getState().stage2CanvasJson
      const needsInit = useStage2Store.getState().stage2NeedsInit

      if (json && !needsInit) {
        await canvas.loadFromJSON(JSON.parse(json))
        if (disposed) return
        await rehydrateCutoutImages(canvas)
        normalizeLoadedObjects(canvas)
        const hasBackground = canvas
          .getObjects()
          .some((obj) => getObjectKind(obj) === 'background')
        if (!hasBackground) {
          canvas.add(bg)
          canvas.sendObjectToBack(bg)
        }
      }

      if (disposed) return
      ensureCanvasInteractivity(canvas, true)
      markStage2Initialized()
      initializedRef.current = true
      canvas.requestRenderAll()
      persistCanvas()
    }

    void init()

    return () => {
      disposed = true
      persistCanvas()
      canvas.off('mouse:down', onMouseDownExitEdit)
      canvas.off('text:editing:exited', onTextEditingExited)
      canvas.dispose()
      fabricRef.current = null
      initializedRef.current = false
    }
  }, [
    markStage2Initialized,
    persistCanvas,
    setStage2Selection,
    syncObjectToStore,
  ])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !initializedRef.current || stage2AddCutoutToken === 0) return

    const pending = useStage2Store.getState().stage2PendingCutoutId
    if (!pending) return

    const run = async () => {
      if (pending === '__all__') {
        const cuts = useStage1Store.getState().processedCuts
        const { stage2SnapToGrid, stage2AutofitToGrid, stage2GridSize } =
          useStage2Store.getState()
        const existingIds = new Set(
          canvas
            .getObjects()
            .filter((obj) => getObjectKind(obj) === 'cutout')
            .map((obj) => (obj.get('data') as { regionId?: string })?.regionId)
            .filter(Boolean),
        )
        let layoutIndex = countCanvasCutouts(canvas)
        for (const cut of cuts) {
          if (existingIds.has(cut.regionId)) continue
          const { x, y } = cutoutLayoutPosition(layoutIndex)
          layoutIndex += 1
          await addCutoutToCanvas(canvas, cut, { x, y })
        }
        if (stage2SnapToGrid || stage2AutofitToGrid) {
          await rearrangeCutoutsOnGrid(canvas, stage2GridSize, stage2AutofitToGrid)
        }
        ensureCanvasInteractivity(canvas, true)
        canvas.requestRenderAll()
      } else {
        await placeCutout(pending)
      }
      clearStage2PendingCutout()
      persistCanvas()
    }

    void run()
  }, [
    clearStage2PendingCutout,
    persistCanvas,
    placeCutout,
    stage2AddCutoutToken,
  ])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !initializedRef.current || stage2RearrangeToken === 0) return
    void rearrangeCutoutsOnGrid(
      canvas,
      useStage2Store.getState().stage2GridSize,
      useStage2Store.getState().stage2AutofitToGrid,
    ).then(() => {
      ensureCanvasInteractivity(canvas, useStage2Store.getState().stage2ActiveTool === 'select')
      persistCanvas()
    })
  }, [persistCanvas, stage2RearrangeToken])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !initializedRef.current || stage2AddTextToken === 0) return
    if (lastHandledAddTextTokenRef.current === stage2AddTextToken) return
    lastHandledAddTextTokenRef.current = stage2AddTextToken

    const { stage2TextFont, stage2TextSize, stage2TextColor } =
      useStage2Store.getState()

    const text = new IText('Double-click to edit', {
      left: STAGE2_CANVAS_WIDTH / 2 - 80,
      top: STAGE2_CANVAS_HEIGHT / 2 - 20,
      fontFamily: stage2TextFont,
      fontSize: stage2TextSize,
      fill: stage2TextColor,
      editable: true,
      data: { kind: 'text', id: createStage2Id() },
    })

    canvas.add(text)
    canvas.setActiveObject(text)
    skipTextStyleApplyRef.current = true
    setStage2Selection('text')
    useStage2Store.getState().setStage2ActiveTool('select')
    ensureCanvasInteractivity(canvas, true)
    text.enterEditing()
    text.selectAll()
    canvas.requestRenderAll()
    persistCanvas()
  }, [persistCanvas, setStage2Selection, stage2AddTextToken])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || !initializedRef.current || stage2DeleteToken === 0) return
    deleteActiveSelection()
  }, [deleteActiveSelection, stage2DeleteToken])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const selectMode = stage2ActiveTool === 'select'
    canvas.selection = selectMode
    ensureCanvasInteractivity(canvas, selectMode)
    canvas.requestRenderAll()
  }, [stage2ActiveTool])

  useEffect(() => {
    if (stage2Selection !== 'text') return
    if (skipTextStyleApplyRef.current) {
      skipTextStyleApplyRef.current = false
      return
    }
    applyActiveTextStyle()
  }, [
    applyActiveTextStyle,
    stage2Selection,
    stage2TextColor,
    stage2TextFont,
    stage2TextSize,
  ])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas || stage2Selection !== 'shape') return
    const active = canvas.getActiveObject()
    if (!(active instanceof Rect || active instanceof Ellipse)) return
    active.set({
      fill: resolveShapeFill(stage2ShapeFill, stage2ShapeTransparentFill),
      stroke: stage2ShapeStroke,
      strokeWidth: 2,
    })
    canvas.requestRenderAll()
    persistCanvas()
  }, [
    persistCanvas,
    stage2Selection,
    stage2ShapeFill,
    stage2ShapeStroke,
    stage2ShapeTransparentFill,
  ])

  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return

    const onMouseDown = (opt: { e: TPointerEvent }) => {
      if (stage2ActiveTool !== 'rect' && stage2ActiveTool !== 'ellipse') return
      const pointer = canvas.getPointer(opt.e)
      drawingRef.current = {
        startX: pointer.x,
        startY: pointer.y,
        preview: null,
      }
    }

    const onMouseMove = (opt: { e: TPointerEvent }) => {
      const draw = drawingRef.current
      if (!draw) return
      if (stage2ActiveTool !== 'rect' && stage2ActiveTool !== 'ellipse') return

      const pointer = canvas.getPointer(opt.e)
      const shift = 'shiftKey' in opt.e ? opt.e.shiftKey : false
      if (draw.preview) canvas.remove(draw.preview)

      if (stage2ActiveTool === 'rect') {
        let w = pointer.x - draw.startX
        let h = pointer.y - draw.startY
        if (shift) {
          const size = Math.max(Math.abs(w), Math.abs(h))
          w = w < 0 ? -size : size
          h = h < 0 ? -size : size
        }
        draw.preview = new Rect({
          left: w < 0 ? draw.startX + w : draw.startX,
          top: h < 0 ? draw.startY + h : draw.startY,
          width: Math.abs(w),
          height: Math.abs(h),
          fill: getShapeFill(),
          stroke: stage2ShapeStroke,
          strokeWidth: 2,
          selectable: false,
          evented: false,
        })
      } else {
        let rx = Math.abs(pointer.x - draw.startX) / 2
        let ry = Math.abs(pointer.y - draw.startY) / 2
        const cx = (pointer.x + draw.startX) / 2
        const cy = (pointer.y + draw.startY) / 2
        if (shift) {
          const r = Math.max(rx, ry)
          rx = r
          ry = r
        }
        draw.preview = new Ellipse({
          left: cx,
          top: cy,
          rx,
          ry,
          originX: 'center',
          originY: 'center',
          fill: getShapeFill(),
          stroke: stage2ShapeStroke,
          strokeWidth: 2,
          selectable: false,
          evented: false,
        })
      }

      canvas.add(draw.preview)
      canvas.requestRenderAll()
    }

    const onMouseUp = () => {
      const draw = drawingRef.current
      if (!draw) return
      const preview = draw.preview
      drawingRef.current = null
      if (preview) canvas.remove(preview)
      if (!preview) return

      let shape: Rect | Ellipse | null = null

      if (preview instanceof Rect) {
        const w = preview.width ?? 0
        const h = preview.height ?? 0
        if (w >= MIN_SHAPE && h >= MIN_SHAPE) {
          shape = new Rect({
            left: preview.left,
            top: preview.top,
            width: w,
            height: h,
            fill: getShapeFill(),
            stroke: stage2ShapeStroke,
            strokeWidth: 2,
            data: { kind: 'shape', id: createStage2Id() },
          })
        }
      } else if (preview instanceof Ellipse) {
        const rx = preview.rx ?? 0
        const ry = preview.ry ?? 0
        if (rx >= MIN_SHAPE / 2 && ry >= MIN_SHAPE / 2) {
          shape = new Ellipse({
            left: preview.left,
            top: preview.top,
            rx,
            ry,
            originX: 'center',
            originY: 'center',
            fill: getShapeFill(),
            stroke: stage2ShapeStroke,
            strokeWidth: 2,
            data: { kind: 'shape', id: createStage2Id() },
          })
        }
      }

      if (shape) {
        canvas.add(shape)
        canvas.setActiveObject(shape)
        setStage2Selection('shape')
        useStage2Store.getState().setStage2ActiveTool('select')
        persistCanvas()
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
  }, [
    persistCanvas,
    setStage2Selection,
    stage2ActiveTool,
    stage2ShapeStroke,
    stage2ShapeTransparentFill,
    getShapeFill,
  ])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const canvas = fabricRef.current
      if (!canvas) return

      if (e.key === 'Escape') {
        const active = canvas.getActiveObject()
        if (isStage2TextObject(active) && active.isEditing) {
          active.exitEditing()
          canvas.requestRenderAll()
          e.preventDefault()
          e.stopPropagation()
        }
        return
      }

      if (e.key !== 'Delete' && e.key !== 'Backspace') return

      const active = canvas.getActiveObject()
      const editingText = isStage2TextObject(active) && active.isEditing

      if (editingText && e.key === 'Backspace') {
        return
      }

      if (!active && useStage2Store.getState().stage2Selection !== 'text') return
      if (active && isLockedKind(getObjectKind(active))) return

      e.preventDefault()
      e.stopPropagation()
      deleteActiveSelection()
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [deleteActiveSelection])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const canvas = fabricRef.current
    if (!canvas || !canvasElRef.current) return

    const regionId = e.dataTransfer.getData('application/x-reframe-cutout')
    if (!regionId) return

    const rect = canvasElRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    void placeCutout(regionId, { x: Math.max(0, x - 40), y: Math.max(0, y - 40) })
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-800">Layout</h2>
      <p className="mb-2 text-xs text-gray-500">
        Drop cutouts from above onto the grid. Enable snap or autofit in the sidebar to
        align cutouts to cells. Draw transparent shapes around cutouts as frames.
      </p>
      <div
        ref={containerRef}
        className="inline-block overflow-auto rounded border border-gray-300 p-2 outline-none"
        style={gridBackgroundStyle(stage2ShowGrid, stage2GridSize)}
        tabIndex={0}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <canvas ref={canvasElRef} />
      </div>
    </section>
  )
}
