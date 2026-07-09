import { useState } from 'react'
import { useStage1Store } from '../../store/stage1Store'
import { DEFAULT_FILTERS, normalizeFilterSettings } from '../../lib/regionTypes'
import CutoutFilterControls from './CutoutFilterControls'

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

  const updateFilters = (partial: Partial<typeof filters>) => {
    if (!activeRegionId) return
    setRegionFilters(activeRegionId, partial)
  }

  return (
    <CutoutFilterControls
      filters={filters}
      disabled={!activeRegionId}
      label={activeRegion ? `Image ${activeRegion.label}` : undefined}
      helpText="Adjustments apply only to the cutout selected on the canvas or in the preview."
      detectedBackgroundColor={autoDetectedColor}
      showAdvanced={showAdvanced}
      onToggleAdvanced={() => setShowAdvanced((open) => !open)}
      onChange={updateFilters}
      onReset={() => activeRegionId && resetRegionFilters(activeRegionId)}
      bgColorPickActive={bgColorPickActive}
      onBgColorPickToggle={() => setBgColorPickActive(!bgColorPickActive)}
      pickColorHelpText="Click the background in the original preview on the right."
      onSliderDraggingChange={setFilterSliderDragging}
    />
  )
}
