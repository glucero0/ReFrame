import { useState } from 'react'
import { useAppStore } from '../../store/appStore'
import { useStage1Store } from '../../store/stage1Store'
import { downloadCutsAsZip } from '../../lib/exportZip'
import ManageCutoutsDialog from './ManageCutoutsDialog'

export default function ExportPanel() {
  const cutApart = useStage1Store((s) => s.cutApart)
  const processedCuts = useStage1Store((s) => s.processedCuts)
  const exportFormat = useStage1Store((s) => s.exportFormat)
  const setExportFormat = useStage1Store((s) => s.setExportFormat)
  const regions = useStage1Store((s) => s.regions)
  const isProcessing = useStage1Store((s) => s.isProcessing)
  const filterSliderDragging = useStage1Store((s) => s.filterSliderDragging)
  const sourceImage = useStage1Store((s) => s.sourceImage)
  const goToStage2 = useAppStore((s) => s.goToStage2)

  const [stage2Error, setStage2Error] = useState<string | null>(null)
  const [manageOpen, setManageOpen] = useState(false)

  // While a filter slider is held, previews keep regenerating on every
  // throttled tick, flipping isProcessing true/false continuously — which
  // made these buttons flicker enabled/disabled the whole time the user was
  // dragging. Treat the entire hold as "busy" so they stay put until the
  // user releases and the (fast) final regen settles.
  const busy = isProcessing || filterSliderDragging

  const handleCutApart = () => void cutApart()

  const handleDownload = () => {
    if (processedCuts.length === 0) return
    void downloadCutsAsZip(processedCuts, exportFormat)
  }

  const handleGoToStage2 = async () => {
    setStage2Error(null)
    const ok = await goToStage2()
    if (!ok) {
      setStage2Error('Add at least one cutout before continuing to Layout.')
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Export
      </h2>
      <label className="block text-sm">
        <span className="text-gray-600">Format</span>
        <select
          value={exportFormat}
          onChange={(e) =>
            setExportFormat(e.target.value as 'png' | 'jpg')
          }
          className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
        >
          <option value="png">PNG (supports transparency)</option>
          <option value="jpg">JPG (white background)</option>
        </select>
      </label>
      {exportFormat === 'jpg' && (
        <p className="text-xs text-amber-700">
          JPG cannot preserve transparency. Cuts with background removal still export
          as PNG inside the ZIP.
        </p>
      )}
      <button
        type="button"
        disabled={!sourceImage || regions.length === 0 || busy}
        className="w-full rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
        onClick={handleCutApart}
      >
        {busy ? 'Updating…' : 'Refresh preview'}
      </button>
      <button
        type="button"
        disabled={processedCuts.length === 0 || busy}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
        onClick={handleDownload}
      >
        Download ZIP
      </button>
      <button
        type="button"
        disabled={busy}
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-40"
        onClick={() => setManageOpen(true)}
      >
        Manage cutouts
      </button>
      {manageOpen && <ManageCutoutsDialog onClose={() => setManageOpen(false)} />}
      <button
        type="button"
        disabled={(regions.length === 0 && processedCuts.length === 0) || busy}
        className="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
        onClick={() => void handleGoToStage2()}
      >
        Continue to Layout
      </button>
      {stage2Error && <p className="text-xs text-red-600">{stage2Error}</p>}
      <p className="text-xs text-gray-500">
        Previews update live as you edit. Manage cutouts loads a folder library, or use
        Continue to Layout to arrange them.
      </p>
    </div>
  )
}
