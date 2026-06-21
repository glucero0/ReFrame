import { describe, expect, it } from 'vitest'
import {
  buildLayerStack,
  formatLayerLabel,
  getLayerObjectId,
  isLayerableObject,
} from './stage2Layers'

function mockObject(
  kind: string,
  data: Record<string, unknown> = {},
  extra: Record<string, unknown> = {},
) {
  return {
    get: (key: string) => (key === 'data' ? { kind, ...data } : undefined),
    ...extra,
  }
}

describe('stage2Layers', () => {
  describe('isLayerableObject', () => {
    it('treats cutouts, text, and shapes as layerable', () => {
      expect(isLayerableObject(mockObject('cutout') as never)).toBe(true)
      expect(isLayerableObject(mockObject('text') as never)).toBe(true)
      expect(isLayerableObject(mockObject('shape') as never)).toBe(true)
    })

    it('excludes background', () => {
      expect(isLayerableObject(mockObject('background') as never)).toBe(false)
    })
  })

  describe('getLayerObjectId', () => {
    it('uses region id for cutouts', () => {
      const obj = mockObject('cutout', { regionId: 'r1', label: '3' })
      expect(getLayerObjectId(obj as never)).toBe('cutout:r1')
    })

    it('uses data id for text and shapes', () => {
      const text = mockObject('text', { id: 'text-1' })
      const shape = mockObject('shape', { id: 'shape-1' })
      expect(getLayerObjectId(text as never)).toBe('text-1')
      expect(getLayerObjectId(shape as never)).toBe('shape-1')
    })
  })

  describe('formatLayerLabel', () => {
    it('labels cutouts with their number', () => {
      const obj = mockObject('cutout', { label: '7' })
      expect(formatLayerLabel(obj as never)).toBe('Cutout #7')
    })

    it('truncates long text labels', () => {
      const obj = mockObject('text', { id: 't1' }, { text: 'a'.repeat(30) })
      expect(formatLayerLabel(obj as never)).toBe(`${'a'.repeat(24)}…`)
    })

    it('names shapes by geometry type', () => {
      const rect = mockObject('shape', { id: 's1' }, { type: 'rect' })
      const ellipse = mockObject('shape', { id: 's2' }, { type: 'ellipse' })
      expect(formatLayerLabel(rect as never)).toBe('Rectangle')
      expect(formatLayerLabel(ellipse as never)).toBe('Oval')
    })
  })

  describe('buildLayerStack', () => {
    it('lists layerable objects front-to-back', () => {
      const background = mockObject('background')
      const shape = mockObject('shape', { id: 'shape-1' }, { type: 'rect' })
      const cutout = mockObject('cutout', { regionId: 'r1', label: '1' })
      const canvas = {
        getObjects: () => [background, shape, cutout],
      }

      expect(buildLayerStack(canvas as never)).toEqual([
        { id: 'cutout:r1', kind: 'cutout', label: 'Cutout #1' },
        { id: 'shape-1', kind: 'shape', label: 'Rectangle' },
      ])
    })
  })
})
