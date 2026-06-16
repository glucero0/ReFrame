import { useCallback, useEffect, useRef } from 'react'
import { useStage1Store } from '../../store/stage1Store'
import { loadImageFromClipboard, loadImageFromFile } from '../../lib/imageLoader'

export default function ImageInput() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const setSourceImage = useStage1Store((s) => s.setSourceImage)
  const sourceImage = useStage1Store((s) => s.sourceImage)
  const sourceImageName = useStage1Store((s) => s.sourceImageName)

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const image = await loadImageFromFile(file)
        setSourceImage(image, file.name)
      } catch {
        alert('Could not load that image file.')
      }
    },
    [setSourceImage],
  )

  useEffect(() => {
    const onPaste = async (event: ClipboardEvent) => {
      if (!event.clipboardData) return
      const image = await loadImageFromClipboard(event.clipboardData)
      if (image) {
        event.preventDefault()
        setSourceImage(image, 'pasted-image.png')
      }
    }

    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [setSourceImage])

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
        Input
      </h2>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
          e.target.value = ''
        }}
      />
      <button
        type="button"
        className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50"
        onClick={() => fileInputRef.current?.click()}
      >
        Choose image file
      </button>
      <p className="text-xs text-gray-500">
        Or paste an image from your clipboard (Ctrl+V).
      </p>
      {sourceImage && (
        <p className="truncate text-xs text-gray-600">
          Loaded: {sourceImageName} (
          {sourceImage.naturalWidth}×{sourceImage.naturalHeight})
        </p>
      )}
    </div>
  )
}
