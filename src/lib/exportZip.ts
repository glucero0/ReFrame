import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { ExportFormat, ProcessedCut } from './regionTypes'

function extensionForBlob(blob: Blob, fallback: ExportFormat): string {
  if (blob.type === 'image/png') return 'png'
  if (blob.type === 'image/jpeg') return 'jpg'
  return fallback === 'png' ? 'png' : 'jpg'
}

export async function downloadCutsAsZip(
  cuts: ProcessedCut[],
  format: ExportFormat,
): Promise<void> {
  if (cuts.length === 0) return

  const zip = new JSZip()

  for (const cut of cuts) {
    const arrayBuffer = await cut.blob.arrayBuffer()
    const ext = extensionForBlob(cut.blob, format)
    zip.file(`image-${String(cut.label).padStart(2, '0')}.${ext}`, arrayBuffer)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, 'reframe-cuts.zip')
}
