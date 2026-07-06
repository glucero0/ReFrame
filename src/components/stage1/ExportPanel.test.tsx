// @vitest-environment happy-dom
import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import ExportPanel from './ExportPanel'
import { useStage1Store, type Stage1State } from '../../store/stage1Store'
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

function setStage1State(overrides: Partial<Stage1State>): void {
  useStage1Store.setState({
    sourceImage: {} as HTMLImageElement,
    regions: [REGION],
    processedCuts: [],
    isProcessing: false,
    filterSliderDragging: false,
    ...overrides,
  })
}

describe('ExportPanel busy state', () => {
  afterEach(() => {
    cleanup()
  })

  it('enables Refresh preview and Continue to Layout when idle', () => {
    setStage1State({ isProcessing: false, filterSliderDragging: false })
    render(<ExportPanel />)

    expect(screen.getByRole('button', { name: 'Refresh preview' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Continue to Layout' })).toBeEnabled()
  })

  it('disables both buttons while a background regeneration is in flight', () => {
    setStage1State({ isProcessing: true, filterSliderDragging: false })
    render(<ExportPanel />)

    expect(screen.getByRole('button', { name: 'Updating…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue to Layout' })).toBeDisabled()
  })

  it('disables both buttons for the whole filter-slider hold, even while isProcessing is momentarily false', () => {
    // Regression test: previously "busy" was just isProcessing, which flips
    // true/false on every throttled regen tick while a filter slider is
    // held down. That made these buttons flicker enabled/disabled
    // continuously for the entire drag instead of staying put.
    setStage1State({ isProcessing: false, filterSliderDragging: true })
    render(<ExportPanel />)

    expect(screen.getByRole('button', { name: 'Updating…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Continue to Layout' })).toBeDisabled()
  })

  it('re-enables both buttons only once processing and dragging have both ended', () => {
    setStage1State({ isProcessing: true, filterSliderDragging: true })
    const { rerender } = render(<ExportPanel />)
    expect(screen.getByRole('button', { name: 'Updating…' })).toBeDisabled()

    setStage1State({ isProcessing: true, filterSliderDragging: false })
    rerender(<ExportPanel />)
    expect(screen.getByRole('button', { name: 'Updating…' })).toBeDisabled()

    setStage1State({ isProcessing: false, filterSliderDragging: false })
    rerender(<ExportPanel />)
    expect(screen.getByRole('button', { name: 'Refresh preview' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Continue to Layout' })).toBeEnabled()
  })
})
