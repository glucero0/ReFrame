import { useEffect, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react'
import type { Rgb } from '../../lib/backgroundRemoval'
import type { FilterSettings } from '../../lib/regionTypes'
import { DEFAULT_FILTERS } from '../../lib/regionTypes'
import AdvancedFilterPanel from './AdvancedFilterPanel'

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

function rgbToHex(color: { r: number; g: number; b: number }): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0')
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`
}

function formatRgb(color: { r: number; g: number; b: number }): string {
  const channel = (value: number) => (Number.isFinite(value) ? Math.round(value) : '?')
  return `${channel(color.r)}, ${channel(color.g)}, ${channel(color.b)}`
}

export type CutoutFilterControlsProps = {
  filters: FilterSettings
  disabled?: boolean
  label?: string
  helpText?: string
  detectedBackgroundColor?: Rgb | null
  showAdvanced: boolean
  onToggleAdvanced: () => void
  onChange: (partial: Partial<FilterSettings>) => void
  onReset: () => void
  bgColorPickActive?: boolean
  onBgColorPickToggle?: () => void
  pickColorHelpText?: string
  onSliderDraggingChange?: (dragging: boolean) => void
}

export default function CutoutFilterControls({
  filters,
  disabled = false,
  label,
  helpText = 'Adjustments apply to the selected cutout.',
  detectedBackgroundColor = null,
  showAdvanced,
  onToggleAdvanced,
  onChange,
  onReset,
  bgColorPickActive = false,
  onBgColorPickToggle,
  pickColorHelpText = 'Click the original preview to pick a background color.',
  onSliderDraggingChange,
}: CutoutFilterControlsProps) {
  useEffect(() => {
    if (!onSliderDraggingChange) return
    const clearDragging = () => onSliderDraggingChange(false)
    window.addEventListener('pointerup', clearDragging)
    window.addEventListener('pointercancel', clearDragging)
    return () => {
      window.removeEventListener('pointerup', clearDragging)
      window.removeEventListener('pointercancel', clearDragging)
    }
  }, [onSliderDraggingChange])

  const effectiveBgColor = filters.bgRemoveColor ?? detectedBackgroundColor

  const onSliderPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isRangeInput(event.target)) onSliderDraggingChange?.(true)
  }
  const onSliderKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isRangeInput(event.target) && RANGE_KEYS.has(event.key)) onSliderDraggingChange?.(true)
  }
  const onSliderKeyUp = (event: KeyboardEvent<HTMLDivElement>) => {
    if (isRangeInput(event.target) && RANGE_KEYS.has(event.key)) onSliderDraggingChange?.(false)
  }
  const onSliderBlur = (event: FocusEvent<HTMLDivElement>) => {
    if (isRangeInput(event.target)) onSliderDraggingChange?.(false)
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Filters</h2>
        {label ? <span className="text-xs text-gray-600">{label}</span> : null}
      </div>
      <p className="text-xs text-gray-500">{helpText}</p>

      <label className="block text-sm">
        <span className="text-gray-600">Brightness ({filters.brightness})</span>
        <input
          type="range"
          min={-100}
          max={100}
          value={filters.brightness}
          disabled={disabled}
          onChange={(e) => onChange({ brightness: Number(e.target.value) })}
          onInput={(e) => onChange({ brightness: Number(e.currentTarget.value) })}
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
          disabled={disabled}
          onChange={(e) => onChange({ contrast: Number(e.target.value) })}
          onInput={(e) => onChange({ contrast: Number(e.currentTarget.value) })}
          className="w-full"
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.grayscale}
          disabled={disabled}
          onChange={(e) => onChange({ grayscale: e.target.checked })}
        />
        Grayscale
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.threshold}
          disabled={disabled}
          onChange={(e) => onChange({ threshold: e.target.checked })}
        />
        Threshold (lighten background)
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.sharpen}
          disabled={disabled}
          onChange={(e) => onChange({ sharpen: e.target.checked })}
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
            disabled={disabled}
            onChange={(e) =>
              onChange({
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
              <span className="text-gray-600">Similarity ({filters.bgRemoveTolerance})</span>
              <input
                type="range"
                min={5}
                max={100}
                value={filters.bgRemoveTolerance}
                disabled={disabled}
                onChange={(e) => onChange({ bgRemoveTolerance: Number(e.target.value) })}
                onInput={(e) => onChange({ bgRemoveTolerance: Number(e.currentTarget.value) })}
                className="w-full"
              />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.bgRemoveFromEdges}
                disabled={disabled}
                onChange={(e) => onChange({ bgRemoveFromEdges: e.target.checked })}
              />
              Remove from edges only (keeps matching color inside the subject)
            </label>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-600">Background color</span>
              {filters.bgRemoveColor ? (
                <input
                  type="color"
                  value={rgbToHex(filters.bgRemoveColor)}
                  disabled={disabled}
                  onChange={(e) => {
                    const hex = e.target.value
                    onChange({
                      bgRemoveColor: {
                        r: Number.parseInt(hex.slice(1, 3), 16),
                        g: Number.parseInt(hex.slice(3, 5), 16),
                        b: Number.parseInt(hex.slice(5, 7), 16),
                      },
                    })
                  }}
                  onInput={(e) => {
                    const hex = e.currentTarget.value
                    onChange({
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
                      backgroundColor: effectiveBgColor ? rgbToHex(effectiveBgColor) : '#ffffff',
                    }}
                  />
                  Auto
                  {effectiveBgColor ? ` (${formatRgb(effectiveBgColor)})` : ''}
                </span>
              )}
              <button
                type="button"
                disabled={disabled}
                className="rounded border border-gray-300 bg-white px-2 py-0.5 text-xs hover:bg-gray-100 disabled:opacity-40"
                onClick={() => onChange({ bgRemoveColor: null })}
              >
                Auto
              </button>
              {onBgColorPickToggle ? (
                <button
                  type="button"
                  disabled={disabled}
                  className={`rounded border px-2 py-0.5 text-xs disabled:opacity-40 ${
                    bgColorPickActive
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-gray-300 bg-white hover:bg-gray-100'
                  }`}
                  onClick={onBgColorPickToggle}
                >
                  {bgColorPickActive ? 'Cancel pick' : 'Pick from original'}
                </button>
              ) : null}
            </div>
            {bgColorPickActive && pickColorHelpText ? (
              <p className="text-xs text-blue-700">{pickColorHelpText}</p>
            ) : null}
            <p className="text-xs text-gray-500">
              Matching pixels become transparent in the preview checkerboard. Increase similarity
              to remove more of the background; decrease to protect the subject. Exports as PNG.
            </p>
          </>
        )}
      </div>

      <button
        type="button"
        disabled={disabled}
        className="flex w-full items-center justify-between rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
        onClick={onToggleAdvanced}
        aria-expanded={showAdvanced}
      >
        <span>Advanced filters</span>
        <span className="text-gray-400">{showAdvanced ? '▲' : '▼'}</span>
      </button>

      {showAdvanced && (
        <AdvancedFilterPanel
          filters={filters}
          disabled={disabled}
          onChange={onChange}
        />
      )}

      <button
        type="button"
        disabled={disabled}
        className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
        onClick={onReset}
      >
        Reset filters for this image
      </button>
    </div>
  )
}

export { DEFAULT_FILTERS }
