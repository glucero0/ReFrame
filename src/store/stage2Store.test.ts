import { beforeEach, describe, expect, it } from 'vitest'
import { useStage2Store } from './stage2Store'

function resetStage2Store(): void {
  useStage2Store.setState({
    stage2ActiveTool: 'rect',
    stage2Selection: null,
    stage2CanvasJson: '{"saved":true}',
    stage2NeedsInit: true,
    stage2AddTextToken: 0,
    stage2AddCutoutToken: 0,
    stage2PendingCutoutId: null,
  })
}

describe('useStage2Store token actions', () => {
  beforeEach(() => {
    resetStage2Store()
  })

  describe('requestStage2AddText', () => {
    it('increments add-text token only when requested', () => {
      useStage2Store.getState().requestStage2AddText()
      expect(useStage2Store.getState().stage2AddTextToken).toBe(1)

      useStage2Store.getState().setStage2TextFont('Georgia')
      useStage2Store.getState().setStage2TextSize(48)
      useStage2Store.getState().setStage2TextColor('#ff0000')
      expect(useStage2Store.getState().stage2AddTextToken).toBe(1)

      useStage2Store.getState().requestStage2AddText()
      expect(useStage2Store.getState().stage2AddTextToken).toBe(2)
    })

    it('switches to select tool when adding text', () => {
      useStage2Store.setState({ stage2ActiveTool: 'rect' })
      useStage2Store.getState().requestStage2AddText()
      expect(useStage2Store.getState().stage2ActiveTool).toBe('select')
    })
  })

  describe('addCutoutToLayout', () => {
    it('sets pending cutout id and increments add-cutout token', () => {
      useStage2Store.getState().addCutoutToLayout('region-42')

      const state = useStage2Store.getState()
      expect(state.stage2PendingCutoutId).toBe('region-42')
      expect(state.stage2AddCutoutToken).toBe(1)
      expect(state.stage2ActiveTool).toBe('select')
    })
  })

  describe('addAllCutoutsToLayout', () => {
    it('uses __all__ pending id and increments add-cutout token', () => {
      useStage2Store.getState().addAllCutoutsToLayout()

      const state = useStage2Store.getState()
      expect(state.stage2PendingCutoutId).toBe('__all__')
      expect(state.stage2AddCutoutToken).toBe(1)
    })
  })

  describe('invalidateStage2Layout', () => {
    it('clears saved canvas json and marks layout as not needing init', () => {
      useStage2Store.setState({
        stage2CanvasJson: '{"objects":[]}',
        stage2NeedsInit: true,
      })

      useStage2Store.getState().invalidateStage2Layout()

      const state = useStage2Store.getState()
      expect(state.stage2CanvasJson).toBe(null)
      expect(state.stage2NeedsInit).toBe(false)
    })
  })
})
