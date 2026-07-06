// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import FilterPanel from './FilterPanel'
import { useStage1Store } from '../../store/stage1Store'
import type { RectRegion } from '../../lib/regionTypes'

const REGION: RectRegion = {
  id: 'region-1',
  type: 'rect',
  x: 0,
  y: 0,
  w: 100,
  h: 100,
  label: 1,
  rotation: 0,
}

function resetStore(): void {
  useStage1Store.setState({
    regions: [REGION],
    selectedRegionId: REGION.id,
    regionFilters: {},
    processedCuts: [],
    bgColorPickActive: false,
    filterSliderDragging: false,
  })
}

function getBrightnessSlider(): HTMLInputElement {
  return screen.getByRole('slider', { name: /brightness/i })
}

describe('FilterPanel slider hold tracking', () => {
  beforeEach(() => {
    resetStore()
  })

  afterEach(() => {
    cleanup()
  })

  it('marks filterSliderDragging true as soon as a range slider is pressed', () => {
    render(<FilterPanel />)
    fireEvent.pointerDown(getBrightnessSlider())
    expect(useStage1Store.getState().filterSliderDragging).toBe(true)
  })

  it('clears filterSliderDragging on pointerup, even when the release lands on an unrelated element', () => {
    // Regression test: pointerup's target is hit-tested against whatever is
    // physically under the cursor at release time. During a real drag the
    // cursor easily drifts off the (thin) slider track, so this event
    // rarely lands back on the input itself. Delegating release detection
    // via bubbling from the slider used to miss this and leave the flag
    // (and therefore the Refresh preview / Continue to Layout buttons)
    // stuck true/disabled indefinitely.
    render(<FilterPanel />)
    fireEvent.pointerDown(getBrightnessSlider())
    expect(useStage1Store.getState().filterSliderDragging).toBe(true)

    fireEvent.pointerUp(document.body)
    expect(useStage1Store.getState().filterSliderDragging).toBe(false)
  })

  it('clears filterSliderDragging on pointercancel from anywhere in the window', () => {
    render(<FilterPanel />)
    fireEvent.pointerDown(getBrightnessSlider())
    fireEvent.pointerCancel(document.body)
    expect(useStage1Store.getState().filterSliderDragging).toBe(false)
  })

  it('treats a held arrow key as dragging until keyup', () => {
    render(<FilterPanel />)
    const brightness = getBrightnessSlider()
    fireEvent.keyDown(brightness, { key: 'ArrowRight' })
    expect(useStage1Store.getState().filterSliderDragging).toBe(true)

    fireEvent.keyUp(brightness, { key: 'ArrowRight' })
    expect(useStage1Store.getState().filterSliderDragging).toBe(false)
  })

  it('ignores non-nudge keys so it does not get stuck dragging', () => {
    render(<FilterPanel />)
    fireEvent.keyDown(getBrightnessSlider(), { key: 'a' })
    expect(useStage1Store.getState().filterSliderDragging).toBe(false)
  })

  it('clears filterSliderDragging if the slider loses focus mid-drag', () => {
    render(<FilterPanel />)
    const brightness = getBrightnessSlider()
    fireEvent.keyDown(brightness, { key: 'ArrowRight' })
    expect(useStage1Store.getState().filterSliderDragging).toBe(true)

    fireEvent.blur(brightness)
    expect(useStage1Store.getState().filterSliderDragging).toBe(false)
  })

  it('does not mark dragging for pointer presses outside of range inputs', () => {
    render(<FilterPanel />)
    fireEvent.pointerDown(screen.getByText('Grayscale'))
    expect(useStage1Store.getState().filterSliderDragging).toBe(false)
  })

  it('unregisters its window listeners on unmount', () => {
    const { unmount } = render(<FilterPanel />)
    fireEvent.pointerDown(getBrightnessSlider())
    expect(useStage1Store.getState().filterSliderDragging).toBe(true)

    unmount()
    useStage1Store.getState().setFilterSliderDragging(true)
    fireEvent.pointerUp(document.body)
    // With the component unmounted, its window listener should be gone, so
    // this unrelated pointerup must not touch the flag.
    expect(useStage1Store.getState().filterSliderDragging).toBe(true)
  })
})
