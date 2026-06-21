import { create } from 'zustand'
import type { Stage2LayerEntry, Stage2LayerOrderAction } from '../lib/stage2Layers'
import type { Stage2Font, Stage2SelectionKind, Stage2Tool } from '../lib/stage2Types'
import { DEFAULT_STAGE2_SHAPE, DEFAULT_STAGE2_TEXT } from '../lib/stage2Types'
import { DEFAULT_GRID_SIZE } from '../lib/stage2Grid'

export type Stage2State = {
  stage2ActiveTool: Stage2Tool
  stage2Selection: Stage2SelectionKind
  stage2TextFont: Stage2Font
  stage2TextSize: number
  stage2TextColor: string
  stage2ShapeFill: string
  stage2ShapeStroke: string
  stage2ShapeTransparentFill: boolean
  stage2GridSize: number
  stage2ShowGrid: boolean
  stage2SnapToGrid: boolean
  stage2AutofitToGrid: boolean
  stage2CanvasJson: string | null
  stage2NeedsInit: boolean
  stage2RearrangeToken: number
  stage2AddTextToken: number
  stage2AddCutoutToken: number
  stage2DeleteToken: number
  stage2PendingCutoutId: string | null
  stage2LayerStack: Stage2LayerEntry[]
  stage2ActiveLayerId: string | null
  stage2LayerOrderToken: number
  stage2LayerOrderAction: Stage2LayerOrderAction | null
  stage2SelectLayerToken: number
  stage2SelectLayerId: string | null
  persistLayoutSnapshot: (() => void) | null

  saveStage2Canvas: (json: string) => void
  setStage2ActiveTool: (tool: Stage2Tool) => void
  setStage2Selection: (selection: Stage2SelectionKind) => void
  setStage2TextFont: (font: Stage2Font) => void
  setStage2TextSize: (size: number) => void
  setStage2TextColor: (color: string) => void
  setStage2ShapeFill: (color: string) => void
  setStage2ShapeStroke: (color: string) => void
  setStage2ShapeTransparentFill: (transparent: boolean) => void
  setStage2GridSize: (size: number) => void
  setStage2ShowGrid: (show: boolean) => void
  setStage2SnapToGrid: (snap: boolean) => void
  setStage2AutofitToGrid: (autofit: boolean) => void
  requestStage2Rearrange: () => void
  requestStage2AddText: () => void
  addCutoutToLayout: (regionId: string) => void
  addAllCutoutsToLayout: () => void
  requestStage2DeleteSelection: () => void
  clearStage2PendingCutout: () => void
  setStage2LayerStack: (layers: Stage2LayerEntry[]) => void
  setStage2ActiveLayerId: (id: string | null) => void
  requestStage2LayerOrder: (action: Stage2LayerOrderAction) => void
  selectStage2Layer: (layerId: string) => void
  markStage2Initialized: () => void
  invalidateStage2Layout: () => void
  enterStage: () => void
  clearStage2Selection: () => void
  setPersistLayoutSnapshot: (handler: (() => void) | null) => void
  runPersistLayoutSnapshot: () => void
}

export const useStage2Store = create<Stage2State>((set, get) => ({
  stage2ActiveTool: 'select',
  stage2Selection: null,
  stage2TextFont: DEFAULT_STAGE2_TEXT.fontFamily,
  stage2TextSize: DEFAULT_STAGE2_TEXT.fontSize,
  stage2TextColor: DEFAULT_STAGE2_TEXT.fill,
  stage2ShapeFill: DEFAULT_STAGE2_SHAPE.fill,
  stage2ShapeStroke: DEFAULT_STAGE2_SHAPE.stroke,
  stage2ShapeTransparentFill: DEFAULT_STAGE2_SHAPE.transparentFill,
  stage2GridSize: DEFAULT_GRID_SIZE,
  stage2ShowGrid: true,
  stage2SnapToGrid: false,
  stage2AutofitToGrid: false,
  stage2CanvasJson: null,
  stage2NeedsInit: false,
  stage2RearrangeToken: 0,
  stage2AddTextToken: 0,
  stage2AddCutoutToken: 0,
  stage2DeleteToken: 0,
  stage2PendingCutoutId: null,
  stage2LayerStack: [],
  stage2ActiveLayerId: null,
  stage2LayerOrderToken: 0,
  stage2LayerOrderAction: null,
  stage2SelectLayerToken: 0,
  stage2SelectLayerId: null,
  persistLayoutSnapshot: null,

  saveStage2Canvas: (json) => {
    set({ stage2CanvasJson: json, stage2NeedsInit: false })
  },

  setStage2ActiveTool: (tool) => set({ stage2ActiveTool: tool }),

  setStage2Selection: (selection) => set({ stage2Selection: selection }),

  setStage2TextFont: (font) => set({ stage2TextFont: font }),

  setStage2TextSize: (size) => set({ stage2TextSize: Math.max(8, Math.min(size, 120)) }),

  setStage2TextColor: (color) => set({ stage2TextColor: color }),

  setStage2ShapeFill: (color) => set({ stage2ShapeFill: color }),

  setStage2ShapeStroke: (color) => set({ stage2ShapeStroke: color }),

  setStage2ShapeTransparentFill: (transparent) =>
    set({ stage2ShapeTransparentFill: transparent }),

  setStage2GridSize: (size) =>
    set({ stage2GridSize: Math.max(10, Math.min(size, 120)) }),

  setStage2ShowGrid: (show) => set({ stage2ShowGrid: show }),

  setStage2SnapToGrid: (snap) => set({ stage2SnapToGrid: snap }),

  setStage2AutofitToGrid: (autofit) => set({ stage2AutofitToGrid: autofit }),

  requestStage2Rearrange: () =>
    set((state) => ({ stage2RearrangeToken: state.stage2RearrangeToken + 1 })),

  requestStage2AddText: () =>
    set((state) => ({
      stage2AddTextToken: state.stage2AddTextToken + 1,
      stage2ActiveTool: 'select',
    })),

  addCutoutToLayout: (regionId) =>
    set((state) => ({
      stage2PendingCutoutId: regionId,
      stage2AddCutoutToken: state.stage2AddCutoutToken + 1,
      stage2ActiveTool: 'select',
    })),

  addAllCutoutsToLayout: () =>
    set((state) => ({
      stage2PendingCutoutId: '__all__',
      stage2AddCutoutToken: state.stage2AddCutoutToken + 1,
      stage2ActiveTool: 'select',
    })),

  requestStage2DeleteSelection: () =>
    set((state) => ({
      stage2DeleteToken: state.stage2DeleteToken + 1,
      stage2ActiveTool: 'select',
    })),

  clearStage2PendingCutout: () => set({ stage2PendingCutoutId: null }),

  setStage2LayerStack: (layers) => set({ stage2LayerStack: layers }),

  setStage2ActiveLayerId: (id) => set({ stage2ActiveLayerId: id }),

  requestStage2LayerOrder: (action) =>
    set((state) => ({
      stage2LayerOrderAction: action,
      stage2LayerOrderToken: state.stage2LayerOrderToken + 1,
      stage2ActiveTool: 'select',
    })),

  selectStage2Layer: (layerId) =>
    set((state) => ({
      stage2SelectLayerId: layerId,
      stage2SelectLayerToken: state.stage2SelectLayerToken + 1,
      stage2ActiveTool: 'select',
    })),

  markStage2Initialized: () => set({ stage2NeedsInit: false }),

  invalidateStage2Layout: () =>
    set({ stage2CanvasJson: null, stage2NeedsInit: false, stage2LayerStack: [], stage2ActiveLayerId: null }),

  enterStage: () =>
    set((state) => ({
      stage2NeedsInit: state.stage2CanvasJson === null,
      stage2ActiveTool: 'select',
      stage2Selection: null,
      stage2PendingCutoutId: null,
      stage2ActiveLayerId: null,
    })),

  clearStage2Selection: () => set({ stage2Selection: null }),

  setPersistLayoutSnapshot: (handler) => set({ persistLayoutSnapshot: handler }),

  runPersistLayoutSnapshot: () => {
    get().persistLayoutSnapshot?.()
  },
}))
