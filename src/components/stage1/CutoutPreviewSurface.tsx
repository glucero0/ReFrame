import { memo, useEffect, useRef, type MouseEvent, type ReactEventHandler } from 'react'
import { sampleImageColorAtClientPoint } from '../../lib/backgroundRemoval'
import { CHECKERBOARD_BG } from '../../lib/checkerboardCanvas'
import {
  registerPreviewCanvas,
  registerPreviewImageEl,
  registerPreviewImg,
} from '../../lib/previewInteractionGate'

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
  const bindStageRef = (el: HTMLSpanElement | null) => {
    if (registerAsDragTarget) {
      registerPreviewImg(el)
    }
  }

  const imgElRef = useRef<HTMLImageElement | null>(null)

  const bindImgElRef = (el: HTMLImageElement | null) => {
    imgElRef.current = el
    if (registerAsDragTarget) {
      registerPreviewImageEl(el)
    }
  }

  // Filter edits (brightness/contrast/etc.) swap `src` to a freshly
  // generated blob on the *same* region every ~100ms while dragging, always
  // at identical pixel dimensions. But because this element is sized from
  // its own intrinsic dimensions (`w-auto h-auto`, needed so the rotation
  // drag stage tightly wraps it), the box has no known size again the
  // moment a new blob starts decoding — the browser can briefly collapse
  // and then snap back once it decodes, which reads as a constant
  // jiggle/reflow during filter dragging. Setting width/height attributes
  // from the last decoded frame makes the browser reserve the identical
  // box immediately, before the new blob has even started decoding.
  const handleImgLoad: ReactEventHandler<HTMLImageElement> = (event) => {
    const el = event.currentTarget
    el.width = el.naturalWidth
    el.height = el.naturalHeight
  }

  const bindCanvasRef = (el: HTMLCanvasElement | null) => {
    if (registerAsDragTarget) {
      registerPreviewCanvas(el)
    }
  }

  useEffect(() => {
    if (!registerAsDragTarget) return
    return () => {
      registerPreviewImg(null)
      registerPreviewImageEl(null)
      registerPreviewCanvas(null)
    }
  }, [registerAsDragTarget])

  const handleClick = (event: MouseEvent<HTMLImageElement>) => {
    if (!onPickColor) return
    const color = sampleImageColorAtClientPoint(event.currentTarget, event.clientX, event.clientY)
    if (color) onPickColor(color)
  }

  const img = (
    <img
      ref={bindImgElRef}
      src={src}
      alt={alt}
      draggable={false}
      className={`${surfaceClassName}${onPickColor ? ' cursor-crosshair' : ''}`}
      onClick={handleClick}
      onLoad={handleImgLoad}
    />
  )

  return (
    <div
      className={`relative flex h-full w-full items-center justify-center overflow-hidden ${className}`}
      style={{ background: CHECKERBOARD_BG }}
    >
      {registerAsDragTarget ? (
        // Wrapper shrink-wraps to the rendered image. While dragging the
        // rotation slider, the <img> is hidden and a same-sized <canvas> is
        // drawn instead (see previewInteractionGate) — this avoids relying
        // on the browser's CSS transform/compositor pipeline, which was
        // still visibly hitching even once GPU-layer promotion was
        // pre-warmed and its bounds pre-sized.
        <span ref={bindStageRef} className="relative inline-flex max-h-full max-w-full items-center justify-center">
          {img}
          <canvas
            ref={bindCanvasRef}
            className="pointer-events-none absolute left-1/2 top-1/2 hidden"
            aria-hidden="true"
          />
        </span>
      ) : (
        img
      )}
    </div>
  )
}

export default memo(CutoutPreviewSurface)
