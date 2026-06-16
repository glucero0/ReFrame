import PublishCanvas from './PublishCanvas'
import PublishToolbar from './PublishToolbar'
import { usePublishCanvas } from '../../hooks/stage3/usePublishCanvas'

export default function StageThree() {
  const { canvasElRef, fabricRef, canvasReady, loadError } = usePublishCanvas()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">ReFrame — Publish</h1>
        <p className="text-sm text-gray-500">
          Export your layout as an image or print-ready PDF. Adjust size and DPI, then
          download.
        </p>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-gray-200 bg-white p-4 lg:w-72 lg:border-b-0 lg:border-r">
          <PublishToolbar fabricRef={fabricRef} canvasReady={canvasReady} />
        </aside>

        <main className="flex flex-1 flex-col gap-4 p-4">
          <PublishCanvas
            canvasElRef={canvasElRef}
            canvasReady={canvasReady}
            loadError={loadError}
          />
        </main>
      </div>
    </div>
  )
}
