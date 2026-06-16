import { create } from 'zustand'
import type { AppStage } from '../lib/stage2Types'
import { layoutJsonHasContent } from '../lib/stage3Export'
import { useStage1Store } from './stage1Store'
import { useStage2Store } from './stage2Store'
import { useStage3Store } from './stage3Store'

export type AppState = {
  currentStage: AppStage
  goToStage2: () => Promise<boolean>
  goToStage3: () => boolean
  goToStage1: () => void
  returnToLayout: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentStage: 1,

  goToStage2: async () => {
    const stage1 = useStage1Store.getState()
    if (stage1.regions.length === 0) return false

    if (stage1.processedCuts.length === 0) {
      await stage1.regeneratePreviews()
    }

    const cuts = useStage1Store.getState().processedCuts
    if (cuts.length === 0) return false

    useStage2Store.getState().enterStage()
    set({ currentStage: 2 })
    return true
  },

  goToStage3: () => {
    useStage2Store.getState().runPersistLayoutSnapshot()
    const { stage2CanvasJson } = useStage2Store.getState()
    if (!layoutJsonHasContent(stage2CanvasJson)) return false

    useStage3Store.getState().enterStage()
    set({ currentStage: 3 })
    return true
  },

  goToStage1: () => {
    useStage2Store.getState().clearStage2Selection()
    set({ currentStage: 1 })
  },

  returnToLayout: () => {
    set({ currentStage: 2 })
  },
}))
