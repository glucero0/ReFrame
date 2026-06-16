import { STAGE2_CANVAS_HEIGHT, STAGE2_CANVAS_WIDTH } from './stage2Types'

export type ImageExportFormat = 'png' | 'jpeg' | 'webp'

export type PublishDpi = 72 | 150 | 300

export type SizePresetId =
  | 'original'
  | 'hd1080'
  | 'square'
  | 'portrait45'
  | 'story'
  | 'letter'
  | 'a4'
  | 'photo4x6'
  | 'photo5x7'
  | 'custom'

export type SizePreset = {
  id: SizePresetId
  label: string
  /** Pixel presets use fixed dimensions; print presets use inches. */
  kind: 'pixels' | 'print'
  widthPx?: number
  heightPx?: number
  widthIn?: number
  heightIn?: number
}

export const PIXEL_SIZE_PRESETS: SizePreset[] = [
  {
    id: 'original',
    label: 'Original (1000×800)',
    kind: 'pixels',
    widthPx: STAGE2_CANVAS_WIDTH,
    heightPx: STAGE2_CANVAS_HEIGHT,
  },
  {
    id: 'hd1080',
    label: '1920×1080 (16:9)',
    kind: 'pixels',
    widthPx: 1920,
    heightPx: 1080,
  },
  {
    id: 'square',
    label: '1080×1080 (square)',
    kind: 'pixels',
    widthPx: 1080,
    heightPx: 1080,
  },
  {
    id: 'portrait45',
    label: '1080×1350 (4:5)',
    kind: 'pixels',
    widthPx: 1080,
    heightPx: 1350,
  },
  {
    id: 'story',
    label: '1080×1920 (9:16)',
    kind: 'pixels',
    widthPx: 1080,
    heightPx: 1920,
  },
]

export const PRINT_SIZE_PRESETS: SizePreset[] = [
  {
    id: 'letter',
    label: 'US Letter (8.5×11 in)',
    kind: 'print',
    widthIn: 8.5,
    heightIn: 11,
  },
  {
    id: 'a4',
    label: 'A4 (210×297 mm)',
    kind: 'print',
    widthIn: 8.27,
    heightIn: 11.69,
  },
  {
    id: 'photo4x6',
    label: '4×6 in photo',
    kind: 'print',
    widthIn: 4,
    heightIn: 6,
  },
  {
    id: 'photo5x7',
    label: '5×7 in photo',
    kind: 'print',
    widthIn: 5,
    heightIn: 7,
  },
]

export const ALL_SIZE_PRESETS: SizePreset[] = [
  ...PIXEL_SIZE_PRESETS,
  ...PRINT_SIZE_PRESETS,
  { id: 'custom', label: 'Custom', kind: 'pixels' },
]

export const PUBLISH_DPI_OPTIONS: PublishDpi[] = [72, 150, 300]

export const LAYOUT_WIDTH = STAGE2_CANVAS_WIDTH
export const LAYOUT_HEIGHT = STAGE2_CANVAS_HEIGHT
