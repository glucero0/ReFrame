# ReFrame

Client-side image cutting, layout, and publishing tool. Stage 1 (Cutout), allows the user to upload or paste a composite image, draw rectangle or oval cut regions, apply filters, preview cuts, and download a ZIP of the cutouts — all in the browser. Stage 2 (Layout) allows the user to lay out the cutouts and add shapes and text. Stage 3 (Publish) allows the user to publish their layout in a variety of formats, sizes, and resolutions.

## Setup

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build

- **Build** — compile the production app (`npm run build`), then preview it locally (`npm run preview`; run build first).

```bash
npm run build
npm run preview
```

## Testing

- **Testing** = run unit tests  

```bash
npm test
```

Tests use Vitest; see src/**/*.test.ts

When you change the app, run tests and keep them useful: add tests for pure logic in src/lib/ and important store behavior (navigation, invalidation, export settings) when they are easy to write and likely to catch real bugs. Skip tests that need heavy Fabric, canvas, or pixel-level mocking unless you keep hitting the same bug by hand. If Cutout, Layout, or Publish behavior changes, update or remove the affected tests in the same change — do not leave stale tests behind.

## Stage 1 - Cutout

1. **Load** — choose an image file or paste from clipboard (Ctrl+V).
2. **Draw regions** — use Rectangle or Oval tools; hold Shift for square/circle.
3. **Edit** — switch to Select to move/resize; Delete to remove.
4. **Padding** — set extra pixels around each cut.
5. **Filters** — Filter apply to the selected cutout. Adjust brightness, contrast using sliders. toggle on grayscale, threshold, sharpen via check boxes. Advanced Filters provides a variety of sliders for color/style, tone/lighting, and tint overlay.
6. **Rect/Oval** — Tools are used to create cutouts from image. Cutouts appear in the carousel below the canvas and update as you edit regions, padding, or filters. Use Refresh preview in Export to force a re-run.
7. **Download ZIP** — export all cuts as PNG or JPG.
8. **Undo** - revert the last change to cut regions on the canvas (add, move, resize, or delete). The preview updates to match.
9. **Scroll/zoom** - use ctrl-mouse wheel and/or +/- buttons to zoom in and out. Use scrollbars to move the view window in the canvas.
10. **Continue to Layout** — arrange cutouts, add text, and draw shapes.

## Stage 2 - Layout

1. **Arrange** — Use Add or "Add all to layout" buttons to add cutouts automatically, or drag from Your Cutouts to Layout area. 
2. **Grid** - Enable/disable grid. Adjust cell size. Drag to arrange and/or use Snap to Grid and autofit to auto-arrange cells. Use Snap all cutouts to grid to auto-arrange.
3. **Text** — **Add text**, then double-click to edit. Choose font, size, and color in the sidebar.
4. **Shapes** — draw rectangles or ovals (Shift = square/circle). Set transparency, fill and/or outline colors.
5. **Select/Move** — move, resize, or delete (Delete key) any element.
6. **Tools** - Select/Move, Add text, Rectangle, and Oval buttons control the tools and enable selection/move mode.
7. **Delete** - Delete selection button removes the current selection.
8. **Back to Cutout** — return to adjust cuts; Layout invalidates when cuts change.
9. **Continue to Publish** - moves to stage 3, Publish. The cutouts, shapes, and text as laid out in stage 2 is brought forward to stage 3 without the grid. If no layouts are present, Continue to Publish is disabled.

## Stage 3 - Publish

1. **Select Size and Resolution** - Publish scales the layout to the chosen page or pixel size; DPI controls print density for PDF and image metadata. Publish renders your Layout (designed at 1000×800) scaled to fit the output you choose. For images, pick a pixel size preset or enter custom width and height. For PDF, pick a page size (US Letter, A4, 4×6″, 5×7″, or custom) and a print quality (DPI): 72 for screen or email, 150 for draft or large prints, 300 for standard home/office printing. Use Original (1000×800) to export at the same proportions as Layout; digital presets include 1920×1080, 1080×1080, 1080×1350, and 1080×1920. Higher DPI and larger sizes produce sharper prints but bigger files and slower exports.
2. **Save as Image** - The layout can be saved in the following image formats: PNG, JPEG, and WEBP.
3. **Save as PDF** - The layout can be saved as a print-ready PDF file.
4. **Back to Layout** - return to adjust the layout. Publish reflects the current Layout when you re-enter; changing Cutouts invalidates Layout (and Publish) as in Stage 2.

## Stack

- React + Vite + TypeScript
- Fabric.js (canvas regions)
- Zustand (state)
- JSZip + file-saver (export)
- Tailwind CSS (minimal UI)
- pdf-lib (PDF generation)
