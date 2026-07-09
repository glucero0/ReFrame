import type { Rgb } from './backgroundRemoval'
import type { PngFolderEntry } from './cutoutFolder'
import { createRegionId } from './regionTypes'
import type { FilterSettings, ProcessedCut } from './regionTypes'
import { DEFAULT_FILTERS } from './regionTypes'
import { renderStandaloneCutout } from './standaloneCutout'

export type ManageCutoutItem = {
  id: string
  label: number
  fileName: string | null
  fileHandle: FileSystemFileHandle | null
  baseBlob: Blob
  blob: Blob
  previewUrl: string
  originalPreviewUrl: string
  filters: FilterSettings
  rotation: number
  detectedBackgroundColor: Rgb | null
}

export function revokeManageCutoutItem(item: ManageCutoutItem): void {
  URL.revokeObjectURL(item.previewUrl)
  URL.revokeObjectURL(item.originalPreviewUrl)
}

export function revokeManageCutoutItems(items: ManageCutoutItem[]): void {
  for (const item of items) revokeManageCutoutItem(item)
}

function labelFromFileName(name: string, fallback: number): number {
  const match = name.match(/(\d+)/)
  if (!match) return fallback
  const parsed = Number.parseInt(match[1], 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function cutoutFileName(label: number): string {
  return `cutout-${String(label).padStart(2, '0')}.png`
}

export async function manageItemFromProcessedCut(
  cut: ProcessedCut,
  filters: FilterSettings,
): Promise<ManageCutoutItem> {
  const [originalBlob, editedBlob] = await Promise.all([
    fetch(cut.originalPreviewUrl).then((response) => response.blob()),
    Promise.resolve(cut.blob),
  ])
  return {
    id: cut.regionId,
    label: cut.label,
    fileName: null,
    fileHandle: null,
    baseBlob: originalBlob,
    blob: editedBlob,
    previewUrl: URL.createObjectURL(editedBlob),
    originalPreviewUrl: URL.createObjectURL(originalBlob),
    filters,
    rotation: 0,
    detectedBackgroundColor: cut.detectedBackgroundColor,
  }
}

export async function manageItemsFromProcessedCuts(
  cuts: ProcessedCut[],
  regionFilters: Record<string, FilterSettings>,
): Promise<ManageCutoutItem[]> {
  const items: ManageCutoutItem[] = []
  for (const cut of cuts) {
    const filters = regionFilters[cut.regionId] ?? DEFAULT_FILTERS
    items.push(await manageItemFromProcessedCut(cut, filters))
  }
  return items
}

export async function manageItemFromPngEntry(
  entry: PngFolderEntry,
  label: number,
): Promise<ManageCutoutItem> {
  const baseBlob = await entry.handle.getFile()
  const rendered = await renderStandaloneCutout(baseBlob, DEFAULT_FILTERS, 0)
  return {
    id: createRegionId(),
    label: labelFromFileName(entry.name, label),
    fileName: entry.name,
    fileHandle: entry.handle,
    baseBlob,
    blob: rendered.blob,
    previewUrl: rendered.previewUrl,
    originalPreviewUrl: rendered.originalPreviewUrl,
    filters: { ...DEFAULT_FILTERS },
    rotation: 0,
    detectedBackgroundColor: rendered.detectedBackgroundColor,
  }
}

export async function manageItemsFromFolderEntries(
  entries: PngFolderEntry[],
): Promise<ManageCutoutItem[]> {
  const items: ManageCutoutItem[] = []
  for (let index = 0; index < entries.length; index += 1) {
    items.push(await manageItemFromPngEntry(entries[index], index + 1))
  }
  return items
}

export async function rerenderManageCutoutItem(
  item: ManageCutoutItem,
  partial?: Partial<Pick<ManageCutoutItem, 'filters' | 'rotation'>>,
): Promise<ManageCutoutItem> {
  const filters = partial?.filters ?? item.filters
  const rotation = partial?.rotation ?? item.rotation
  const rendered = await renderStandaloneCutout(item.baseBlob, filters, rotation, item)
  return {
    ...item,
    filters,
    rotation,
    blob: rendered.blob,
    previewUrl: rendered.previewUrl,
    originalPreviewUrl: rendered.originalPreviewUrl,
    detectedBackgroundColor: rendered.detectedBackgroundColor,
  }
}

export function manageItemsToProcessedCuts(items: ManageCutoutItem[]): ProcessedCut[] {
  return items.map((item) => ({
    regionId: item.id,
    label: item.label,
    blob: item.blob,
    previewUrl: item.previewUrl,
    originalPreviewUrl: item.originalPreviewUrl,
    detectedBackgroundColor: item.detectedBackgroundColor,
    bakedRotation: item.rotation,
  }))
}
