import { useStage1Store } from '../../store/stage1Store'

export default function PaddingControl() {
  const padding = useStage1Store((s) => s.padding)
  const setPadding = useStage1Store((s) => s.setPadding)

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Padding
      </h2>
      <label className="flex items-center gap-2 text-sm">
        <span className="w-16 text-gray-600">Pixels</span>
        <input
          type="number"
          min={0}
          max={200}
          value={padding}
          onChange={(e) => setPadding(Number(e.target.value) || 0)}
          className="w-full rounded border border-gray-300 px-2 py-1"
        />
      </label>
      <p className="text-xs text-gray-500">
        Extra space added around each cut region before export.
      </p>
    </div>
  )
}
