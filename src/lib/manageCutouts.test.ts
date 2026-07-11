import { describe, expect, it } from 'vitest'
import { formatCutoutTimestamp, generateUniqueCutoutFileName } from './manageCutouts'

describe('formatCutoutTimestamp', () => {
  it('formats a filesystem-safe timestamp', () => {
    const stamp = formatCutoutTimestamp(new Date(2025, 6, 11, 6, 59, 30))
    expect(stamp).toBe('20250711-065930')
  })
})

describe('generateUniqueCutoutFileName', () => {
  it('includes zero-padded label, timestamp, and unique id', () => {
    const name = generateUniqueCutoutFileName(3, new Date(2025, 6, 11, 6, 59, 30))
    expect(name).toMatch(/^cutout-03-20250711-065930-[a-f0-9]{8}\.png$/)
  })

  it('generates distinct names for the same label', () => {
    const now = new Date(2025, 6, 11, 6, 59, 30)
    const first = generateUniqueCutoutFileName(1, now)
    const second = generateUniqueCutoutFileName(1, now)
    expect(first).not.toBe(second)
  })
})
