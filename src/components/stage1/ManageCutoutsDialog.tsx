import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppStore } from '../../store/appStore'
import {
  deletePngFile,
  isCutoutFolderSupported,
  listPngFiles,
  resolveCutoutFolder,
  writePngFile,
} from '../../lib/cutoutFolder'
import {
  generateUniqueCutoutFileName,
  manageItemsFromFolderEntries,
  manageItemsFromProcessedCuts,
  rerenderManageCutoutItem,
  revokeManageCutoutItem,
  revokeManageCutoutItems,
  type ManageCutoutItem,
} from '../../lib/manageCutouts'
import { normalizeRotation } from '../../lib/imageRotation'
import { DEFAULT_FILTERS, normalizeFilterSettings } from '../../lib/regionTypes'
import { useStage1Store } from '../../store/stage1Store'
import BeforeAfterCompare from './BeforeAfterCompare'
import CutoutFilterControls from './CutoutFilterControls'
import CutoutPreviewSurface from './CutoutPreviewSurface'

const PREVIEW_THROTTLE_MS = 100

type ManageCutoutsDialogProps = {
  onClose: () => void
}

export default function ManageCutoutsDialog({ onClose }: ManageCutoutsDialogProps) {
  const commitProcessedCuts = useStage1Store((s) => s.commitProcessedCuts)
  const goToStage2 = useAppStore((s) => s.goToStage2)

  const [items, setItems] = useState<ManageCutoutItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [folderHandle, setFolderHandle] = useState<FileSystemDirectoryHandle | null>(null)
  const [sessionChanged, setSessionChanged] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [bgColorPickActive, setBgColorPickActive] = useState(false)
  const [filterSliderDragging, setFilterSliderDragging] = useState(false)
  const [initializing, setInitializing] = useState(true)

  const itemsRef = useRef(items)
  itemsRef.current = items

  const selected = items.find((item) => item.id === selectedId) ?? null

  useEffect(() => {
    let cancelled = false
    const init = async () => {
      setInitializing(true)
      setError(null)
      try {
        const { processedCuts: cuts, regionFilters: filters } = useStage1Store.getState()
        const next =
          cuts.length > 0 ? await manageItemsFromProcessedCuts(cuts, filters) : []
        if (!cancelled) {
          itemsRef.current = next
          setItems(next)
          setSelectedId(next[0]?.id ?? null)
          setSessionChanged(false)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not open manage cutouts.')
        }
      } finally {
        if (!cancelled) setInitializing(false)
      }
    }
    void init()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    return () => {
      revokeManageCutoutItems(itemsRef.current)
    }
  }, [])

  const replaceItems = useCallback((next: ManageCutoutItem[]) => {
    revokeManageCutoutItems(itemsRef.current)
    itemsRef.current = next
    setItems(next)
  }, [])

  const updateSelectedItem = useCallback(async (partial: { filters?: ManageCutoutItem['filters']; rotation?: number }) => {
    const current = itemsRef.current.find((item) => item.id === selectedId)
    if (!current) return
    setIsBusy(true)
    try {
      const nextItem = await rerenderManageCutoutItem(current, {
        filters: partial.filters ?? current.filters,
        rotation: partial.rotation ?? current.rotation,
      })
      const nextItems = itemsRef.current.map((item) => (item.id === current.id ? nextItem : item))
      itemsRef.current = nextItems
      setItems(nextItems)
      setSessionChanged(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update cutout.')
    } finally {
      setIsBusy(false)
    }
  }, [selectedId])

  const regenTimerRef = useRef<number | null>(null)
  const pendingRegenRef = useRef<{ filters?: ManageCutoutItem['filters']; rotation?: number } | null>(null)

  const scheduleRegen = useCallback((partial: { filters?: ManageCutoutItem['filters']; rotation?: number }) => {
    if (selectedId) {
      setItems((current) =>
        current.map((item) =>
          item.id === selectedId
            ? {
                ...item,
                ...(partial.filters ? { filters: partial.filters } : {}),
                ...(partial.rotation !== undefined ? { rotation: partial.rotation } : {}),
              }
            : item,
        ),
      )
    }
    pendingRegenRef.current = { ...pendingRegenRef.current, ...partial }
    if (regenTimerRef.current !== null) window.clearTimeout(regenTimerRef.current)
    regenTimerRef.current = window.setTimeout(() => {
      regenTimerRef.current = null
      const pending = pendingRegenRef.current
      pendingRegenRef.current = null
      if (pending) void updateSelectedItem(pending)
    }, PREVIEW_THROTTLE_MS)
  }, [selectedId, updateSelectedItem])

  useEffect(() => {
    return () => {
      if (regenTimerRef.current !== null) window.clearTimeout(regenTimerRef.current)
    }
  }, [])

  const handleLoad = async () => {
    setError(null)
    setIsBusy(true)
    try {
      const directory = await resolveCutoutFolder(folderHandle)
      setFolderHandle(directory)
      const entries = await listPngFiles(directory)
      if (entries.length === 0) {
        setError('No PNG cutouts were found in that folder.')
        return
      }
      const loaded = await manageItemsFromFolderEntries(entries)
      replaceItems(loaded)
      setSelectedId(loaded[0]?.id ?? null)
      setSessionChanged(true)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Could not load cutouts from folder.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleSaveToFolder = async () => {
    if (items.length === 0) return
    setError(null)
    setIsBusy(true)
    try {
      const directory = await resolveCutoutFolder(folderHandle)
      setFolderHandle(directory)
      const nextItems: ManageCutoutItem[] = []
      for (let index = 0; index < items.length; index += 1) {
        const item = items[index]
        const name = item.fileName ?? generateUniqueCutoutFileName(item.label)
        const handle = await writePngFile(directory, name, item.blob)
        nextItems.push({ ...item, fileName: name, fileHandle: handle })
      }
      itemsRef.current = nextItems
      setItems(nextItems)
      setSessionChanged(true)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      setError(err instanceof Error ? err.message : 'Could not save cutouts to folder.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setError(null)
    setIsBusy(true)
    try {
      if (selected.fileName && folderHandle) {
        await deletePngFile(folderHandle, selected.fileName)
      }
      const nextItems = itemsRef.current.filter((item) => item.id !== selected.id)
      revokeManageCutoutItem(selected)
      itemsRef.current = nextItems
      setItems(nextItems)
      setSelectedId(nextItems[0]?.id ?? null)
      setSessionChanged(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete cutout.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleReturn = () => {
    if (sessionChanged) {
      const confirmed = window.confirm(
        'Discard the cutouts shown here and return to Stage 1? Your original cutout tray will stay as it was.',
      )
      if (!confirmed) return
    }
    onClose()
  }

  const handleMoveToLayout = async () => {
    if (items.length === 0) return
    setError(null)
    setIsBusy(true)
    try {
      const cuts = items.map((item) => ({
        regionId: item.id,
        label: item.label,
        blob: item.blob,
        previewUrl: item.previewUrl,
        originalPreviewUrl: item.originalPreviewUrl,
        detectedBackgroundColor: item.detectedBackgroundColor,
        bakedRotation: item.rotation,
      }))
      commitProcessedCuts(cuts)
      itemsRef.current = []
      setItems([])
      const ok = await goToStage2()
      if (!ok) {
        setError('Could not continue to Layout.')
        return
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not move to Layout.')
    } finally {
      setIsBusy(false)
    }
  }

  const busy = isBusy || filterSliderDragging

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-cutouts-title"
      >
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <div>
            <h2 id="manage-cutouts-title" className="text-lg font-semibold text-gray-900">
              Manage cutouts
            </h2>
            <p className="text-sm text-gray-500">
              {items.length} cutout{items.length === 1 ? '' : 's'}
              {!isCutoutFolderSupported() ? ' · Folder access needs Chrome or Edge on desktop' : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !isCutoutFolderSupported()}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
              onClick={() => void handleLoad()}
            >
              Load
            </button>
            <button
              type="button"
              disabled={busy || items.length === 0 || !isCutoutFolderSupported()}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
              onClick={() => void handleSaveToFolder()}
            >
              Save to folder
            </button>
            <button
              type="button"
              disabled={busy || !selected}
              className="rounded border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
              onClick={() => void handleDelete()}
            >
              Delete
            </button>
            <button
              type="button"
              disabled={busy || items.length === 0}
              className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-40"
              onClick={() => void handleMoveToLayout()}
            >
              Move to Layout
            </button>
            <button
              type="button"
              disabled={busy}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50 disabled:opacity-40"
              onClick={handleReturn}
            >
              Return
            </button>
          </div>
        </header>

        {error && (
          <div className="shrink-0 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {initializing ? (
          <div className="flex flex-1 items-center justify-center p-8 text-sm text-gray-500">
            Opening manage cutouts…
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[16rem_minmax(0,1fr)_18rem]">
            <aside className="min-h-0 overflow-y-auto border-b border-gray-200 p-3 lg:border-b-0 lg:border-r">
              {items.length === 0 ? (
                <p className="text-sm text-gray-500">
                  No cutouts yet. Use Load to open a folder of PNG cutouts, or close and create
                  cutouts in Stage 1 first.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 lg:grid-cols-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(item.id)
                        setBgColorPickActive(false)
                      }}
                      className={`rounded border p-1 text-left ${
                        item.id === selectedId
                          ? 'border-blue-600 ring-1 ring-blue-600'
                          : 'border-gray-200 hover:border-gray-400'
                      }`}
                      title={item.fileName ?? `Cutout ${item.label}`}
                    >
                      <CutoutPreviewSurface
                        src={item.previewUrl}
                        alt={`Cutout ${item.label}`}
                        surfaceClassName="h-16 w-full object-contain"
                      />
                      <span className="mt-1 block truncate text-xs text-gray-600">
                        {item.fileName ?? `#${item.label}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            <main className="flex min-h-0 flex-col overflow-hidden border-b border-gray-200 p-3 lg:border-b-0 lg:border-r">
              {selected ? (
                <>
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {selected.fileName ?? `Cutout ${selected.label}`}
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
                      onClick={() =>
                        scheduleRegen({
                          rotation: normalizeRotation(selected.rotation - 90),
                        })
                      }
                    >
                      ↺ 90°
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      className="rounded border border-gray-300 bg-white px-2 py-1 text-sm hover:bg-gray-50 disabled:opacity-40"
                      onClick={() =>
                        scheduleRegen({
                          rotation: normalizeRotation(selected.rotation + 90),
                        })
                      }
                    >
                      ↻ 90°
                    </button>
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <span>{Math.round(selected.rotation)}°</span>
                      <input
                        type="range"
                        min={0}
                        max={359}
                        value={Math.round(selected.rotation)}
                        disabled={busy}
                        onChange={(e) =>
                          scheduleRegen({ rotation: Number(e.target.value) })
                        }
                        className="w-32"
                      />
                    </label>
                  </div>
                  <div className="min-h-0 flex-1">
                    <BeforeAfterCompare
                      originalUrl={selected.originalPreviewUrl}
                      editedUrl={selected.previewUrl}
                      alt={`Cutout ${selected.label}`}
                      fillHeight
                      pickColorActive={bgColorPickActive}
                      onPickColor={(color) => {
                        scheduleRegen({
                          filters: {
                            ...normalizeFilterSettings(selected.filters),
                            bgRemove: true,
                            bgRemoveColor: color,
                          },
                        })
                        setBgColorPickActive(false)
                      }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-gray-500">
                  Select a cutout to preview and edit.
                </div>
              )}
            </main>

            <aside className="min-h-0 overflow-y-auto p-3">
              {selected ? (
                <CutoutFilterControls
                  filters={normalizeFilterSettings(selected.filters)}
                  disabled={busy}
                  label={selected.fileName ?? `Cutout ${selected.label}`}
                  helpText="Filters apply to the selected cutout."
                  detectedBackgroundColor={selected.detectedBackgroundColor}
                  showAdvanced={showAdvanced}
                  onToggleAdvanced={() => setShowAdvanced((open) => !open)}
                  onChange={(partial) =>
                    scheduleRegen({
                      filters: normalizeFilterSettings({
                        ...selected.filters,
                        ...partial,
                      }),
                    })
                  }
                  onReset={() =>
                    scheduleRegen({
                      filters: { ...DEFAULT_FILTERS },
                    })
                  }
                  bgColorPickActive={bgColorPickActive}
                  onBgColorPickToggle={() => setBgColorPickActive((active) => !active)}
                  pickColorHelpText="Click the original preview to pick a background color."
                  onSliderDraggingChange={setFilterSliderDragging}
                />
              ) : (
                <p className="text-sm text-gray-500">Select a cutout to adjust filters.</p>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  )
}
