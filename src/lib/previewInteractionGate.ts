/** Pauses background preview work during rotation slider drag (no Zustand updates). */
let previewRegenPaused = false
let rotationSliderDragging = false
let stageEl: HTMLSpanElement | null = null
let imgEl: HTMLImageElement | null = null
let canvasEl: HTMLCanvasElement | null = null
let canvasCtx: CanvasRenderingContext2D | null = null
let dragBaseRotation = 0
let pendingStaticOffset = 0
let dragRenderedW = 0
let dragRenderedH = 0
let lastDragDegrees = 0

// The native slider's 'input' events arrive in sparse, uneven bursts during
// a real mouse drag (measured gaps of 200-300ms mid-gesture — this is the
// browser only reporting pointer data when the OS actually has new mouse
// movement to report, most noticeable at the start of a gesture and near
// "landmark" values the user is visually tracking). We can't make the
// browser deliver events faster, but we can stop the picture from visibly
// snapping the moment a new value finally arrives: this loop continuously
// eases the displayed angle toward whatever the latest known slider value
// is, every animation frame, so a gap just looks like a brief pause in
// motion rather than a freeze-then-jump.
let dragTargetDelta = 0
let dragDisplayedDelta = 0
const DRAG_EASE = 0.45
const DRAG_EASE_EPSILON = 0.05

// --- Temporary on-screen diagnostics -------------------------------------
// Shows live frame timing while dragging the rotation slider so a real
// stutter can be measured directly (main-thread instrumentation during
// automated testing found no long tasks or slow event handlers, so this is
// meant to catch something that only shows up under real mouse input / real
// compositor behavior). Remove once the root cause is confirmed.
let diagOverlay: HTMLDivElement | null = null
let diagRaf: number | null = null
let diagLastFrameTime = 0
let diagDragStartTime = 0
let diagDropCount = 0
let diagWorstFrame = 0
let diagWorstFrameAngle = 0
let diagHideTimeout: number | null = null

// Raw native 'input' event arrival timing, independent of our rAF-throttled
// rendering. If the browser itself delays delivering pointer-driven 'input'
// events (e.g. due to OS/mouse event coalescing), the picture will visibly
// freeze even though every frame we *did* render was fast — which a
// frame-render timer alone can't distinguish from a slow render.
let diagLastInputTime = 0
let diagWorstInputGap = 0
let diagWorstInputGapAngle = 0
let diagInputEventCount = 0

function ensureDiagOverlay(): HTMLDivElement {
  if (diagOverlay) return diagOverlay
  const el = document.createElement('div')
  el.style.position = 'fixed'
  el.style.top = '8px'
  el.style.right = '8px'
  el.style.zIndex = '2147483647'
  el.style.background = 'rgba(0,0,0,0.8)'
  el.style.color = '#fff'
  el.style.font = '12px/1.4 monospace'
  el.style.padding = '6px 10px'
  el.style.borderRadius = '4px'
  el.style.pointerEvents = 'none'
  el.style.whiteSpace = 'pre'
  document.body.appendChild(el)
  diagOverlay = el
  return el
}

function renderDiagOverlay(): void {
  const el = ensureDiagOverlay()
  el.textContent =
    `rotation drag diag\n` +
    `frame drops(>32ms): ${diagDropCount}  worst: ${diagWorstFrame.toFixed(1)}ms @ ${diagWorstFrameAngle}°\n` +
    `raw input events: ${diagInputEventCount}  worst gap: ${diagWorstInputGap.toFixed(1)}ms @ ${diagWorstInputGapAngle}°\n` +
    `angle: ${lastDragDegrees}°`
}

function dragRenderLoop(t: number): void {
  // First tick after the drag starts has no prior frame to diff against —
  // compare against the drag-start timestamp instead so a slow *first*
  // frame (e.g. from synchronous layout work in beginPreviewDragRotation)
  // is actually captured, not silently skipped.
  const reference = diagLastFrameTime || diagDragStartTime
  const delta = t - reference
  if (delta > diagWorstFrame) {
    diagWorstFrame = delta
    diagWorstFrameAngle = lastDragDegrees
  }
  if (delta > 32) {
    diagDropCount += 1
    // eslint-disable-next-line no-console
    console.warn(
      `[rotation-diag] dropped ${diagLastFrameTime ? 'frame' : 'FIRST frame'}: ${delta.toFixed(1)}ms at ~${lastDragDegrees}°`,
    )
  }

  const diff = dragTargetDelta - dragDisplayedDelta
  dragDisplayedDelta =
    Math.abs(diff) > DRAG_EASE_EPSILON ? dragDisplayedDelta + diff * DRAG_EASE : dragTargetDelta
  drawDragFrame(dragDisplayedDelta)

  renderDiagOverlay()
  diagLastFrameTime = t
  diagRaf = requestAnimationFrame(dragRenderLoop)
}

/** Call on every raw native 'input' event (before rAF throttling). */
export function recordRawRotationInput(): void {
  const now = performance.now()
  diagInputEventCount += 1
  if (diagLastInputTime) {
    const gap = now - diagLastInputTime
    if (gap > diagWorstInputGap) {
      diagWorstInputGap = gap
      diagWorstInputGapAngle = lastDragDegrees
      if (gap > 32) {
        // eslint-disable-next-line no-console
        console.warn(`[rotation-diag] slow INPUT EVENT gap: ${gap.toFixed(1)}ms at ~${lastDragDegrees}°`)
      }
    }
  }
  diagLastInputTime = now
}

function startDragDiag(): void {
  if (diagHideTimeout !== null) {
    window.clearTimeout(diagHideTimeout)
    diagHideTimeout = null
  }
  diagDragStartTime = performance.now()
  diagLastFrameTime = 0
  diagDropCount = 0
  diagWorstFrame = 0
  diagWorstFrameAngle = 0
  diagLastInputTime = diagDragStartTime
  diagWorstInputGap = 0
  diagWorstInputGapAngle = 0
  diagInputEventCount = 0
  ensureDiagOverlay()
  if (diagRaf === null) diagRaf = requestAnimationFrame(dragRenderLoop)
}

function stopDragDiag(): void {
  if (diagRaf !== null) {
    cancelAnimationFrame(diagRaf)
    diagRaf = null
  }
  if (diagOverlay) {
    diagOverlay.textContent += `\n(drag ended)`
    diagHideTimeout = window.setTimeout(() => {
      diagOverlay?.remove()
      diagOverlay = null
      diagHideTimeout = null
    }, 8000)
  }
}
// ---------------------------------------------------------------------------

function applyIdleTransform(degrees: number): void {
  if (!stageEl) return
  stageEl.style.transform = degrees !== 0 ? `rotate(${degrees}deg)` : ''
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

export function registerPreviewImg(el: HTMLSpanElement | null): void {
  stageEl = el
  if (el) applyIdleTransform(pendingStaticOffset)
}

export function registerPreviewImageEl(el: HTMLImageElement | null): void {
  imgEl = el
}

export function registerPreviewCanvas(el: HTMLCanvasElement | null): void {
  canvasEl = el
  canvasCtx = el ? el.getContext('2d', { alpha: true }) : null
}

/** CSS offset between committed rotation and what is baked into the current preview blob. */
export function setPreviewStaticOffset(degrees: number): void {
  pendingStaticOffset = degrees
  if (!rotationSliderDragging) {
    applyIdleTransform(degrees)
  }
}

/**
 * Draws the preview image onto the drag canvas rotated by `deltaDeg`. This
 * replaces animating a CSS `transform` on the live `<img>`: rotation via
 * CSS relies on the browser's compositor to promote the element to its own
 * GPU layer and can visibly hitch while that layer is created/resized
 * (observed at the start of a drag and again around 90 degrees). Drawing
 * the rotated frame ourselves on a canvas is a plain, constant-cost
 * raster operation every frame — nothing for the compositor to negotiate.
 */
function drawDragFrame(deltaDeg: number): void {
  if (!canvasEl || !canvasCtx || !imgEl) return
  const rad = (deltaDeg * Math.PI) / 180
  canvasCtx.setTransform(1, 0, 0, 1, 0, 0)
  canvasCtx.clearRect(0, 0, canvasEl.width, canvasEl.height)
  canvasCtx.save()
  canvasCtx.translate(canvasEl.width / 2, canvasEl.height / 2)
  canvasCtx.rotate(rad)
  canvasCtx.drawImage(imgEl, -dragRenderedW / 2, -dragRenderedH / 2, dragRenderedW, dragRenderedH)
  canvasCtx.restore()
}

export function beginPreviewDragRotation(committedRotation: number): void {
  // Start timing before any of our own layout-forcing work below, so a slow
  // first frame caused by *our* setup work (not just rendering) is counted.
  lastDragDegrees = committedRotation
  startDragDiag()

  dragBaseRotation = committedRotation
  if (!stageEl || !imgEl || !canvasEl) return

  const rect = imgEl.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  const cssW = rect.width || 1
  const cssH = rect.height || 1
  const diagonal = Math.max(1, Math.ceil(Math.sqrt(cssW * cssW + cssH * cssH)))

  dragRenderedW = cssW * dpr
  dragRenderedH = cssH * dpr
  canvasEl.width = Math.max(1, Math.ceil(diagonal * dpr))
  canvasEl.height = Math.max(1, Math.ceil(diagonal * dpr))
  canvasEl.style.width = `${diagonal}px`
  canvasEl.style.height = `${diagonal}px`
  canvasEl.style.marginLeft = `${-diagonal / 2}px`
  canvasEl.style.marginTop = `${-diagonal / 2}px`
  canvasEl.style.display = 'block'
  imgEl.style.visibility = 'hidden'

  dragTargetDelta = 0
  dragDisplayedDelta = 0
  drawDragFrame(0)
}

export function setPreviewDragRotation(degrees: number): void {
  lastDragDegrees = degrees
  dragTargetDelta = degrees - dragBaseRotation
}

export function endPreviewDragRotation(): void {
  if (canvasEl) canvasEl.style.display = 'none'
  if (imgEl) imgEl.style.visibility = ''
  applyIdleTransform(pendingStaticOffset)
  stopDragDiag()
}

export function preloadPreviewUrl(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to preload preview image'))
    img.src = url
  })
}
