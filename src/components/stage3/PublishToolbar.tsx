import { useState } from 'react'
import type { Canvas } from 'fabric'
import { useAppStore } from '../../store/appStore'
import { useStage3Store } from '../../store/stage3Store'
import {
  PUBLISH_DPI_OPTIONS,
  PIXEL_SIZE_PRESETS,
  PRINT_SIZE_PRESETS,
  type ImageExportFormat,
  type PublishDpi,
  type SizePresetId,
} from '../../lib/stage3Types'
import { computeExportDimensions } from '../../lib/stage3Export'
import { downloadLayoutImage, downloadLayoutPdf } from '../../lib/stage3Download'
import { STAGE2_CANVAS_HEIGHT, STAGE2_CANVAS_WIDTH } from '../../lib/stage2Types'

type PublishToolbarProps = {
  fabricRef: React.RefObject<Canvas | null>
  canvasReady: boolean
}

export default function PublishToolbar({
  fabricRef,
  canvasReady,
}: PublishToolbarProps) {
  const returnToLayout = useAppStore((s) => s.returnToLayout)
  const sizePresetId = useStage3Store((s) => s.sizePresetId)
  const customWidth = useStage3Store((s) => s.customWidth)
  const customHeight = useStage3Store((s) => s.customHeight)
  const dpi = useStage3Store((s) => s.dpi)
  const imageFormat = useStage3Store((s) => s.imageFormat)
  const isExporting = useStage3Store((s) => s.isExporting)
  const setSizePresetId = useStage3Store((s) => s.setSizePresetId)
  const setCustomWidth = useStage3Store((s) => s.setCustomWidth)
  const setCustomHeight = useStage3Store((s) => s.setCustomHeight)
  const setDpi = useStage3Store((s) => s.setDpi)
  const setImageFormat = useStage3Store((s) => s.setImageFormat)
  const setIsExporting = useStage3Store((s) => s.setIsExporting)

  const [exportError, setExportError] = useState<string | null>(null)

  const previewDimensions = computeExportDimensions(
    sizePresetId,
    customWidth,
    customHeight,
    dpi,
    false,
  )

  const exportOptions = {
    presetId: sizePresetId,
    customWidth,
    customHeight,
    dpi,
    layoutWidth: STAGE2_CANVAS_WIDTH,
    layoutHeight: STAGE2_CANVAS_HEIGHT,
  }

  const runExport = async (action: 'image' | 'pdf') => {
    const canvas = fabricRef.current
    if (!canvas || !canvasReady) return
    setExportError(null)
    setIsExporting(true)
    try {
      if (action === 'image') {
        await downloadLayoutImage(canvas, { ...exportOptions, format: imageFormat })
      } else {
        await downloadLayoutPdf(canvas, exportOptions)
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          onClick={returnToLayout}
        >
          ← Back to Layout
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Size
        </h2>
        <label className="block text-sm">
          <span className="text-gray-600">Preset</span>
          <select
            value={sizePresetId}
            onChange={(e) => setSizePresetId(e.target.value as SizePresetId)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          >
            <optgroup label="Digital">
              {PIXEL_SIZE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Print page">
              {PRINT_SIZE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </optgroup>
            <option value="custom">Custom (pixels)</option>
          </select>
        </label>

        {sizePresetId === 'custom' && (
          <div className="grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="text-gray-600">Width</span>
              <input
                type="number"
                min={1}
                value={customWidth}
                onChange={(e) => setCustomWidth(Number(e.target.value) || 1)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
            <label className="block text-sm">
              <span className="text-gray-600">Height</span>
              <input
                type="number"
                min={1}
                value={customHeight}
                onChange={(e) => setCustomHeight(Number(e.target.value) || 1)}
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
              />
            </label>
          </div>
        )}

        <label className="block text-sm">
          <span className="text-gray-600">Print quality (DPI)</span>
          <select
            value={dpi}
            onChange={(e) => setDpi(Number(e.target.value) as PublishDpi)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          >
            {PUBLISH_DPI_OPTIONS.map((value) => (
              <option key={value} value={value}>
                {value} DPI
              </option>
            ))}
          </select>
        </label>

        <p className="text-xs text-gray-500">
          Export size: {previewDimensions.pixelWidth}×{previewDimensions.pixelHeight} px
          (layout {STAGE2_CANVAS_WIDTH}×{STAGE2_CANVAS_HEIGHT} scaled to fit).
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Save as image
        </h2>
        <label className="block text-sm">
          <span className="text-gray-600">Format</span>
          <select
            value={imageFormat}
            onChange={(e) => setImageFormat(e.target.value as ImageExportFormat)}
            className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
          >
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </label>
        <button
          type="button"
          disabled={!canvasReady || isExporting}
          className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
          onClick={() => void runExport('image')}
        >
          {isExporting ? 'Exporting…' : 'Download image'}
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Save as PDF
        </h2>
        <p className="text-xs text-gray-500">
          PDF uses the selected page or pixel preset and DPI. Layout is rasterized at
          export quality.
        </p>
        <button
          type="button"
          disabled={!canvasReady || isExporting}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
          onClick={() => void runExport('pdf')}
        >
          Download PDF
        </button>
      </div>

      {exportError && <p className="text-xs text-red-600">{exportError}</p>}
    </div>
  )
}
