import type { Canvas, FabricObject } from 'fabric'

export type Stage2LayerKind = 'cutout' | 'text' | 'shape'
export type Stage2LayerOrderAction = 'front' | 'back' | 'forward' | 'backward'

export type Stage2LayerEntry = {
  id: string
  kind: Stage2LayerKind
  label: string
}

type ObjectKind = 'background' | 'grid' | 'cutout' | 'text' | 'shape'

function getObjectKind(obj: FabricObject): ObjectKind | null {
  return (obj.get('data') as { kind?: ObjectKind })?.kind ?? null
}

export function isLayerableKind(kind: ObjectKind | null): kind is Stage2LayerKind {
  return kind === 'cutout' || kind === 'text' || kind === 'shape'
}

export function isLayerableObject(obj: FabricObject): boolean {
  return isLayerableKind(getObjectKind(obj))
}

export function getLayerObjectId(obj: FabricObject): string | null {
  const kind = getObjectKind(obj)
  const data = obj.get('data') as { id?: string; regionId?: string; label?: string }
  if (kind === 'cutout' && data.regionId) return `cutout:${data.regionId}`
  if ((kind === 'text' || kind === 'shape') && data.id) return data.id
  return null
}

export function formatLayerLabel(obj: FabricObject): string {
  const kind = getObjectKind(obj)
  const data = obj.get('data') as { label?: string }
  if (kind === 'cutout') return `Cutout #${data.label ?? '?'}`
  if (kind === 'text') {
    const rawText = (obj as { text?: string }).text
    const text = typeof rawText === 'string' ? rawText : 'Text'
    const preview = text.replace(/\s+/g, ' ').trim()
    return preview.length > 24 ? `${preview.slice(0, 24)}…` : preview || 'Text'
  }
  if (kind === 'shape') {
    const type = (obj as { type?: string }).type?.toLowerCase()
    return type === 'ellipse' ? 'Oval' : 'Rectangle'
  }
  return 'Layer'
}

export function buildLayerStack(canvas: Canvas): Stage2LayerEntry[] {
  const layers: Stage2LayerEntry[] = []
  const objects = canvas.getObjects()

  for (let i = objects.length - 1; i >= 0; i -= 1) {
    const obj = objects[i]
    if (!isLayerableObject(obj)) continue
    const id = getLayerObjectId(obj)
    if (!id) continue
    const kind = getObjectKind(obj) as Stage2LayerKind
    layers.push({ id, kind, label: formatLayerLabel(obj) })
  }

  return layers
}

function backgroundFloorIndex(canvas: Canvas): number {
  const objects = canvas.getObjects()
  const backgroundIndex = objects.findIndex((obj) => getObjectKind(obj) === 'background')
  return backgroundIndex >= 0 ? backgroundIndex + 1 : 0
}

export function findLayerObjectById(
  canvas: Canvas,
  layerId: string,
): FabricObject | undefined {
  return canvas.getObjects().find((obj) => getLayerObjectId(obj) === layerId)
}

export function applyLayerOrder(
  canvas: Canvas,
  object: FabricObject,
  action: Stage2LayerOrderAction,
): boolean {
  const objects = canvas.getObjects()
  const currentIndex = objects.indexOf(object)
  if (currentIndex < 0) return false

  const minIndex = backgroundFloorIndex(canvas)

  switch (action) {
    case 'front':
      return canvas.bringObjectToFront(object)
    case 'back':
      return canvas.moveObjectTo(object, minIndex)
    case 'forward':
      return canvas.bringObjectForward(object)
    case 'backward': {
      if (currentIndex <= minIndex) return false
      const moved = canvas.sendObjectBackwards(object)
      const newIndex = canvas.getObjects().indexOf(object)
      if (newIndex < minIndex) {
        canvas.moveObjectTo(object, minIndex)
      }
      return moved
    }
    default:
      return false
  }
}
