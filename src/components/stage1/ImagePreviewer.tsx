import { useStage1Store } from '../../store/stage1Store'
import BeforeAfterCompare from './BeforeAfterCompare'

type ImagePreviewerProps = {
  fillHeight?: boolean
}

export default function ImagePreviewer({ fillHeight = false }: ImagePreviewerProps) {
  const processedCuts = useStage1Store((s) => s.processedCuts)
  const previewIndex = useStage1Store((s) => s.previewIndex)
  const focusPreviewCut = useStage1Store((s) => s.focusPreviewCut)
  const isProcessing = useStage1Store((s) => s.isProcessing)
  const regions = useStage1Store((s) => s.regions)

  const current = processedCuts[previewIndex]
  const total = processedCuts.length

  const focusCut = (index: number) => {
    if (isProcessing || total === 0) return
    focusPreviewCut(index)
  }

  if (regions.length === 0) {
    return (
      <div className="flex h-full items-center bg-white px-4 py-3 text-sm text-gray-500">
        Draw cut regions on the canvas to see live previews here.
      </div>
    )
  }

  return (
    <div
      className={`bg-white px-4 py-2 ${
        fillHeight ? 'flex h-full min-h-0 flex-col' : 'py-3'
      }`}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-sm font-medium text-gray-700">Live preview</span>
        <button
          type="button"
          disabled={previewIndex <= 0 || isProcessing || total === 0}
          className="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
          onClick={(e) => {
            e.stopPropagation()
            focusCut(previewIndex - 1)
          }}
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">
          {isProcessing
            ? 'Updating preview…'
            : total > 0 && current
              ? `Cut ${current.label} (${previewIndex + 1} of ${total})`
              : 'Generating preview…'}
        </span>
        <button
          type="button"
          disabled={previewIndex >= total - 1 || isProcessing || total === 0}
          className="rounded border border-gray-300 bg-white px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
          onClick={(e) => {
            e.stopPropagation()
            focusCut(previewIndex + 1)
          }}
        >
          Next
        </button>
        {fillHeight && (
          <span className="text-xs text-gray-500">
            Drag the divider above to resize this panel.
          </span>
        )}
      </div>

      {current ? (
        <div
          className={`${fillHeight ? 'mt-2 min-h-0 flex-1' : 'mt-3'} ${
            !isProcessing ? 'cursor-pointer' : ''
          }`}
          onClick={() => focusCut(previewIndex)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              focusCut(previewIndex)
            }
          }}
          role="button"
          tabIndex={isProcessing ? -1 : 0}
          title="Select this cutout on the canvas"
        >
          <BeforeAfterCompare
            originalUrl={current.originalPreviewUrl}
            editedUrl={current.previewUrl}
            alt={`Cut ${current.label}`}
            fillHeight={fillHeight}
          />
        </div>
      ) : (
        <div
          className={`flex items-center justify-center rounded border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-400 ${
            fillHeight ? 'mt-2 min-h-0 flex-1' : 'mt-3 h-32'
          }`}
        >
          {isProcessing ? 'Processing…' : 'Waiting for preview…'}
        </div>
      )}

      {total > 1 && !isProcessing && (
        <div className="mt-2 max-h-16 shrink-0 overflow-y-auto">
          <div className="flex flex-wrap gap-2">
          {processedCuts.map((cut, index) => (
            <button
              key={cut.regionId}
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                focusCut(index)
              }}
              className={`rounded border p-1 ${
                index === previewIndex
                  ? 'border-blue-600 ring-1 ring-blue-600'
                  : 'border-gray-200 hover:border-gray-400'
              }`}
              title={`Preview cut ${cut.label}`}
            >
              <img
                src={cut.previewUrl}
                alt={`Cut ${cut.label}`}
                className="h-12 w-12 object-contain"
              />
            </button>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}
