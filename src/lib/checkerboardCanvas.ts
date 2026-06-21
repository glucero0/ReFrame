const LIGHT = '#f9fafb'
const DARK = '#d1d5db'
const CELL_PX = 14

/** CSS background for preview areas — transparent pixels show the checkerboard through. */
export const CHECKERBOARD_BG = `repeating-conic-gradient(${DARK} 0% 25%, ${LIGHT} 0% 50%) 50% / ${CELL_PX}px ${CELL_PX}px`

export function drawCheckerboard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cellSize = 14,
): void {
  for (let y = 0; y < height; y += cellSize) {
    for (let x = 0; x < width; x += cellSize) {
      const isDark = (x / cellSize + y / cellSize) % 2 === 0
      ctx.fillStyle = isDark ? DARK : LIGHT
      ctx.fillRect(x, y, cellSize, cellSize)
    }
  }
}
