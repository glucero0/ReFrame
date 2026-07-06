import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from './appStore'
import { useStage1Store } from './stage1Store'
import { useStage2Store } from './stage2Store'
import type { ProcessedCut, Region } from '../lib/regionTypes'

const sampleRegion: Region = {
  id: 'region-1',
  type: 'rect',
  x: 0,
  y: 0,
  w: 100,
  h: 50,
  label: 1,
  rotation: 0,
}

const sampleCut: ProcessedCut = {
  regionId: 'region-1',
  label: 1,
  blob: new Blob(),
  previewUrl: 'preview.png',
  originalPreviewUrl: 'original.png',
  detectedBackgroundColor: null,
  bakedRotation: 0,
}

function resetStores(): void {
  useAppStore.setState({ currentStage: 1 })
  useStage1Store.setState({
    regions: [],
    processedCuts: [],
  })
  useStage2Store.setState({
    stage2Selection: null,
    stage2CanvasJson: null,
    stage2NeedsInit: false,
    stage2PendingCutoutId: null,
  })
}

describe('useAppStore', () => {
  beforeEach(() => {
    resetStores()
    vi.restoreAllMocks()
  })

  describe('goToStage2', () => {
    it('returns false when there are no regions', async () => {
      const ok = await useAppStore.getState().goToStage2()
      expect(ok).toBe(false)
      expect(useAppStore.getState().currentStage).toBe(1)
    })

    it('returns false when preview generation produces no cuts', async () => {
      useStage1Store.setState({
        regions: [sampleRegion],
        processedCuts: [],
      })
      vi.spyOn(useStage1Store.getState(), 'regeneratePreviews').mockResolvedValue(undefined)

      const ok = await useAppStore.getState().goToStage2()

      expect(ok).toBe(false)
      expect(useAppStore.getState().currentStage).toBe(1)
    })

    it('enters stage 2 when cuts exist', async () => {
      useStage1Store.setState({
        regions: [sampleRegion],
        processedCuts: [sampleCut],
      })
      useStage2Store.setState({
        stage2Selection: 'text',
        stage2CanvasJson: '{"objects":[]}',
      })

      const ok = await useAppStore.getState().goToStage2()

      expect(ok).toBe(true)
      expect(useAppStore.getState().currentStage).toBe(2)
      expect(useStage2Store.getState().stage2Selection).toBe(null)
      expect(useStage2Store.getState().stage2PendingCutoutId).toBe(null)
      expect(useStage2Store.getState().stage2NeedsInit).toBe(false)
    })

    it('calls regeneratePreviews when regions exist but cuts are empty', async () => {
      useStage1Store.setState({
        regions: [sampleRegion],
        processedCuts: [],
      })
      const regenerate = vi
        .spyOn(useStage1Store.getState(), 'regeneratePreviews')
        .mockImplementation(async () => {
          useStage1Store.setState({ processedCuts: [sampleCut] })
        })

      const ok = await useAppStore.getState().goToStage2()

      expect(regenerate).toHaveBeenCalledOnce()
      expect(ok).toBe(true)
      expect(useAppStore.getState().currentStage).toBe(2)
    })
  })

  describe('goToStage1', () => {
    it('returns to stage 1 and clears stage 2 selection', () => {
      useAppStore.setState({ currentStage: 2 })
      useStage2Store.setState({ stage2Selection: 'shape' })

      useAppStore.getState().goToStage1()

      expect(useAppStore.getState().currentStage).toBe(1)
      expect(useStage2Store.getState().stage2Selection).toBe(null)
    })
  })

  describe('goToStage3', () => {
    it('returns false when layout has no content', () => {
      useStage2Store.setState({ stage2CanvasJson: null })
      expect(useAppStore.getState().goToStage3()).toBe(false)
      expect(useAppStore.getState().currentStage).toBe(1)
    })

    it('enters publish when layout json has content', () => {
      useStage2Store.setState({
        stage2CanvasJson: JSON.stringify({
          objects: [{ data: { kind: 'cutout' } }],
        }),
      })

      expect(useAppStore.getState().goToStage3()).toBe(true)
      expect(useAppStore.getState().currentStage).toBe(3)
    })
  })

  describe('returnToLayout', () => {
    it('returns to layout stage from publish', () => {
      useAppStore.setState({ currentStage: 3 })
      useAppStore.getState().returnToLayout()
      expect(useAppStore.getState().currentStage).toBe(2)
    })
  })
})
