import { beforeEach, describe, expect, it } from 'vitest'
import { useStage1Store } from './stage1Store'

describe('useStage1Store filterSliderDragging', () => {
  beforeEach(() => {
    useStage1Store.setState({ filterSliderDragging: false })
  })

  it('defaults to false', () => {
    expect(useStage1Store.getState().filterSliderDragging).toBe(false)
  })

  it('setFilterSliderDragging toggles the flag independently of other state', () => {
    useStage1Store.getState().setFilterSliderDragging(true)
    expect(useStage1Store.getState().filterSliderDragging).toBe(true)

    useStage1Store.getState().setFilterSliderDragging(false)
    expect(useStage1Store.getState().filterSliderDragging).toBe(false)
  })
})
