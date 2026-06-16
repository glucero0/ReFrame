import { useStage1Store } from '../../store/stage1Store'
import { useStage2Store } from '../../store/stage2Store'

export default function CutoutStrip() {
  const processedCuts = useStage1Store((s) => s.processedCuts)
  const addCutoutToLayout = useStage2Store((s) => s.addCutoutToLayout)
  const addAllCutoutsToLayout = useStage2Store((s) => s.addAllCutoutsToLayout)

  if (processedCuts.length === 0) {
    return (
      <section className="rounded border border-dashed border-gray-300 bg-white p-4 text-sm text-gray-500">
        No cutouts available. Go back to Stage 1 and define cut regions first.
      </section>
    )
  }

  return (
    <section className="rounded border border-gray-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Your cutouts</h2>
          <p className="text-xs text-gray-500">
            Drag a cutout onto the layout below, click Add, or add all at once.
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-50"
          onClick={addAllCutoutsToLayout}
        >
          Add all to layout
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {processedCuts.map((cut) => (
          <div
            key={cut.regionId}
            className="flex w-28 shrink-0 flex-col items-center gap-1 rounded border border-gray-200 bg-gray-50 p-2"
          >
            <img
              src={cut.previewUrl}
              alt={`Cut ${cut.label}`}
              draggable
              className="h-20 w-full cursor-grab object-contain active:cursor-grabbing"
              onDragStart={(e) => {
                e.dataTransfer.setData('application/x-reframe-cutout', cut.regionId)
                e.dataTransfer.setData('text/plain', cut.previewUrl)
                e.dataTransfer.effectAllowed = 'copy'
              }}
            />
            <span className="text-xs text-gray-600">#{cut.label}</span>
            <button
              type="button"
              className="w-full rounded border border-gray-300 bg-white px-1 py-0.5 text-xs hover:bg-gray-100"
              onClick={() => addCutoutToLayout(cut.regionId)}
            >
              Add
            </button>
          </div>
        ))}
      </div>
    </section>
  )
}
