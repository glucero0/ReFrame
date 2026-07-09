import { memo, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { formatPixelDimensions, type CutoutTrayViewMode } from '../../lib/cutoutTrayView'
import { useStage1Store } from '../../store/stage1Store'
import { normalizeFilterSettings } from '../../lib/regionTypes'
import {
  beginPreviewDragRotation,
  endPreviewDragRotation,
  isRotationSliderDragging,
  recordRawRotationInput,
  setPreviewDragRotation,
  setPreviewRegenPaused,
  setPreviewStaticOffset,
  setRotationSliderDragging,
} from '../../lib/previewInteractionGate'
import BeforeAfterCompare from './BeforeAfterCompare'
import CutoutPreviewSurface from './CutoutPreviewSurface'

type ImagePreviewerProps = {
  fillHeight?: boolean
}

type RotationSliderProps = {
  regionId: string
  committedRotation: number
  disabled: boolean
  onCommit: (degrees: number) => void
}

// Arrow/Home/End/PageUp/PageDown change a range input's value without any
// pointer events at all, so the drag session (which sets up the preview
// canvas and starts the render loop) has to be started/ended around these
// keys explicitly — otherwise the value changes but the live preview never
// draws anything.
const RANGE_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])

// Filter edits regenerate the current preview on every throttled tick while
// dragging (~every 100ms), and each one flips `isProcessing` true then false
// almost immediately since a single-region regen is fast. Reflecting that
// raw flag straight into the UI made the Previous/Next/rotation controls
// flicker between enabled and disabled, and the label text flip between
// "Cut X (Y of Z)" and "Updating preview…", dozens of times per second.
// Delaying the *visible* processing state means brief regens never surface
// it at all, while a genuinely slow regen still shows it after a beat.
const PROCESSING_INDICATOR_DELAY_MS = 150

const ROTATION_MAX = 359
const ROTATION_TRACK_WIDTH = 192 // px, matches the previous w-48 native slider

function clampRotation(value: number): number {
  return Math.max(0, Math.min(ROTATION_MAX, Math.round(value)))
}

const RotationSlider = memo(function RotationSlider({
  committedRotation,
  disabled,
  onCommit,
}: RotationSliderProps) {
  const labelRef = useRef<HTMLSpanElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef(committedRotation)
  const draggingRef = useRef(false)
  const trackRectRef = useRef<DOMRect | null>(null)

  const paintValue = (value: number) => {
    if (labelRef.current) labelRef.current.textContent = `${value}°`
    const pct = (value / ROTATION_MAX) * 100
    if (thumbRef.current) thumbRef.current.style.left = `${pct}%`
    if (fillRef.current) fillRef.current.style.width = `${pct}%`
    if (trackRef.current) trackRef.current.setAttribute('aria-valuenow', String(value))
  }

  // Keep the idle (non-dragging) visual state in sync with the committed
  // value, e.g. after the 90° buttons are used or a different cut is
  // selected.
  useEffect(() => {
    if (!draggingRef.current) paintValue(committedRotation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [committedRotation])

  const applyValue = (value: number) => {
    const clamped = clampRotation(value)
    pendingRef.current = clamped
    paintValue(clamped)
    recordRawRotationInput()
    setPreviewDragRotation(clamped)
  }

  const startDrag = () => {
    draggingRef.current = true
    pendingRef.current = committedRotation
    setPreviewRegenPaused(true)
    setRotationSliderDragging(true)
    beginPreviewDragRotation(committedRotation)
  }

  const endDrag = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    trackRectRef.current = null
    setRotationSliderDragging(false)
    setPreviewRegenPaused(false)
    endPreviewDragRotation()
    const final = pendingRef.current
    if (final !== committedRotation) {
      onCommit(final)
    }
  }

  const valueFromClientX = (clientX: number): number => {
    const rect = trackRectRef.current
    if (!rect || rect.width === 0) return pendingRef.current
    const ratio = (clientX - rect.left) / rect.width
    return clampRotation(ratio * ROTATION_MAX)
  }

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    event.stopPropagation()
    // A plain <div> isn't a native form control, so without this the
    // browser can interpret the mousedown+move as "start a text
    // selection/native drag" gesture instead of handing it to us — that's
    // what shows the not-allowed cursor and blocks further pointermove
    // handling. preventDefault() on pointerdown suppresses that.
    event.preventDefault()
    event.currentTarget.focus()
    event.currentTarget.setPointerCapture(event.pointerId)
    // Cache the track's bounding box once per drag: reading it on every
    // pointermove would force a layout read on the hottest possible path.
    trackRectRef.current = event.currentTarget.getBoundingClientRect()
    startDrag()
    applyValue(valueFromClientX(event.clientX))
  }

  // Driven directly by raw 'pointermove' events rather than the native
  // <input type="range"> 'input' event: browsers can let a native range
  // thumb visually track the mouse via a fast/compositor-adjacent path
  // while dispatching the JS 'input' event on a separate, coarser cadence
  // (measured gaps of 200-700ms between 'input' events during real drags,
  // despite zero slow frames/handlers on our side). Reading the pointer
  // position straight from the event we're handling has no such
  // intermediary, so this reflects genuine mouse-hardware timing.
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return
    event.stopPropagation()
    applyValue(valueFromClientX(event.clientX))
  }

  const finish = (event: PointerEvent<HTMLDivElement>) => {
    event.stopPropagation()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    endDrag()
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !RANGE_KEYS.has(event.key)) return
    event.stopPropagation()
    event.preventDefault()
    if (!draggingRef.current) startDrag()
    const current = pendingRef.current
    const step = event.key === 'PageUp' ? 10 : event.key === 'PageDown' ? -10 : 1
    let next = current
    if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = ROTATION_MAX
    else if (event.key === 'ArrowRight' || event.key === 'ArrowUp' || event.key === 'PageUp')
      next = current + step
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown' || event.key === 'PageDown')
      next = current + step
    applyValue(next)
  }

  const onKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!RANGE_KEYS.has(event.key)) return
    event.stopPropagation()
    endDrag()
  }

  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span ref={labelRef} className="whitespace-nowrap">
        {Math.round(committedRotation)}°
      </span>
      <div
        ref={trackRef}
        role="slider"
        aria-label="Cutout rotation"
        aria-valuemin={0}
        aria-valuemax={ROTATION_MAX}
        aria-valuenow={Math.round(committedRotation)}
        aria-disabled={disabled}
        aria-orientation="horizontal"
        tabIndex={disabled ? -1 : 0}
        style={{ width: `${ROTATION_TRACK_WIDTH}px` }}
        className={`relative h-5 shrink-0 touch-none select-none outline-none ${
          disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'
        } focus-visible:ring-2 focus-visible:ring-blue-500`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finish}
        onPointerCancel={finish}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onBlur={endDrag}
      >
        <div className="pointer-events-none absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-gray-200" />
        <div
          ref={fillRef}
          className="pointer-events-none absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-blue-400"
          style={{ width: `${(committedRotation / ROTATION_MAX) * 100}%` }}
        />
        <div
          ref={thumbRef}
          className="pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-600 bg-white shadow"
          style={{ left: `${(committedRotation / ROTATION_MAX) * 100}%` }}
        />
      </div>
    </label>
  )
})

export default function ImagePreviewer({ fillHeight = false }: ImagePreviewerProps) {
  const processedCuts = useStage1Store((s) => s.processedCuts)
  const previewIndex = useStage1Store((s) => s.previewIndex)
  const focusPreviewCut = useStage1Store((s) => s.focusPreviewCut)
  const isProcessing = useStage1Store((s) => s.isProcessing)
  const filterSliderDragging = useStage1Store((s) => s.filterSliderDragging)
  const regions = useStage1Store((s) => s.regions)
  const bgColorPickActive = useStage1Store((s) => s.bgColorPickActive)
  const setBgColorPickActive = useStage1Store((s) => s.setBgColorPickActive)
  const setRegionFilters = useStage1Store((s) => s.setRegionFilters)
  const setRegionRotation = useStage1Store((s) => s.setRegionRotation)
  const pushUndo = useStage1Store((s) => s.pushUndo)
  const regionFilters = useStage1Store((s) => s.regionFilters)

  const previewPanelRef = useRef<HTMLDivElement>(null)
  const [trayViewMode, setTrayViewMode] = useState<CutoutTrayViewMode>('fit')
  const [pixelDimensions, setPixelDimensions] = useState<{ width: number; height: number } | null>(
    null,
  )

  const current = processedCuts[previewIndex]
  const total = processedCuts.length
  const currentRegion = current
    ? regions.find((region) => region.id === current.regionId)
    : null
  const committedRotation = currentRegion?.rotation ?? 0
  const bakedRotation = current?.bakedRotation ?? 0

  const sliderBusy = isRotationSliderDragging()

  useEffect(() => {
    setPixelDimensions(null)
  }, [current?.regionId, current?.previewUrl])

  const [processingIndicatorVisible, setProcessingIndicatorVisible] = useState(false)
  useEffect(() => {
    if (!isProcessing) {
      setProcessingIndicatorVisible(false)
      return
    }
    const timer = window.setTimeout(
      () => setProcessingIndicatorVisible(true),
      PROCESSING_INDICATOR_DELAY_MS,
    )
    return () => window.clearTimeout(timer)
  }, [isProcessing])

  // filterSliderDragging (set for the actual hold duration of any filter
  // slider, see FilterPanel) is the precise signal; the timer above is a
  // fallback for regens triggered by non-slider edits (checkboxes, undo,
  // etc.) that can't report a "hold" the same way.
  const showProcessing = processingIndicatorVisible && !sliderBusy && !filterSliderDragging

  useEffect(() => {
    if (sliderBusy || !current) return
    setPreviewStaticOffset(committedRotation - bakedRotation)
  }, [sliderBusy, current, committedRotation, bakedRotation, current?.previewUrl])

  const bgRemoveActive =
    current != null &&
    normalizeFilterSettings(regionFilters[current.regionId] ?? {}).bgRemove

  const focusCut = (index: number) => {
    if (showProcessing || total === 0) return
    focusPreviewCut(index)
  }

  const rotateBy = (delta: number) => {
    if (!current) return
    setRegionRotation(current.regionId, committedRotation + delta)
  }

  const commitSliderRotation = (degrees: number) => {
    if (!current) return
    pushUndo()
    setRegionRotation(current.regionId, degrees, { skipUndo: true })
  }

  const handlePreviewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!current || bgColorPickActive || sliderBusy) return
    if (event.key === '[') {
      event.preventDefault()
      rotateBy(-90)
    } else if (event.key === ']') {
      event.preventDefault()
      rotateBy(90)
    }
  }

  if (regions.length === 0) {
    return (
      <div className="flex h-full items-center bg-white px-4 py-3 text-sm text-gray-500">
        Draw cut regions on the canvas to see cutouts in the tray here.
      </div>
    )
  }

  return (
    <div
      ref={previewPanelRef}
      tabIndex={0}
      className={`bg-white px-4 py-2 outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        fillHeight ? 'flex h-full min-h-0 flex-col' : 'py-3'
      }`}
      onKeyDown={handlePreviewKeyDown}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-sm font-medium text-gray-700">Cutout tray</span>
        <button
          type="button"
          disabled={previewIndex <= 0 || showProcessing || total === 0}
          className="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
          onClick={(e) => {
            e.stopPropagation()
            focusCut(previewIndex - 1)
          }}
        >
          Previous
        </button>
        <span className="inline-block min-w-[11rem] text-sm text-gray-600">
          {showProcessing
            ? 'Updating preview…'
            : total > 0 && current
              ? `Cut ${current.label} (${previewIndex + 1} of ${total})${
                  pixelDimensions
                    ? ` · ${formatPixelDimensions(pixelDimensions.width, pixelDimensions.height)}`
                    : ''
                }`
              : 'Generating preview…'}
        </span>
        <button
          type="button"
          disabled={previewIndex >= total - 1 || showProcessing || total === 0}
          className="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
          onClick={(e) => {
            e.stopPropagation()
            focusCut(previewIndex + 1)
          }}
        >
          Next
        </button>
        <button
          type="button"
          disabled={!current || showProcessing}
          className={`rounded border px-2 py-1 text-sm disabled:opacity-40 ${
            trayViewMode === 'fit'
              ? 'border-blue-600 bg-blue-50 text-blue-800'
              : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            setTrayViewMode('fit')
          }}
        >
          Fit to tray
        </button>
        <button
          type="button"
          disabled={!current || showProcessing}
          className={`rounded border px-2 py-1 text-sm disabled:opacity-40 ${
            trayViewMode === 'actual'
              ? 'border-blue-600 bg-blue-50 text-blue-800'
              : 'border-gray-300 bg-white hover:bg-gray-50'
          }`}
          onClick={(e) => {
            e.stopPropagation()
            setTrayViewMode('actual')
          }}
          title="View at full pixel size with scrollbars"
        >
          Actual size
        </button>
        {current && !bgColorPickActive && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={sliderBusy}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
              title="Rotate 90° counter-clockwise ([)"
              onClick={(e) => {
                e.stopPropagation()
                rotateBy(-90)
              }}
            >
              ↺ 90°
            </button>
            <button
              type="button"
              disabled={sliderBusy}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
              title="Rotate 90° clockwise (])"
              onClick={(e) => {
                e.stopPropagation()
                rotateBy(90)
              }}
            >
              ↻ 90°
            </button>
            <RotationSlider
              regionId={current.regionId}
              committedRotation={committedRotation}
              disabled={showProcessing}
              onCommit={commitSliderRotation}
            />
            <span className="text-xs text-gray-500">
              Use [ and ] for 90° steps.
            </span>
          </div>
        )}
        {fillHeight && (
          <span className="text-xs text-gray-500">
            Drag the divider above to resize this panel.
          </span>
        )}
        {bgRemoveActive && (
          <span className="text-xs text-gray-500">
            Gray checkerboard shows through transparent areas.
          </span>
        )}
      </div>

      {current ? (
        <div
          className={`${fillHeight ? 'mt-2 min-h-0 flex-1' : 'mt-3'} ${
            !showProcessing ? 'cursor-pointer' : ''
          }`}
          onClick={() => {
            focusCut(previewIndex)
            previewPanelRef.current?.focus()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              focusCut(previewIndex)
            }
          }}
          role="button"
          tabIndex={showProcessing ? -1 : 0}
          title="Select this cutout on the canvas"
        >
          <BeforeAfterCompare
            originalUrl={current.originalPreviewUrl}
            editedUrl={current.previewUrl}
            alt={`Cut ${current.label}`}
            fillHeight={fillHeight}
            viewMode={trayViewMode}
            pickColorActive={bgColorPickActive}
            onIntrinsicSize={(width, height) => setPixelDimensions({ width, height })}
            registerEditedAsDragTarget
            onPickColor={(color) => {
              setRegionFilters(current.regionId, {
                bgRemove: true,
                bgRemoveColor: color,
              })
              setBgColorPickActive(false)
            }}
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400 ${
            fillHeight ? 'mt-2 min-h-0 flex-1' : 'mt-3 h-32'
          }`}
        >
          {showProcessing ? 'Processing…' : 'Waiting for preview…'}
        </div>
      )}

      {total > 1 && (
        // Deliberately not gated on `showProcessing`: previews regenerate
        // (and isProcessing toggles true/false) on every throttled filter
        // edit, roughly every 100ms during a drag. Hiding/showing this
        // whole block on that cadence was mounting/unmounting it
        // continuously, which shoved everything above and below it up and
        // down — the "constant redraw and jiggle" during filter dragging.
        <div className="mt-2 max-h-16 shrink-0 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
          {processedCuts.map((cut, index) => (
            <button
              key={cut.regionId}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                focusCut(index)
              }}
              className={`rounded border p-1 ${
                index === previewIndex
                  ? 'border-blue-600 ring-1 ring-blue-600'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
              title={`Preview cut ${cut.label}`}
            >
              <CutoutPreviewSurface
                src={cut.previewUrl}
                alt={`Cut ${cut.label}`}
                surfaceClassName="h-12 w-12 object-contain"
              />
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}
