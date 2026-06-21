import { describe, expect, it } from 'vitest'
import { DEFAULT_FILTERS, normalizeFilterSettings } from './filterDefaults'

describe('normalizeFilterSettings', () => {
  it('fills missing background-removal defaults', () => {
    const normalized = normalizeFilterSettings({ bgRemove: true })

    expect(normalized.bgRemove).toBe(true)
    expect(normalized.bgRemoveTolerance).toBe(DEFAULT_FILTERS.bgRemoveTolerance)
    expect(normalized.bgRemoveFromEdges).toBe(false)
    expect(normalized.bgRemoveColor).toBe(null)
  })

  it('clones manual background color', () => {
    const color = { r: 10, g: 20, b: 30 }
    const normalized = normalizeFilterSettings({
      ...DEFAULT_FILTERS,
      bgRemoveColor: color,
    })

    expect(normalized.bgRemoveColor).toEqual(color)
    expect(normalized.bgRemoveColor).not.toBe(color)
  })

  it('drops invalid manual background colors', () => {
    const normalized = normalizeFilterSettings({
      ...DEFAULT_FILTERS,
      bgRemoveColor: { r: Number.NaN, g: 0, b: 0 },
    })

    expect(normalized.bgRemoveColor).toBe(null)
  })
})
