import CutoutStrip from './CutoutStrip'
import ArrangeCanvas from './ArrangeCanvas'
import ArrangeToolbar from './ArrangeToolbar'

export default function StageTwo() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-gray-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold text-gray-900">ReFrame — Layout</h1>
        <p className="text-sm text-gray-500">
          Cutouts from Stage 1 appear at the top. Add them to the layout canvas below,
          then position text and shapes.
        </p>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row">
        <aside className="w-full shrink-0 border-b border-gray-200 bg-white p-4 lg:w-72 lg:border-b-0 lg:border-r">
          <ArrangeToolbar />
        </aside>

        <main className="flex flex-1 flex-col gap-4 p-4">
          <CutoutStrip />
          <ArrangeCanvas />
        </main>
      </div>
    </div>
  )
}
