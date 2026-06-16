import { useEffect, useRef } from 'react'
import { useStage1Store } from '../store/stage1Store'

const DEBOUNCE_MS = 250

/** Keeps cut previews in sync with regions, padding, per-region filters, and export format. */
export function useLivePreview() {
  const sourceImage = useStage1Store((s) => s.sourceImage)
  const regions = useStage1Store((s) => s.regions)
  const padding = useStage1Store((s) => s.padding)
  const regionFilters = useStage1Store((s) => s.regionFilters)
  const exportFormat = useStage1Store((s) => s.exportFormat)
  const regeneratePreviews = useStage1Store((s) => s.regeneratePreviews)

  const regionsKey = regions.map((r) => JSON.stringify(r)).join('|')
  const filtersKey = JSON.stringify(regionFilters)

  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!sourceImage || regions.length === 0) {
      void regeneratePreviews()
      return
    }

    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
    }

    timerRef.current = window.setTimeout(() => {
      void regeneratePreviews()
    }, DEBOUNCE_MS)

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
      }
    }
  }, [
    sourceImage,
    regions.length,
    regionsKey,
    padding,
    filtersKey,
    exportFormat,
    regeneratePreviews,
  ])
}
