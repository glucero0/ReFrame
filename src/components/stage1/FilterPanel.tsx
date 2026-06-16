import { useState } from 'react'
import { useStage1Store } from '../../store/stage1Store'
import { DEFAULT_FILTERS } from '../../lib/regionTypes'
import AdvancedFilterPanel from './AdvancedFilterPanel'

export default function FilterPanel() {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const regions = useStage1Store((s) => s.regions)
  const selectedRegionId = useStage1Store((s) => s.selectedRegionId)
  const regionFilters = useStage1Store((s) => s.regionFilters)
  const setRegionFilters = useStage1Store((s) => s.setRegionFilters)
  const resetRegionFilters = useStage1Store((s) => s.resetRegionFilters)

  const activeRegion =
    regions.find((region) => region.id === selectedRegionId) ?? regions[0]
  const activeRegionId = activeRegion?.id
  const filters = activeRegionId
    ? (regionFilters[activeRegionId] ?? DEFAULT_FILTERS)
    : DEFAULT_FILTERS

  const updateFilters = (partial: Partial<typeof filters>) => {
    if (activeRegionId) setRegionFilters(activeRegionId, partial)
  }

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

  return (
    <div className="space-y-3">
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
