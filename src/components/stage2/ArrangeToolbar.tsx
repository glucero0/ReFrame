import { useAppStore } from '../../store/appStore'
import { useStage2Store } from '../../store/stage2Store'
import { layoutJsonHasContent } from '../../lib/stage3Export'
import { STAGE2_FONTS, type Stage2Font } from '../../lib/stage2Types'

export default function ArrangeToolbar() {
  const goToStage1 = useAppStore((s) => s.goToStage1)
  const goToStage3 = useAppStore((s) => s.goToStage3)
  const stage2CanvasJson = useStage2Store((s) => s.stage2CanvasJson)
  const canPublish = layoutJsonHasContent(stage2CanvasJson)
  const stage2ActiveTool = useStage2Store((s) => s.stage2ActiveTool)
  const setStage2ActiveTool = useStage2Store((s) => s.setStage2ActiveTool)
  const requestStage2Rearrange = useStage2Store((s) => s.requestStage2Rearrange)
  const requestStage2AddText = useStage2Store((s) => s.requestStage2AddText)
  const requestStage2DeleteSelection = useStage2Store((s) => s.requestStage2DeleteSelection)
  const stage2Selection = useStage2Store((s) => s.stage2Selection)
  const stage2TextFont = useStage2Store((s) => s.stage2TextFont)
  const stage2TextSize = useStage2Store((s) => s.stage2TextSize)
  const stage2TextColor = useStage2Store((s) => s.stage2TextColor)
  const setStage2TextFont = useStage2Store((s) => s.setStage2TextFont)
  const setStage2TextSize = useStage2Store((s) => s.setStage2TextSize)
  const setStage2TextColor = useStage2Store((s) => s.setStage2TextColor)
  const stage2ShapeFill = useStage2Store((s) => s.stage2ShapeFill)
  const stage2ShapeStroke = useStage2Store((s) => s.stage2ShapeStroke)
  const stage2ShapeTransparentFill = useStage2Store((s) => s.stage2ShapeTransparentFill)
  const setStage2ShapeFill = useStage2Store((s) => s.setStage2ShapeFill)
  const setStage2ShapeStroke = useStage2Store((s) => s.setStage2ShapeStroke)
  const setStage2ShapeTransparentFill = useStage2Store(
    (s) => s.setStage2ShapeTransparentFill,
  )
  const stage2GridSize = useStage2Store((s) => s.stage2GridSize)
  const stage2ShowGrid = useStage2Store((s) => s.stage2ShowGrid)
  const stage2SnapToGrid = useStage2Store((s) => s.stage2SnapToGrid)
  const stage2AutofitToGrid = useStage2Store((s) => s.stage2AutofitToGrid)
  const setStage2GridSize = useStage2Store((s) => s.setStage2GridSize)
  const setStage2ShowGrid = useStage2Store((s) => s.setStage2ShowGrid)
  const setStage2SnapToGrid = useStage2Store((s) => s.setStage2SnapToGrid)
  const setStage2AutofitToGrid = useStage2Store((s) => s.setStage2AutofitToGrid)

  const toolClass = (tool: typeof stage2ActiveTool) =>
    stage2ActiveTool === tool
      ? 'bg-blue-600 text-white'
      : 'bg-white text-gray-800 hover:bg-gray-50'

  return (
    <div className="space-y-5">
      <div>
        <button
          type="button"
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
          onClick={goToStage1}
        >
          ← Back to Cutout
        </button>
        <button
          type="button"
          disabled={!canPublish}
          className="mt-2 w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
          onClick={() => {
            if (!goToStage3()) return
          }}
        >
          Continue to Publish
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Grid
        </h2>
        <p className="text-xs text-gray-500">
          Align cutouts to the layout grid. Snap moves items to grid lines; autofit
          scales cutouts to fit one cell.
        </p>
        <label className="block text-sm">
          <span className="text-gray-600">Cell size ({stage2GridSize}px)</span>
          <input
            type="range"
            min={20}
            max={100}
            step={5}
            value={stage2GridSize}
            onChange={(e) => setStage2GridSize(Number(e.target.value))}
            className="w-full"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={stage2ShowGrid}
            onChange={(e) => setStage2ShowGrid(e.target.checked)}
          />
          Show grid
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={stage2SnapToGrid}
            onChange={(e) => setStage2SnapToGrid(e.target.checked)}
          />
          Snap to grid
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={stage2AutofitToGrid}
            onChange={(e) => setStage2AutofitToGrid(e.target.checked)}
          />
          Autofit cutouts to grid cells
        </label>
        <button
          type="button"
          className="w-full rounded border border-gray-300 bg-white px-2 py-1 text-xs hover:bg-gray-50"
          onClick={requestStage2Rearrange}
        >
          Snap all cutouts to grid
        </button>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Tools
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`rounded border border-gray-300 px-2 py-2 text-xs ${toolClass('select')}`}
            onClick={() => setStage2ActiveTool('select')}
          >
            Select / Move
          </button>
          <button
            type="button"
            className="rounded border border-gray-300 bg-white px-2 py-2 text-xs hover:bg-gray-50"
            onClick={requestStage2AddText}
          >
            Add text
          </button>
          <button
            type="button"
            className={`rounded border border-gray-300 px-2 py-2 text-xs ${toolClass('rect')}`}
            onClick={() => setStage2ActiveTool('rect')}
          >
            □ Rectangle
          </button>
          <button
            type="button"
            className={`rounded border border-gray-300 px-2 py-2 text-xs ${toolClass('ellipse')}`}
            onClick={() => setStage2ActiveTool('ellipse')}
          >
            ○ Oval
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Draw shapes on the canvas (Shift = square/circle). Select a text block to
          change font, size, and color. Delete or Backspace removes the selection
          (Escape exits text editing).
        </p>
        <button
          type="button"
          disabled={stage2Selection === null}
          className="w-full rounded border border-red-200 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-40"
          onClick={requestStage2DeleteSelection}
        >
          Delete selection
        </button>
      </div>

      {stage2Selection === 'text' && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Text formatting
          </h2>
          <label className="block text-sm">
            <span className="text-gray-600">Font</span>
            <select
              value={stage2TextFont}
              onChange={(e) =>
                setStage2TextFont(e.target.value as Stage2Font)
              }
              className="mt-1 w-full rounded border border-gray-300 px-2 py-1"
            >
              {STAGE2_FONTS.map((font) => (
                <option key={font} value={font}>
                  {font}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="text-gray-600">Size ({stage2TextSize})</span>
            <input
              type="range"
              min={8}
              max={96}
              value={stage2TextSize}
              onChange={(e) => setStage2TextSize(Number(e.target.value))}
              onInput={(e) => setStage2TextSize(Number(e.currentTarget.value))}
              className="w-full"
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Color</span>
            <input
              type="color"
              value={stage2TextColor}
              onChange={(e) => setStage2TextColor(e.target.value)}
              onInput={(e) => setStage2TextColor(e.currentTarget.value)}
            />
          </label>
          <p className="text-xs text-gray-500">
            Click the text block once to select it, then adjust here. Press Delete to
            remove the whole text block (Escape exits typing mode).
          </p>
        </div>
      )}

      {(stage2Selection === 'shape' ||
        stage2ActiveTool === 'rect' ||
        stage2ActiveTool === 'ellipse') && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Shape colors
          </h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stage2ShapeTransparentFill}
              onChange={(e) => setStage2ShapeTransparentFill(e.target.checked)}
            />
            Transparent fill (cutout shows through)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-16 text-gray-600">Fill</span>
            <input
              type="color"
              value={stage2ShapeFill}
              disabled={stage2ShapeTransparentFill}
              onChange={(e) => setStage2ShapeFill(e.target.value)}
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="w-16 text-gray-600">Outline</span>
            <input
              type="color"
              value={stage2ShapeStroke}
              onChange={(e) => setStage2ShapeStroke(e.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  )
}
