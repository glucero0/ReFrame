import { memo, useState } from 'react'
import type { Rgb } from '../../lib/backgroundRemoval'
import CutoutPreviewSurface from './CutoutPreviewSurface'

type BeforeAfterCompareProps = {
  originalUrl: string
  editedUrl: string
  alt: string
  fillHeight?: boolean
  pickColorActive?: boolean
  onPickColor?: (color: Rgb) => void
  registerEditedAsDragTarget?: boolean
}

function BeforeAfterCompare({
  originalUrl,
  editedUrl,
  alt,
  fillHeight = false,
  pickColorActive = false,
  onPickColor,
  registerEditedAsDragTarget = false,
}: BeforeAfterCompareProps) {
  const [compare, setCompare] = useState(false)
  const [split, setSplit] = useState(50)

  // max-h/max-w + auto sizing (rather than h-full/w-full) makes the <img>'s
  // own box match its rendered pixels exactly, with no letterboxing. That
  // keeps whatever wraps it (e.g. the rotation stage) tightly fitted too.
  const surfaceClass = fillHeight
    ? 'max-h-full max-w-full w-auto h-auto object-contain'
    : 'max-h-48 max-w-full object-contain'
  const frameClass = fillHeight
    ? 'flex h-full min-h-0 w-full items-center justify-center overflow-hidden'
    : 'flex justify-center'
  const rootClass = fillHeight ? 'flex h-full min-h-0 flex-col' : undefined
  const singleShellClass = fillHeight
    ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-gray-200'
    : undefined
  const singleFrameClass = fillHeight
    ? `${frameClass} min-h-0 flex-1 p-2`
    : `${frameClass} rounded border border-gray-200 p-4`

  const compareCheckbox = (
    <label className="flex shrink-0 items-center gap-2 text-sm text-gray-600">
      <input
        type="checkbox"
        checked={compare}
        disabled={pickColorActive}
        onChange={(e) => setCompare(e.target.checked)}
      />
      Compare before / after
    </label>
  )

  if (pickColorActive) {
    const pickShellClass = fillHeight
      ? 'flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-blue-300'
      : 'overflow-hidden rounded border border-blue-300'

    return (
      <div className={rootClass}>
        <div className={pickShellClass}>
          <div className={fillHeight ? `${frameClass} min-h-0 flex-1 p-2` : `${frameClass} p-4`}>
            <CutoutPreviewSurface
              src={originalUrl}
              alt={`${alt} original`}
              className="h-full w-full"
              surfaceClassName={surfaceClass}
              onPickColor={onPickColor}
            />
          </div>
          {fillHeight ? (
            <div className="shrink-0 border-t border-blue-200 bg-blue-50 px-3 py-1.5 text-xs text-blue-800">
              Click the background color to remove.
            </div>
          ) : (
            <p className="bg-blue-50 px-3 py-2 text-xs text-blue-800">
              Click the background color to remove.
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!compare) {
    if (fillHeight) {
      return (
        <div className={rootClass}>
          <div className={singleShellClass}>
            <div className={singleFrameClass}>
              <CutoutPreviewSurface
                src={editedUrl}
                alt={alt}
                className="h-full w-full"
                surfaceClassName={surfaceClass}
                registerAsDragTarget={registerEditedAsDragTarget}
              />
            </div>
            <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-1.5">
              {compareCheckbox}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div>
        <div className={singleFrameClass}>
          <CutoutPreviewSurface
            src={editedUrl}
            alt={alt}
            surfaceClassName={surfaceClass}
            registerAsDragTarget={registerEditedAsDragTarget}
          />
        </div>
        <div className="mt-2">{compareCheckbox}</div>
      </div>
    )
  }

  if (fillHeight) {
    return (
      <div className={rootClass}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-gray-200">
          <div className="flex min-h-0 flex-1">
            <div
              className="flex h-full min-h-0 shrink-0 items-center justify-center overflow-hidden border-r border-gray-200 p-2"
              style={{ width: `${split}%` }}
            >
              <CutoutPreviewSurface
                src={originalUrl}
                alt={`${alt} original`}
                className="h-full w-full"
                surfaceClassName={surfaceClass}
              />
            </div>
            <div className="flex h-full min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
              <CutoutPreviewSurface
                src={editedUrl}
                alt={alt}
                className="h-full w-full"
                surfaceClassName={surfaceClass}
                registerAsDragTarget={registerEditedAsDragTarget}
              />
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
          <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-1.5">
            {compareCheckbox}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="overflow-hidden rounded border border-gray-200">
        <div className="flex max-h-48">
          <div
            className="flex shrink-0 items-center justify-center overflow-hidden border-r border-gray-200"
            style={{ width: `${split}%` }}
          >
            <CutoutPreviewSurface
              src={originalUrl}
              alt={`${alt} original`}
              surfaceClassName={surfaceClass}
            />
          </div>
          <div
            className="flex flex-1 items-center justify-center overflow-hidden"
            style={{ width: `${100 - split}%` }}
          >
            <CutoutPreviewSurface
              src={editedUrl}
              alt={alt}
              surfaceClassName={surfaceClass}
              registerAsDragTarget={registerEditedAsDragTarget}
            />
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

export default memo(BeforeAfterCompare)
