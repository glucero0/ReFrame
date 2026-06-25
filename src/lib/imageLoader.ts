import { assertFileWithinLimits, assertImageWithinLimits } from './limits'

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  assertFileWithinLimits(file.size)

  const url = URL.createObjectURL(file)
  try {
    const image = await loadImageFromUrl(url)
    assertImageWithinLimits(image.naturalWidth, image.naturalHeight)
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
  return img
}

export async function loadImageFromClipboard(
  clipboardData: DataTransfer,
): Promise<HTMLImageElement | null> {
  const items = clipboardData.items
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) return loadImageFromFile(file)
    }
  }
  return null
}

export function imageToObjectUrl(image: HTMLImageElement): string {
  assertImageWithinLimits(image.naturalWidth, image.naturalHeight)

  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get canvas context')
  ctx.drawImage(image, 0, 0)
  return canvas.toDataURL('image/png')
}
