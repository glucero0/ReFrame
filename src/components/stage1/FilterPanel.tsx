import { useEffect, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { useStage1Store } from '../../store/stage1Store'
import { DEFAULT_FILTERS, normalizeFilterSettings } from '../../lib/regionTypes'
import AdvancedFilterPanel from './AdvancedFilterPanel'

// Arrow/Home/End/PageUp/PageDown nudge a range input's value without any
// pointer events, so a held-down key needs to count as "dragging" too (it
// can auto-repeat several regens per second, same as a mouse drag).
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

function isRangeInput(target: EventTarget | null): target is HTMLInputElement {
  return target instanceof HTMLInputElement && target.type === 'range'
}

export default function FilterPanel() {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const regions = useStage1Store((s) => s.regions)
  const selectedRegionId = useStage1Store((s) => s.selectedRegionId)
  const regionFilters = useStage1Store((s) => s.regionFilters)
  const setRegionFilters = useStage1Store((s) => s.setRegionFilters)
  const resetRegionFilters = useStage1Store((s) => s.resetRegionFilters)
  const processedCuts = useStage1Store((s) => s.processedCuts)
  const bgColorPickActive = useStage1Store((s) => s.bgColorPickActive)
  const setBgColorPickActive = useStage1Store((s) => s.setBgColorPickActive)
  const setFilterSliderDragging = useStage1Store((s) => s.setFilterSliderDragging)

  // A pointerup/pointercancel's *target* is hit-tested against whatever is
  // actually under the cursor at release time — during a real drag the
  // cursor easily drifts off the (thin) slider track, so delegating release
  // detection via bubbling from the slider itself missed releases whenever
  // that happened, leaving filterSliderDragging stuck true and the Export
  // panel buttons stuck disabled. Listening on window sidesteps hit-testing
  // entirely: any pointer release anywhere means the drag is over.
  useEffect(() => {
    const clearDragging = () => setFilterSliderDragging(false)
    window.addEventListener('pointerup', clearDragging)
    window.addEventListener('pointercancel', clearDragging)
    return () => {
      window.removeEventListener('pointerup', clearDragging)
      window.removeEventListener('pointercancel', clearDragging)
    }
  }, [setFilterSliderDragging])

  const activeRegion =
    regions.find((region) => region.id === selectedRegionId) ?? regions[0]

  if (regions.length === 0) {
    return (
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Filters
        </h2>
        <p className="text-xs text-gray-500">
          Draw a cut region to adjust filters per image.
        </p>
      </div>
    )
  }

  const activeRegionId = activeRegion?.id
  const filters = activeRegionId
    ? normalizeFilterSettings(regionFilters[activeRegionId] ?? DEFAULT_FILTERS)
    : DEFAULT_FILTERS

  const activeCut = processedCuts.find((cut) => cut.regionId === activeRegionId)
  const autoDetectedColor =
    activeCut != null && activeCut.regionId === activeRegionId
      ? activeCut.detectedBackgroundColor
      : null
  const effectiveBgColor = filters.bgRemoveColor ?? autoDetectedColor

  const rgbToHex = (color: { r: number; g: number; b: number }) => {
    const channel = (value: number) =>
      Math.max(0, Math.min(255, Math.round(value)))
        .toString(16)
        .padStart(2, '0')
    return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`
  }

  const formatRgb = (color: { r: number; g: number; b: number }) => {
    const channel = (value: number) =>
      Number.isFinite(value) ? Math.round(value) : '?'
    return `${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)}`
  }

  const updateFilters = (partial: Partial<typeof filters>) => {
    if (!activeRegionId) return
    setRegionFilters(activeRegionId, partial)
  }

  // Delegated on a single wrapper rather than on each of the ~14 range
  // inputs here and in AdvancedFilterPanel: previews regenerate on every
  // throttled filter edit (~every 100ms while dragging), which was making
  // isProcessing-driven UI elsewhere (e.g. the Export panel buttons) flicker
  // continuously. Marking "a filter slider is being held" for the duration
  // of the drag/keypress lets that UI freeze instead of chasing every tick.
  // Only *starting* a drag is delegated this way — pointerdown's target is
  // hit-tested at the press location, which is reliably the slider the user
  // just grabbed. Ending it is handled by the window listener above instead
  // (see the comment there for why).
  const onSliderPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isRangeInput(event.target)) setFilterSliderDragging(true)
  }
  const onSliderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isRangeInput(event.target) && RANGE_KEYS.has(event.key)) setFilterSliderDragging(true)
  }
  const onSliderKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isRangeInput(event.target) && RANGE_KEYS.has(event.key)) setFilterSliderDragging(false)
  }
  const onSliderBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (isRangeInput(event.target)) setFilterSliderDragging(false)
  }

  return (
    <div
      className="space-y-3"
      onPointerDown={onSliderPointerDown}
      onKeyDown={onSliderKeyDown}
      onKeyUp={onSliderKeyUp}
      onBlurCapture={onSliderBlur}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Filters
        </h2>
        {activeRegion && (
          <span className="text-xs text-gray-600">Image {activeRegion.label}</span>
        )}
      </div>
      <p className="text-xs text-gray-500">
        Adjustments apply only to the cutout selected on the canvas or in the preview.
      </p>

      <label className="block text-sm">
        <span className="text-gray-600">Brightness ({filters.brightness})</span>
        <input
          type="range"
          min={-100}
          max={100}
          value={filters.brightness}
          disabled={!activeRegionId}
          onChange={(e) => updateFilters({ brightness: Number(e.target.value) })}
          onInput={(e) => updateFilters({ brightness: Number(e.currentTarget.value) })}
          className="w-full"
        />
      </label>
      <label className="block text-sm">
        <span className="text-gray-600">Contrast ({filters.contrast})</span>
        <input
          type="range"
          min={-100}
          max={100}
          value={filters.contrast}
          disabled={!activeRegionId}
          onChange={(e) => updateFilters({ contrast: Number(e.target.value) })}
          onInput={(e) => updateFilters({ contrast: Number(e.currentTarget.value) })}
          className="w-full"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.grayscale}
          disabled={!activeRegionId}
          onChange={(e) => updateFilters({ grayscale: e.target.checked })}
        />
        Grayscale
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.threshold}
          disabled={!activeRegionId}
          onChange={(e) => updateFilters({ threshold: e.target.checked })}
        />
        Threshold (lighten background)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.sharpen}
          disabled={!activeRegionId}
          onChange={(e) => updateFilters({ sharpen: e.target.checked })}
        />
        Sharpen
      </label>

      <div className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Background removal
        </h3>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={filters.bgRemove}
            disabled={!activeRegionId}
            onChange={(e) =>
              updateFilters({
                bgRemove: e.target.checked,
                ...(e.target.checked ? {} : { bgRemoveColor: null }),
              })
            }
          />
          Make background transparent
        </label>
        {filters.bgRemove && (
          <>
            <label className="block text-sm">
              <span className="text-gray-600">
                Similarity ({filters.bgRemoveTolerance})
              </span>
              <input
                type="range"
                min={5}
                max={100}
                value={filters.bgRemoveTolerance}
                disabled={!activeRegionId}
                onChange={(e) =>
                  updateFilters({ bgRemoveTolerance: Number(e.target.value) })
                }
                onInput={(e) =>
                  updateFilters({ bgRemoveTolerance: Number(e.currentTarget.value) })
                }
                className="w-full"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.bgRemoveFromEdges}
                disabled={!activeRegionId}
                onChange={(e) =>
                  updateFilters({ bgRemoveFromEdges: e.target.checked })
                }
              />
              Remove from edges only (keeps matching color inside the subject)
            </label>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-600">Background color</span>
              {filters.bgRemoveColor ? (
                <input
                  type="color"
                  value={rgbToHex(filters.bgRemoveColor)}
                  disabled={!activeRegionId}
                  onChange={(e) => {
                    const hex = e.target.value
                    updateFilters({
                      bgRemoveColor: {
                        r: Number.parseInt(hex.slice(1, 3), 16),
                        g: Number.parseInt(hex.slice(3, 5), 16),
                        b: Number.parseInt(hex.slice(5, 7), 16),
                      },
                    })
                  }}
                  onInput={(e) => {
                    const hex = e.currentTarget.value
                    updateFilters({
                      bgRemoveColor: {
                        r: Number.parseInt(hex.slice(1, 3), 16),
                        g: Number.parseInt(hex.slice(3, 5), 16),
                        b: Number.parseInt(hex.slice(5, 7), 16),
                      },
                    })
                  }}
                />
              ) : (
                <span className="inline-flex items-center gap-2 text-xs text-gray-600">
                  <span
                    className="inline-block h-5 w-5 rounded border border-gray-300"
                    style={{
                      backgroundColor: effectiveBgColor
                        ? rgbToHex(effectiveBgColor)
                        : '#ffffff',
                    }}
                  />
                  Auto
                  {effectiveBgColor
                    ? ` (${formatRgb(effectiveBgColor)})`
                    : ''}
                </span>
              )}
              <button
                type="button"
                disabled={!activeRegionId}
                className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs hover:bg-gray-100 disabled:opacity-40"
                onClick={() => updateFilters({ bgRemoveColor: null })}
              >
                Auto
              </button>
              <button
                type="button"
                disabled={!activeRegionId}
                className={`rounded border px-2 py-0.5 text-xs disabled:opacity-40 ${
                  bgColorPickActive
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-gray-300 bg-white hover:bg-gray-100'
                }`}
                onClick={() => setBgColorPickActive(!bgColorPickActive)}
              >
                {bgColorPickActive ? 'Cancel pick' : 'Pick from original'}
              </button>
            </div>
            {bgColorPickActive && (
              <p className="text-xs text-blue-700">
                Click the background in the original preview on the right.
              </p>
            )}
            <p className="text-xs text-gray-500">
              Matching pixels become transparent in the preview checkerboard. Increase
              similarity to remove more of the background; decrease to protect the
              subject. Exports as PNG.
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        disabled={!activeRegionId}
        className="flex w-full items-center justify-between rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
        onClick={() => setShowAdvanced((open) => !open)}
        aria-expanded={showAdvanced}
      >
        <span>Advanced filters</span>
        <span className="text-gray-400">{showAdvanced ? '▲' : '▼'}</span>
      </button>

      {showAdvanced && (
        <AdvancedFilterPanel
          filters={filters}
          disabled={!activeRegionId}
          onChange={updateFilters}
        />
      )}

      <button
        type="button"
        disabled={!activeRegionId}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
        onClick={() => activeRegionId && resetRegionFilters(activeRegionId)}
      >
        Reset filters for this image
      </button>
    </div>
  )
}
