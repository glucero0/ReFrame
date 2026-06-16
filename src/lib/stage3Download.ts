import type { Canvas } from 'fabric'
import { saveAs } from 'file-saver'
import { PDFDocument } from 'pdf-lib'
import {
  computeExportDimensions,
  fileExtensionForImageFormat,
  mimeTypeForImageFormat,
  type ExportDimensions,
} from './stage3Export'
import type { ImageExportFormat, PublishDpi, SizePresetId } from './stage3Types'

export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to export image'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })
}

export async function renderLayoutToCanvas(
  fabricCanvas: Canvas,
  dimensions: ExportDimensions,
  layoutWidth: number,
  layoutHeight: number,
): Promise<HTMLCanvasElement> {
  const { pixelWidth, pixelHeight } = dimensions
  const scale = Math.min(pixelWidth / layoutWidth, pixelHeight / layoutHeight)
  const drawWidth = layoutWidth * scale
  const drawHeight = layoutHeight * scale
  const offsetX = (pixelWidth - drawWidth) / 2
  const offsetY = (pixelHeight - drawHeight) / 2

  const rendered = fabricCanvas.toCanvasElement(scale)
  const output = document.createElement('canvas')
  output.width = pixelWidth
  output.height = pixelHeight
  const ctx = output.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, pixelWidth, pixelHeight)
  ctx.drawImage(rendered, offsetX, offsetY, drawWidth, drawHeight)
  return output
}

export async function downloadLayoutImage(
  fabricCanvas: Canvas,
  options: {
    presetId: SizePresetId
    customWidth: number
    customHeight: number
    dpi: PublishDpi
    format: ImageExportFormat
    layoutWidth: number
    layoutHeight: number
  },
): Promise<void> {
  const dimensions = computeExportDimensions(
    options.presetId,
    options.customWidth,
    options.customHeight,
    options.dpi,
    false,
  )
  const output = await renderLayoutToCanvas(
    fabricCanvas,
    dimensions,
    options.layoutWidth,
    options.layoutHeight,
  )
  const mimeType = mimeTypeForImageFormat(options.format)
  const quality = options.format === 'jpeg' ? 0.92 : undefined
  const blob = await canvasToBlob(output, mimeType, quality)
  const ext = fileExtensionForImageFormat(options.format)
  saveAs(blob, `reframe-layout.${ext}`)
}

export async function downloadLayoutPdf(
  fabricCanvas: Canvas,
  options: {
    presetId: SizePresetId
    customWidth: number
    customHeight: number
    dpi: PublishDpi
    layoutWidth: number
    layoutHeight: number
  },
): Promise<void> {
  const dimensions = computeExportDimensions(
    options.presetId,
    options.customWidth,
    options.customHeight,
    options.dpi,
    true,
  )
  const output = await renderLayoutToCanvas(
    fabricCanvas,
    dimensions,
    options.layoutWidth,
    options.layoutHeight,
  )
  const pngBlob = await canvasToBlob(output, 'image/png')
  const pngBytes = new Uint8Array(await pngBlob.arrayBuffer())

  const pageWidthPt = dimensions.pageWidthPt ?? dimensions.pixelWidth
  const pageHeightPt = dimensions.pageHeightPt ?? dimensions.pixelHeight

  const pdf = await PDFDocument.create()
  const page = pdf.addPage([pageWidthPt, pageHeightPt])
  const image = await pdf.embedPng(pngBytes)
  page.drawImage(image, {
    x: 0,
    y: 0,
    width: pageWidthPt,
    height: pageHeightPt,
  })

  const pdfBytes = await pdf.save()
  const blob = new Blob([pdfBytes], { type: 'application/pdf' })
  saveAs(blob, 'reframe-layout.pdf')
}
