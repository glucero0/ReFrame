import { create } from 'zustand'
import type { ImageExportFormat, PublishDpi, SizePresetId } from '../lib/stage3Types'

export type Stage3State = {
  sizePresetId: SizePresetId
  customWidth: number
  customHeight: number
  dpi: PublishDpi
  imageFormat: ImageExportFormat
  isExporting: boolean

  setSizePresetId: (id: SizePresetId) => void
  setCustomWidth: (width: number) => void
  setCustomHeight: (height: number) => void
  setDpi: (dpi: PublishDpi) => void
  setImageFormat: (format: ImageExportFormat) => void
  setIsExporting: (exporting: boolean) => void
  enterStage: () => void
}

export const useStage3Store = create<Stage3State>((set) => ({
  sizePresetId: 'original',
  customWidth: 1000,
  customHeight: 800,
  dpi: 150,
  imageFormat: 'png',
  isExporting: false,

  setSizePresetId: (id) => set({ sizePresetId: id }),

  setCustomWidth: (width) => set({ customWidth: Math.max(1, Math.round(width)) }),

  setCustomHeight: (height) =>
    set({ customHeight: Math.max(1, Math.round(height)) }),

  setDpi: (dpi) => set({ dpi }),

  setImageFormat: (format) => set({ imageFormat: format }),

  setIsExporting: (exporting) => set({ isExporting: exporting }),

  enterStage: () => set({ isExporting: false }),
}))
