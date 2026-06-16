import { Canvas, FabricImage, FabricObject, Rect } from 'fabric'
import { findCutByRegionId } from './stage2Cutouts'
import { createStage2Id, STAGE2_CANVAS_HEIGHT, STAGE2_CANVAS_WIDTH } from './stage2Types'
import type { ProcessedCut } from './regionTypes'

const CANVAS_PROPS = ['data'] as const

type ObjectKind = 'background' | 'grid' | 'cutout' | 'text' | 'shape'

function getObjectKind(obj: FabricObject): ObjectKind | null {
  return (obj.get('data') as { kind?: ObjectKind })?.kind ?? null
}

function normalizeLoadedObjects(canvas: Canvas): void {
  for (const obj of canvas.getObjects()) {
    const type = (obj as { type?: string }).type?.toLowerCase()
    const isText =
      getObjectKind(obj) === 'text' ||
      type === 'i-text' ||
      type === 'itext' ||
      type === 'textbox'
    if (isText && getObjectKind(obj) !== 'text') {
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

async function rehydrateCutoutImages(
  canvas: Canvas,
  cuts: ProcessedCut[],
): Promise<void> {
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

function lockCanvasObjects(canvas: Canvas): void {
  canvas.getObjects().forEach((obj) => {
    obj.set({
      selectable: false,
      evented: false,
      hasControls: false,
    })
  })
  canvas.selection = false
}

export async function loadLayoutOntoCanvas(
  canvas: Canvas,
  json: string | null,
  cuts: ProcessedCut[],
): Promise<boolean> {
  if (!json) return false

  await canvas.loadFromJSON(JSON.parse(json))
  await rehydrateCutoutImages(canvas, cuts)
  normalizeLoadedObjects(canvas)

  const hasBackground = canvas
    .getObjects()
    .some((obj) => getObjectKind(obj) === 'background')
  if (!hasBackground) {
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
  }

  lockCanvasObjects(canvas)
  canvas.requestRenderAll()
  return true
}

export function createLayoutCanvas(element: HTMLCanvasElement): Canvas {
  return new Canvas(element, {
    width: STAGE2_CANVAS_WIDTH,
    height: STAGE2_CANVAS_HEIGHT,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
    selection: false,
  })
}

export { STAGE2_CANVAS_HEIGHT, STAGE2_CANVAS_WIDTH, CANVAS_PROPS }
