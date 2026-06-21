import type { MouseEvent } from 'react'
import { sampleImageColorAtClientPoint } from '../../lib/backgroundRemoval'
import { CHECKERBOARD_BG } from '../../lib/checkerboardCanvas'

type CutoutPreviewSurfaceProps = {
  src: string
  alt: string
  className?: string
  surfaceClassName?: string
  onPickColor?: (color: { r: number; g: number; b: number }) => void
}

export default function CutoutPreviewSurface({
  src,
  alt,
  className = '',
  surfaceClassName = 'max-h-48 max-w-full object-contain',
  onPickColor,
}: CutoutPreviewSurfaceProps) {
  const handleClick = (event: MouseEvent<HTMLImageElement>) => {
    if (!onPickColor) return
    const color = sampleImageColorAtClientPoint(event.currentTarget, event.clientX, event.clientY)
    if (color) onPickColor(color)
  }

  return (
    <div
      className={`flex items-center justify-center overflow-hidden ${className}`}
      style={{ background: CHECKERBOARD_BG }}
    >
      <img
        src={src}
        alt={alt}
        draggable={false}
        className={`${surfaceClassName}${onPickColor ? ' cursor-crosshair' : ''}`}
        onClick={handleClick}
      />
    </div>
  )
}
