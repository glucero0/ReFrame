export type AppStage = 1 | 2 | 3

export type Stage2Tool = 'select' | 'text' | 'rect' | 'ellipse'

export type Stage2SelectionKind = 'cutout' | 'text' | 'shape' | null

export const STAGE2_FONTS = [
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Tahoma',
] as const

export type Stage2Font = (typeof STAGE2_FONTS)[number]

export const STAGE2_CANVAS_WIDTH = 1000
export const STAGE2_CANVAS_HEIGHT = 800

export const DEFAULT_STAGE2_TEXT = {
  fontFamily: 'Arial' as Stage2Font,
  fontSize: 24,
  fill: '#111827',
}

export const DEFAULT_STAGE2_SHAPE = {
  fill: '#dbeafe',
  stroke: '#2563eb',
  transparentFill: false,
}

export function createStage2Id(): string {
  return crypto.randomUUID()
}
