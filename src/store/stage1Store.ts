import { create } from 'zustand'
import { cropAllRegions, revokeProcessedCuts } from '../lib/cropEngine'
import type {
  CutTool,
  ExportFormat,
  FilterSettings,
  ProcessedCut,
  Region,
} from '../lib/regionTypes'
import {
  cloneRegions,
  DEFAULT_FILTERS,
  ensureRegionFilters,
} from '../lib/regionTypes'
import { useStage2Store } from './stage2Store'

const MAX_UNDO = 20
let previewGeneration = 0

function invalidateStage2Layout(): void {
  useStage2Store.getState().invalidateStage2Layout()
}

export type Stage1State = {
  sourceImage: HTMLImageElement | null
  sourceImageName: string
  regions: Region[]
  regionFilters: Record<string, FilterSettings>
  padding: number
  activeTool: CutTool
  exportFormat: ExportFormat
  processedCuts: ProcessedCut[]
  previewIndex: number
  selectedRegionId: string | null
  isProcessing: boolean
  undoStack: Region[][]
  zoom: number

  setSourceImage: (image: HTMLImageElement, name?: string) => void
  clearSourceImage: () => void
  setRegions: (regions: Region[]) => void
  pushUndo: () => void
  undo: () => void
  setPadding: (padding: number) => void
  setActiveTool: (tool: CutTool) => void
  setRegionFilters: (regionId: string, filters: Partial<FilterSettings>) => void
  resetRegionFilters: (regionId: string) => void
  setExportFormat: (format: ExportFormat) => void
  setPreviewIndex: (index: number) => void
  focusPreviewCut: (index: number) => void
  selectRegion: (regionId: string | null) => void
  setZoom: (zoom: number) => void
  removeRegion: (id: string) => void
  regeneratePreviews: () => Promise<void>
  cutApart: () => Promise<void>
}

export const useStage1Store = create<Stage1State>((set, get) => ({
  sourceImage: null,
  sourceImageName: '',
  regions: [],
  regionFilters: {},
  padding: 0,
  activeTool: 'rect',
  exportFormat: 'png',
  processedCuts: [],
  previewIndex: 0,
  selectedRegionId: null,
  isProcessing: false,
  undoStack: [],
  zoom: 1,

  setSourceImage: (image, name = 'pasted-image.png') => {
    const { processedCuts } = get()
    revokeProcessedCuts(processedCuts)
    invalidateStage2Layout()
    set({
      sourceImage: image,
      sourceImageName: name,
      regions: [],
      regionFilters: {},
      processedCuts: [],
      previewIndex: 0,
      selectedRegionId: null,
      undoStack: [],
      zoom: 1,
    })
  },

  clearSourceImage: () => {
    const { processedCuts } = get()
    revokeProcessedCuts(processedCuts)
    invalidateStage2Layout()
    set({
      sourceImage: null,
      sourceImageName: '',
      regions: [],
      regionFilters: {},
      processedCuts: [],
      previewIndex: 0,
      selectedRegionId: null,
      undoStack: [],
    })
  },

  setRegions: (regions) =>
    set((state) => ({
      regions,
      regionFilters: ensureRegionFilters(regions, state.regionFilters),
    })),

  pushUndo: () => {
    const { regions, undoStack } = get()
    const snapshot = cloneRegions(regions)
    const nextStack = [...undoStack, snapshot].slice(-MAX_UNDO)
    set({ undoStack: nextStack })
  },

  undo: () => {
    const { undoStack, regionFilters } = get()
    if (undoStack.length === 0) return
    const previous = undoStack[undoStack.length - 1]
    set({
      regions: cloneRegions(previous),
      regionFilters: ensureRegionFilters(previous, regionFilters),
      undoStack: undoStack.slice(0, -1),
    })
  },

  setPadding: (padding) => set({ padding: Math.max(0, padding) }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setRegionFilters: (regionId, partial) =>
    set((state) => {
      const current = state.regionFilters[regionId] ?? DEFAULT_FILTERS
      return {
        regionFilters: {
          ...state.regionFilters,
          [regionId]: { ...current, ...partial },
        },
      }
    }),

  resetRegionFilters: (regionId) =>
    set((state) => ({
      regionFilters: {
        ...state.regionFilters,
        [regionId]: { ...DEFAULT_FILTERS },
      },
    })),

  setExportFormat: (format) => set({ exportFormat: format }),

  setPreviewIndex: (index) => {
    const { processedCuts } = get()
    if (processedCuts.length === 0) return
    const clamped = Math.max(0, Math.min(index, processedCuts.length - 1))
    set({
      previewIndex: clamped,
      selectedRegionId: processedCuts[clamped]?.regionId ?? null,
    })
  },

  focusPreviewCut: (index) => {
    const { processedCuts } = get()
    if (processedCuts.length === 0) return
    const clamped = Math.max(0, Math.min(index, processedCuts.length - 1))
    const cut = processedCuts[clamped]
    set({
      previewIndex: clamped,
      selectedRegionId: cut?.regionId ?? null,
      activeTool: 'select',
    })
  },

  selectRegion: (regionId) => {
    if (!regionId) {
      set({ selectedRegionId: null })
      return
    }
    const { processedCuts } = get()
    const index = processedCuts.findIndex((cut) => cut.regionId === regionId)
    set({
      selectedRegionId: regionId,
      ...(index >= 0 ? { previewIndex: index } : {}),
    })
  },

  setZoom: (zoom) => set({ zoom: Math.max(0.25, Math.min(zoom, 4)) }),

  removeRegion: (id) => {
    const { regions, pushUndo, regionFilters, processedCuts, selectedRegionId } = get()
    pushUndo()
    const nextRegions = regions.filter((r) => r.id !== id)
    const nextSelectedId =
      selectedRegionId === id ? (nextRegions[0]?.id ?? null) : selectedRegionId
    const nextIndex =
      nextSelectedId != null
        ? Math.max(0, processedCuts.findIndex((cut) => cut.regionId === nextSelectedId))
        : 0
    invalidateStage2Layout()
    set({
      regions: nextRegions,
      regionFilters: ensureRegionFilters(nextRegions, regionFilters),
      selectedRegionId: nextSelectedId,
      previewIndex: processedCuts.length > 0 ? nextIndex : 0,
    })
  },

  regeneratePreviews: async () => {
    const {
      sourceImage,
      regions,
      padding,
      regionFilters,
      exportFormat,
      processedCuts,
      previewIndex,
      selectedRegionId,
    } = get()
    if (!sourceImage || regions.length === 0) {
      revokeProcessedCuts(processedCuts)
      set({ processedCuts: [], previewIndex: 0, selectedRegionId: null, isProcessing: false })
      return
    }

    const generation = ++previewGeneration
    set({ isProcessing: true })

    try {
      revokeProcessedCuts(processedCuts)
      const cuts = await cropAllRegions(
        sourceImage,
        regions,
        padding,
        regionFilters,
        exportFormat,
      )

      if (generation !== previewGeneration) return

      let nextIndex = 0
      if (cuts.length > 0) {
        if (selectedRegionId) {
          const selectedIndex = cuts.findIndex((cut) => cut.regionId === selectedRegionId)
          nextIndex = selectedIndex >= 0 ? selectedIndex : Math.min(previewIndex, cuts.length - 1)
        } else {
          nextIndex = Math.min(previewIndex, cuts.length - 1)
        }
      }

      invalidateStage2Layout()
      set({
        processedCuts: cuts,
        previewIndex: nextIndex,
        selectedRegionId: cuts[nextIndex]?.regionId ?? null,
      })
    } finally {
      if (generation === previewGeneration) {
        set({ isProcessing: false })
      }
    }
  },

  cutApart: async () => {
    await get().regeneratePreviews()
  },
}))
