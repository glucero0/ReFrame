import { useState } from 'react'

type BeforeAfterCompareProps = {
  originalUrl: string
  editedUrl: string
  alt: string
  fillHeight?: boolean
}

export default function BeforeAfterCompare({
  originalUrl,
  editedUrl,
  alt,
  fillHeight = false,
}: BeforeAfterCompareProps) {
  const [compare, setCompare] = useState(false)
  const [split, setSplit] = useState(50)

  const imageClass = fillHeight
    ? 'h-full w-full object-contain'
    : 'max-h-48 max-w-full object-contain'
  const imageFrameClass = fillHeight
    ? 'flex h-full min-h-0 w-full items-center justify-center overflow-hidden'
    : 'flex justify-center'
  const rootClass = fillHeight ? 'flex h-full min-h-0 flex-col' : undefined
  const singleShellClass = fillHeight
    ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-gray-200 bg-gray-50'
    : undefined
  const singleImageWrapClass = fillHeight
    ? `${imageFrameClass} min-h-0 flex-1 p-2`
    : `${imageFrameClass} rounded border border-gray-200 bg-gray-50 p-4`

  const compareCheckbox = (
    <label className="flex shrink-0 items-center gap-2 text-sm text-gray-600">
      <input
        type="checkbox"
        checked={compare}
        onChange={(e) => setCompare(e.target.checked)}
      />
      Compare before / after
    </label>
  )

  if (!compare) {
    if (fillHeight) {
      return (
        <div className={rootClass}>
          <div className={singleShellClass}>
            <div className={singleImageWrapClass}>
              <img src={editedUrl} alt={alt} className={imageClass} />
            </div>
            <div className="shrink-0 border-t border-gray-200 px-3 py-1.5">
              {compareCheckbox}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div>
        <div className={singleImageWrapClass}>
          <img src={editedUrl} alt={alt} className={imageClass} />
        </div>
        <div className="mt-2">{compareCheckbox}</div>
      </div>
    )
  }

  if (fillHeight) {
    return (
      <div className={rootClass}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-gray-200 bg-gray-50">
          <div className="flex min-h-0 flex-1">
            <div
              className="flex h-full min-h-0 shrink-0 items-center justify-center overflow-hidden border-r border-white/80 bg-gray-100 p-2"
              style={{ width: `${split}%` }}
            >
              <img src={originalUrl} alt={`${alt} original`} className={imageClass} />
            </div>
            <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden bg-gray-50 p-2">
              <img src={editedUrl} alt={alt} className={imageClass} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 border-t border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-500">
            <span className="w-14 shrink-0">Original</span>
            <input
              type="range"
              min={10}
              max={90}
              value={split}
              onChange={(e) => setSplit(Number(e.target.value))}
              className="flex-1"
              aria-label="Before and after split position"
            />
            <span className="w-10 shrink-0 text-right">Edited</span>
          </div>
          <div className="shrink-0 border-t border-gray-200 px-3 py-1.5">
            {compareCheckbox}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-hidden rounded border border-gray-200 bg-gray-50">
        <div className="flex max-h-48">
          <div
            className="flex shrink-0 items-center justify-center overflow-hidden border-r border-white/80 bg-gray-100"
            style={{ width: `${split}%` }}
          >
            <img src={originalUrl} alt={`${alt} original`} className={imageClass} />
          </div>
          <div
            className="flex flex-1 items-center justify-center overflow-hidden bg-gray-50"
            style={{ width: `${100 - split}%` }}
          >
            <img src={editedUrl} alt={alt} className={imageClass} />
          </div>
        </div>
        <div className="flex items-center gap-2 border-t border-gray-200 bg-white px-3 py-2 text-xs text-gray-500">
          <span className="w-14 shrink-0">Original</span>
          <input
            type="range"
            min={10}
            max={90}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            className="flex-1"
            aria-label="Before and after split position"
          />
          <span className="w-10 shrink-0 text-right">Edited</span>
        </div>
      </div>
      <div className="mt-2">{compareCheckbox}</div>
    </div>
  )
}
