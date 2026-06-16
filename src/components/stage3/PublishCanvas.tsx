type PublishCanvasProps = {
  canvasElRef: React.RefObject<HTMLCanvasElement | null>
  canvasReady: boolean
  loadError: string | null
}

export default function PublishCanvas({
  canvasElRef,
  canvasReady,
  loadError,
}: PublishCanvasProps) {
  if (loadError) {
    return (
      <section className="rounded border border-dashed border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
        {loadError}
      </section>
    )
  }

  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-gray-800">Preview</h2>
      <p className="mb-2 text-xs text-gray-500">
        White background, no grid. Export uses scale-to-fit within your chosen size.
      </p>
      <div className="inline-block overflow-auto rounded border border-gray-300 bg-white p-2">
        {!canvasReady && (
          <div className="flex h-[400px] w-[500px] items-center justify-center text-sm text-gray-500">
            Loading layout…
          </div>
        )}
        <canvas ref={canvasElRef} className={canvasReady ? 'block' : 'hidden'} />
      </div>
    </section>
  )
}
