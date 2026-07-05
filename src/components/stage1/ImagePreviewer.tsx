import { memo, useEffect, useRef, type FormEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { useStage1Store } from '../../store/stage1Store'
import { normalizeFilterSettings } from '../../lib/regionTypes'
import {
  beginPreviewDragRotation,
  endPreviewDragRotation,
  isRotationSliderDragging,
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

const RotationSlider = memo(function RotationSlider({
  regionId,
  committedRotation,
  disabled,
  onCommit,
}: RotationSliderProps) {
  const labelRef = useRef<HTMLSpanElement>(null)
  const pendingRef = useRef(committedRotation)
  const draggingRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  const onPointerDown = (event: PointerEvent<HTMLInputElement>) => {
    event.stopPropagation()
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    pendingRef.current = committedRotation
    setPreviewRegenPaused(true)
    setRotationSliderDragging(true)
    beginPreviewDragRotation(committedRotation)
  }

  const onInput = (event: FormEvent<HTMLInputElement>) => {
    event.stopPropagation()
    const value = Number(event.currentTarget.value)
    pendingRef.current = value
    if (labelRef.current) {
      labelRef.current.textContent = `${value}°`
    }
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setPreviewDragRotation(pendingRef.current)
    })
  }

  const finish = (event: PointerEvent<HTMLInputElement>) => {
    event.stopPropagation()
    if (!draggingRef.current) return
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    draggingRef.current = false
    setRotationSliderDragging(false)
    setPreviewRegenPaused(false)
    endPreviewDragRotation()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    const final = pendingRef.current
    if (final !== committedRotation) {
      onCommit(final)
    }
  }

  return (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span ref={labelRef} className="whitespace-nowrap">
        {Math.round(committedRotation)}°
      </span>
      <input
        key={`${regionId}-${committedRotation}`}
        type="range"
        min={0}
        max={359}
        defaultValue={committedRotation}
        disabled={disabled}
        className="w-28"
        aria-label="Cutout rotation"
        onPointerDown={onPointerDown}
        onInput={onInput}
        onPointerUp={finish}
        onPointerCancel={finish}
      />
    </label>
  )
})

export default function ImagePreviewer({ fillHeight = false }: ImagePreviewerProps) {
  const processedCuts = useStage1Store((s) => s.processedCuts)
  const previewIndex = useStage1Store((s) => s.previewIndex)
  const focusPreviewCut = useStage1Store((s) => s.focusPreviewCut)
  const isProcessing = useStage1Store((s) => s.isProcessing)
  const regions = useStage1Store((s) => s.regions)
  const bgColorPickActive = useStage1Store((s) => s.bgColorPickActive)
  const setBgColorPickActive = useStage1Store((s) => s.setBgColorPickActive)
  const setRegionFilters = useStage1Store((s) => s.setRegionFilters)
  const setRegionRotation = useStage1Store((s) => s.setRegionRotation)
  const pushUndo = useStage1Store((s) => s.pushUndo)
  const regionFilters = useStage1Store((s) => s.regionFilters)

  const previewPanelRef = useRef<HTMLDivElement>(null)

  const current = processedCuts[previewIndex]
  const total = processedCuts.length
  const currentRegion = current
    ? regions.find((region) => region.id === current.regionId)
    : null
  const committedRotation = currentRegion?.rotation ?? 0
  const bakedRotation = current?.bakedRotation ?? 0

  const sliderBusy = isRotationSliderDragging()
  const showProcessing = isProcessing && !sliderBusy

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
        Draw cut regions on the canvas to see live previews here.
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
        <span className="text-sm font-medium text-gray-700">Live preview</span>
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
        <span className="text-sm text-gray-600">
          {showProcessing
            ? 'Updating preview…'
            : total > 0 && current
              ? `Cut ${current.label} (${previewIndex + 1} of ${total})`
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
            pickColorActive={bgColorPickActive}
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

      {total > 1 && !showProcessing && (
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
