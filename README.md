# ReFrame

Client-side image cutting, layout, and publishing tool. Upload or paste a composite image, draw cut regions, apply filters and background removal, arrange cutouts with text and shapes, then export as images or print-ready PDF — all in the browser with no server upload.

**Version:** 0.1.0 (prototype)

## Credits

Written with [Cursor Composer 2.5](https://cursor.com). Design and testing by Gary Lucero.

## Features at a glance

| Stage | Name | What you can do |
|-------|------|-----------------|
| 1 | **Cutout** | Draw rectangle/oval regions, padding, filters, background removal, live preview carousel, ZIP export, manage cutout library |
| 2 | **Layout** | Drag-and-drop grid, text and shapes, snap-to-grid, spacing controls |
| 3 | **Publish** | Scale to pixel or print sizes, export PNG/JPEG/WebP/PDF |

All image processing runs locally in your browser. Images never leave your machine.

## Setup

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

- **Build** — compile the production app (`npm run build`), then preview it locally (`npm run preview`; run build first).

## Testing

```bash
npm test
```

Tests use Vitest; see `src/**/*.test.ts`.

When you change the app, run tests and keep them useful: add tests for pure logic in `src/lib/` and important store behavior (navigation, invalidation, export settings) when they are easy to write and likely to catch real bugs. Skip tests that need heavy Fabric, canvas, or pixel-level mocking unless you keep hitting the same bug by hand. If Cutout, Layout, or Publish behavior changes, update or remove the affected tests in the same change — do not leave stale tests behind.

## Browser support

- **Core workflow** (upload, cut, filter, layout, export) — modern Chromium, Firefox, and Safari.
- **Manage cutouts folder library** — requires the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API) (Chrome or Edge on desktop). Without it, you can still work from the in-session cutout tray and continue to Layout.

## Resource limits

To keep the app responsive and reduce abuse risk, uploads and exports are capped (see `src/lib/limits.ts`):

- Max upload file size: 25 MB
- Max image dimension: 8192 px per side
- Max image pixels: ~16.8 MP (4096 × 4096)
- Max cut regions per image: 64

## Stage 1 — Cutout

1. **Load** — choose an image file or paste from clipboard (Ctrl+V).
2. **Draw regions** — use Rectangle or Oval tools; hold Shift for square/circle.
3. **Edit** — switch to Select to move/resize; Delete to remove.
4. **Padding** — set extra pixels around each cut.
5. **Filters** — filters apply to the selected cutout. Adjust brightness and contrast with sliders; toggle grayscale, threshold, and sharpen. **Advanced Filters** provides sliders for color/style, tone/lighting, and tint overlay.
6. **Background removal** — pick a background color from the cutout preview to make similar pixels transparent (PNG export preserves transparency; JPG fills with white).
7. **Preview carousel** — cutouts appear below the canvas and update as you edit regions, padding, or filters. Use **Refresh preview** in Export to force a re-run. Previous/Next and rotation controls let you review each cutout.
8. **Download ZIP** — export all cuts as PNG or JPG. Cuts with transparency still export as PNG inside the ZIP when JPG is selected.
9. **Manage cutouts** — open a full-screen library to review, filter, rotate, load from a folder, save back to disk, delete files, or send the set to Layout. Folder saves use timestamped unique filenames to avoid overwrites. Requires a Chromium-based desktop browser for folder access.
10. **Undo** — revert the last change to cut regions on the canvas (add, move, resize, or delete). The preview updates to match.
11. **Scroll/zoom** — use Ctrl+mouse wheel and/or +/- buttons to zoom in and out. Use scrollbars to move the view window on the canvas.
12. **Continue to Layout** — arrange cutouts, add text, and draw shapes.

## Stage 2 — Layout

1. **Arrange** — use Add or **Add all to layout** to add cutouts automatically, or drag from **Your Cutouts** to the layout area.
2. **Grid** — enable/disable grid, adjust cell size, drag to arrange, and use **Snap to Grid** and **Autofit** to auto-arrange cells. **Snap all cutouts to grid** re-aligns everything.
3. **Text** — **Add text**, then double-click to edit. Choose font, size, and color in the sidebar.
4. **Shapes** — draw rectangles or ovals (Shift = square/circle). Set transparency, fill, and/or outline colors.
5. **Select/Move** — move, resize, or delete (Delete key) any element.
6. **Tools** — Select/Move, Add text, Rectangle, and Oval buttons control the active tool and selection mode.
7. **Delete** — **Delete selection** removes the current selection.
8. **Back to Cutout** — return to adjust cuts; Layout invalidates when cuts change.
9. **Continue to Publish** — moves to Stage 3. The cutouts, shapes, and text as laid out in Stage 2 are brought forward without the grid. Disabled when the layout is empty.

## Stage 3 — Publish

1. **Select size and resolution** — Publish scales the layout to the chosen page or pixel size; DPI controls print density for PDF and image metadata. Publish renders your Layout (designed at 1000×800) scaled to fit the output you choose. For images, pick a pixel size preset or enter custom width and height. For PDF, pick a page size (US Letter, A4, 4×6″, 5×7″, or custom) and a print quality (DPI): 72 for screen or email, 150 for draft or large prints, 300 for standard home/office printing. Use **Original (1000×800)** to export at the same proportions as Layout; digital presets include 1920×1080, 1080×1080, 1080×1350, and 1080×1920. Higher DPI and larger sizes produce sharper prints but bigger files and slower exports.
2. **Save as image** — PNG, JPEG, or WebP.
3. **Save as PDF** — print-ready PDF.
4. **Back to Layout** — return to adjust the layout. Publish reflects the current Layout when you re-enter; changing cutouts invalidates Layout (and Publish) as in Stage 2.

## Stack

- React 19 + Vite + TypeScript
- Fabric.js (canvas regions and Stage 2 layout)
- Zustand (state)
- JSZip + file-saver (ZIP and file downloads)
- pdf-lib (PDF generation)
- Tailwind CSS (minimal UI)
- Vitest + Testing Library (unit tests)

## Project structure

```
src/
  components/stage1/   Cutout UI (canvas, filters, export, manage cutouts)
  components/stage2/   Layout UI (grid, toolbar, cutout strip)
  components/stage3/   Publish UI (canvas, export toolbar)
  hooks/               Live preview and canvas hooks
  lib/                 Pure logic (crop, filters, export, limits, folder I/O)
  store/               Zustand stores per stage + app navigation
```

## Deployment

The production build (`dist/`) can be hosted as a static site. Configuration is included for:

- **Firebase Hosting** — `firebase.json` (build first, then `firebase deploy`)
- **Vercel** — `vercel.json` includes security headers (CSP, X-Frame-Options, etc.)

No backend is required.
