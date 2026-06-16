import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { ExportFormat, ProcessedCut } from './regionTypes'

function extensionForFormat(format: ExportFormat): string {
  return format === 'png' ? 'png' : 'jpg'
}

export async function downloadCutsAsZip(
  cuts: ProcessedCut[],
  format: ExportFormat,
): Promise<void> {
  if (cuts.length === 0) return

  const zip = new JSZip()
  const ext = extensionForFormat(format)

  for (const cut of cuts) {
    const arrayBuffer = await cut.blob.arrayBuffer()
    zip.file(`image-${String(cut.label).padStart(2, '0')}.${ext}`, arrayBuffer)
  }

  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, 'reframe-cuts.zip')
}
