export type FilterSettings = {
  brightness: number
  contrast: number
  grayscale: boolean
  threshold: boolean
  sharpen: boolean
  saturation: number
  hueRotate: number
  invert: number
  sepia: number
  blur: number
  exposure: number
  gamma: number
  vignette: number
  tintRed: number
  tintGreen: number
  tintBlue: number
}

export const DEFAULT_FILTERS: FilterSettings = {
  brightness: 0,
  contrast: 0,
  grayscale: false,
  threshold: false,
  sharpen: false,
  saturation: 100,
  hueRotate: 0,
  invert: 0,
  sepia: 0,
  blur: 0,
  exposure: 0,
  gamma: 1,
  vignette: 0,
  tintRed: 0,
  tintGreen: 0,
  tintBlue: 0,
}

export function hasActiveFilters(settings: FilterSettings): boolean {
  return (
    settings.brightness !== 0 ||
    settings.contrast !== 0 ||
    settings.grayscale ||
    settings.threshold ||
    settings.sharpen ||
    settings.saturation !== 100 ||
    settings.hueRotate !== 0 ||
    settings.invert !== 0 ||
    settings.sepia !== 0 ||
    settings.blur !== 0 ||
    settings.exposure !== 0 ||
    settings.gamma !== 1 ||
    settings.vignette !== 0 ||
    settings.tintRed !== 0 ||
    settings.tintGreen !== 0 ||
    settings.tintBlue !== 0
  )
}
