export type CutoutTrayViewMode = 'fit' | 'actual'

export function formatPixelDimensions(width: number, height: number): string {
  return `${width} × ${height} px`
}
