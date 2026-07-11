import {
  memo,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactEventHandler,
} from 'react'
import { sampleImageColorAtClientPoint } from '../../lib/backgroundRemoval'
import { CHECKERBOARD_BG } from '../../lib/checkerboardCanvas'
import type { CutoutTrayViewMode } from '../../lib/cutoutTrayView'
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
  viewMode?: CutoutTrayViewMode
  onIntrinsicSize?: (width: number, height: number) => void
  onPickColor?: (color: { r: number; g: number; b: number }) => void
  registerAsDragTarget?: boolean
}

function applyImageLayout(
  img: HTMLImageElement,
  viewMode: CutoutTrayViewMode,
  width: number,
  height: number,
): void {
  if (viewMode === 'actual') {
    img.width = width
    img.height = height
    return
  }
  img.removeAttribute('width')
  img.removeAttribute('height')
}

function CutoutPreviewSurface({
  src,
  alt,
  className = '',
  surfaceClassName = 'max-h-48 max-w-full object-contain',
  viewMode = 'fit',
  onIntrinsicSize,
  onPickColor,
  registerAsDragTarget = false,
}: CutoutPreviewSurfaceProps) {
  const [intrinsicSize, setIntrinsicSize] = useState<{ width: number; height: number } | null>(
    null,
  )

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

  // Filter edits swap `src` at identical pixel dimensions. Reserve layout with
  // aspect-ratio in fit mode (not full pixel width/height attrs) so large
  // cutouts still scale down inside the tray.
  const handleImgLoad: ReactEventHandler<HTMLImageElement> = (event) => {
    const el = event.currentTarget
    const width = el.naturalWidth
    const height = el.naturalHeight
    setIntrinsicSize({ width, height })
    onIntrinsicSize?.(width, height)
    applyImageLayout(el, viewMode, width, height)
  }

  useEffect(() => {
    const el = imgElRef.current
    if (!el || !intrinsicSize) return
    applyImageLayout(el, viewMode, intrinsicSize.width, intrinsicSize.height)
  }, [viewMode, intrinsicSize])

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

  const fitSurfaceClass =
    viewMode === 'fit' ? 'h-full w-full max-h-full max-w-full object-contain' : surfaceClassName

  const img = (
    <img
      ref={bindImgElRef}
      src={src}
      alt={alt}
      draggable={false}
      className={`${fitSurfaceClass}${onPickColor ? ' cursor-crosshair' : ''}`}
      onClick={handleClick}
      onLoad={handleImgLoad}
    />
  )

  const stageStyle: CSSProperties | undefined =
    viewMode === 'fit' && intrinsicSize
      ? {
          aspectRatio: `${intrinsicSize.width} / ${intrinsicSize.height}`,
          maxHeight: '100%',
          maxWidth: '100%',
        }
      : undefined

  const containerClass =
    viewMode === 'actual'
      ? 'items-start justify-start overflow-auto'
      : 'items-center justify-center overflow-hidden'

  return (
    <div
      className={`relative flex h-full w-full ${containerClass} ${className}`}
      style={{ background: CHECKERBOARD_BG }}
    >
      {registerAsDragTarget ? (
        <span
          ref={bindStageRef}
          className={`relative inline-flex ${
            viewMode === 'fit' ? 'max-h-full max-w-full items-center justify-center' : ''
          }`}
          style={stageStyle}
        >
          {img}
          <canvas
            ref={bindCanvasRef}
            className="pointer-events-none absolute left-1/2 top-1/2 hidden"
            aria-hidden="true"
          />
        </span>
      ) : viewMode === 'fit' && intrinsicSize ? (
        <span className="inline-flex max-h-full max-w-full items-center justify-center" style={stageStyle}>
          {img}
        </span>
      ) : (
        img
      )}
    </div>
  )
}

export default memo(CutoutPreviewSurface)
