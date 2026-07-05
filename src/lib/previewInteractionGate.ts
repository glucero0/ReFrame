/** Pauses background preview work during rotation slider drag (no Zustand updates). */
let previewRegenPaused = false
let rotationSliderDragging = false
let previewImg: HTMLImageElement | null = null
let dragBaseRotation = 0
let pendingStaticOffset = 0

function applyPreviewTransform(degrees: number): void {
  if (!previewImg) return
  previewImg.style.transformOrigin = 'center center'
  previewImg.style.transform =
    degrees !== 0 ? `rotate(${degrees}deg) translateZ(0)` : ''
}

export function setPreviewRegenPaused(paused: boolean): void {
  previewRegenPaused = paused
}

export function isPreviewRegenPaused(): boolean {
  return previewRegenPaused
}

export function setRotationSliderDragging(dragging: boolean): void {
  rotationSliderDragging = dragging
}

export function isRotationSliderDragging(): boolean {
  return rotationSliderDragging
}

export function registerPreviewImg(el: HTMLImageElement | null): void {
  previewImg = el
}

/** CSS offset between committed rotation and what is baked into the current preview blob. */
export function setPreviewStaticOffset(degrees: number): void {
  pendingStaticOffset = degrees
  if (!rotationSliderDragging) {
    applyPreviewTransform(degrees)
  }
}

export function beginPreviewDragRotation(committedRotation: number): void {
  dragBaseRotation = committedRotation
  if (!previewImg) return
  previewImg.style.transformOrigin = 'center center'
  previewImg.style.willChange = 'transform'
  previewImg.style.transform = ''
}

export function setPreviewDragRotation(degrees: number): void {
  if (!previewImg) return
  const delta = degrees - dragBaseRotation
  previewImg.style.transform =
    delta !== 0 ? `rotate(${delta}deg) translateZ(0)` : ''
}

export function endPreviewDragRotation(): void {
  if (!previewImg) return
  previewImg.style.willChange = ''
  applyPreviewTransform(pendingStaticOffset)
}

export function preloadPreviewUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to preload preview image'))
    img.src = url
  })
}
