import { useCallback, useEffect, useRef, useState } from 'react'
import ImageInput from './ImageInput'
import RegionToolbar from './RegionToolbar'
import PaddingControl from './PaddingControl'
import FilterPanel from './FilterPanel'
import ExportPanel from './ExportPanel'
import ImagePreviewer from './ImagePreviewer'
import SegmentationCanvas from './SegmentationCanvas'
import { useLivePreview } from '../../hooks/useLivePreview'

const DEFAULT_PREVIEW_SHARE = 0.32
const MIN_PREVIEW_SHARE = 0.15
const MAX_PREVIEW_SHARE = 0.85
const DIVIDER_HEIGHT_PX = 12

export default function StageOne() {
  useLivePreview()
  const mainRef = useRef<HTMLElement>(null)
  const [previewShare, setPreviewShare] = useState(DEFAULT_PREVIEW_SHARE)
  const draggingRef = useRef(false)

  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
  }, [])

  const onDividerDoubleClick = useCallback(() => {
    setPreviewShare(DEFAULT_PREVIEW_SHARE)
  }, [])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const main = mainRef.current
      if (!main) return

      const rect = main.getBoundingClientRect()
      const canvasFraction = (e.clientY - rect.top) / rect.height
      const share =
        1 - canvasFraction - DIVIDER_HEIGHT_PX / rect.height
      setPreviewShare(
        Math.max(MIN_PREVIEW_SHARE, Math.min(MAX_PREVIEW_SHARE, share)),
      )
    }

    const onMouseUp = () => {
      draggingRef.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="shrink-0 border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">ReFrame — Stage 1: Cut Apart</h1>
        <p className="text-sm text-gray-500">
          Upload or paste a composite image, draw rectangle or oval cut regions, preview, and
          export a ZIP.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden lg:flex-row">
        <aside className="w-full shrink-0 space-y-6 overflow-y-auto border-b border-gray-200 bg-white p-4 lg:w-72 lg:border-b-0 lg:border-r">
          <ImageInput />
          <RegionToolbar />
          <PaddingControl />
          <FilterPanel />
          <ExportPanel />
        </aside>

        <main
          ref={mainRef}
          className="grid min-h-0 min-w-0 flex-1 overflow-hidden"
          style={{
            gridTemplateRows: `${1 - previewShare}fr ${DIVIDER_HEIGHT_PX}px ${previewShare}fr`,
          }}
        >
          <div className="min-h-0 overflow-hidden p-4">
            <SegmentationCanvas />
          </div>

          <div
            role="separator"
            aria-orientation="horizontal"
            aria-valuenow={Math.round(previewShare * 100)}
            aria-valuemin={MIN_PREVIEW_SHARE * 100}
            aria-valuemax={MAX_PREVIEW_SHARE * 100}
            aria-label="Resize cutout tray panel"
            title="Drag to resize cutout tray. Double-click to reset."
            onMouseDown={onDividerMouseDown}
            onDoubleClick={onDividerDoubleClick}
            className="group flex cursor-row-resize items-center justify-center border-y border-gray-200 bg-gray-100 hover:bg-gray-200"
          >
            <div className="h-1 w-12 rounded-full bg-gray-400 group-hover:bg-gray-500" />
          </div>

          <div className="min-h-0 overflow-hidden">
            <ImagePreviewer fillHeight />
          </div>
        </main>
      </div>
    </div>
  )
}
