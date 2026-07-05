import { memo, useEffect, type MouseEvent } from 'react'
import { sampleImageColorAtClientPoint } from '../../lib/backgroundRemoval'
import { CHECKERBOARD_BG } from '../../lib/checkerboardCanvas'
import { registerPreviewImg } from '../../lib/previewInteractionGate'

type CutoutPreviewSurfaceProps = {
  src: string
  alt: string
  className?: string
  surfaceClassName?: string
  onPickColor?: (color: { r: number; g: number; b: number }) => void
  registerAsDragTarget?: boolean
}

function CutoutPreviewSurface({
  src,
  alt,
  className = '',
  surfaceClassName = 'max-h-48 max-w-full object-contain',
  onPickColor,
  registerAsDragTarget = false,
}: CutoutPreviewSurfaceProps) {
  const bindImgRef = (el: HTMLImageElement | null) => {
    if (registerAsDragTarget) {
      registerPreviewImg(el)
    }
  }

  useEffect(() => {
    if (!registerAsDragTarget) return
    return () => registerPreviewImg(null)
  }, [registerAsDragTarget])

  const handleClick = (event: MouseEvent<HTMLImageElement>) => {
    if (!onPickColor) return
    const color = sampleImageColorAtClientPoint(event.currentTarget, event.clientX, event.clientY)
    if (color) onPickColor(color)
  }

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: CHECKERBOARD_BG }}
    >
      <img
        ref={bindImgRef}
        src={src}
        alt={alt}
        draggable={false}
        className={`${surfaceClassName}${onPickColor ? ' cursor-crosshair' : ''}`}
        onClick={handleClick}
      />
    </div>
  )
}

export default memo(CutoutPreviewSurface)
