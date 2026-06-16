import { useStage1Store } from '../../store/stage1Store'

export default function RegionToolbar() {
  const activeTool = useStage1Store((s) => s.activeTool)
  const setActiveTool = useStage1Store((s) => s.setActiveTool)
  const regions = useStage1Store((s) => s.regions)
  const undo = useStage1Store((s) => s.undo)
  const undoStack = useStage1Store((s) => s.undoStack)
  const sourceImage = useStage1Store((s) => s.sourceImage)

  const toolClass = (tool: typeof activeTool) =>
    activeTool === tool
      ? 'bg-blue-600 text-white'
      : 'bg-white text-gray-800 hover:bg-gray-50'

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Cut tools
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={!sourceImage}
          className={`rounded border border-gray-300 px-2 py-2 text-xs ${toolClass('select')}`}
          onClick={() => setActiveTool('select')}
          title="Select and edit regions"
        >
          Select
        </button>
        <button
          type="button"
          disabled={!sourceImage}
          className={`rounded border border-gray-300 px-2 py-2 text-xs ${toolClass('rect')}`}
          onClick={() => setActiveTool('rect')}
          title="Draw rectangle (Shift = square)"
        >
          □ Rect
        </button>
        <button
          type="button"
          disabled={!sourceImage}
          className={`rounded border border-gray-300 px-2 py-2 text-xs ${toolClass('ellipse')}`}
          onClick={() => setActiveTool('ellipse')}
          title="Draw oval (Shift = circle)"
        >
          ○ Oval
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Hold Shift while drawing to constrain to a square or circle.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={undoStack.length === 0}
          className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50 disabled:opacity-40"
          onClick={undo}
        >
          Undo
        </button>
      </div>
      <p className="text-xs text-gray-600">
        {regions.length} region{regions.length === 1 ? '' : 's'} defined
      </p>
      {regions.length > 0 && (
        <ul className="max-h-24 overflow-y-auto text-xs text-gray-600">
          {regions.map((r) => (
            <li key={r.id}>
              #{r.label} — {r.type === 'rect' ? 'Rectangle' : 'Oval'}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
