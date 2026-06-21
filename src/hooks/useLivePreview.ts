import { useEffect, useRef } from 'react'
import { useStage1Store } from '../store/stage1Store'

const PREVIEW_THROTTLE_MS = 100

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

  const lastRunRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }

    if (!sourceImage || regions.length === 0) {
      void regeneratePreviews()
      return
    }

    const run = () => {
      lastRunRef.current = Date.now()
      timerRef.current = null
      void regeneratePreviews()
    }

    const elapsed = Date.now() - lastRunRef.current
    if (elapsed >= PREVIEW_THROTTLE_MS) {
      run()
      return
    }

    timerRef.current = window.setTimeout(run, PREVIEW_THROTTLE_MS - elapsed)

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current)
        timerRef.current = null
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
