const IDB_NAME = 'reframe-cutout-library'
const IDB_STORE = 'handles'
const FOLDER_HANDLE_KEY = 'cutoutFolder'

export type PngFolderEntry = {
  name: string
  handle: FileSystemFileHandle
}

function openHandleDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

export function isCutoutFolderSupported(): boolean {
  return typeof window.showDirectoryPicker === 'function'
}

export async function tryGetSavedFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isCutoutFolderSupported()) return null
  try {
    const db = await openHandleDb()
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const request = tx.objectStore(IDB_STORE).get(FOLDER_HANDLE_KEY)
      request.onsuccess = () => resolve((request.result as FileSystemDirectoryHandle | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('Failed to read folder handle'))
    })
    db.close()
    if (!handle) return null
    const permission = await handle.queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') return handle
    const requested = await handle.requestPermission({ mode: 'readwrite' })
    return requested === 'granted' ? handle : null
  } catch {
    return null
  }
}

export async function saveFolderHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  const db = await openHandleDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.objectStore(IDB_STORE).put(handle, FOLDER_HANDLE_KEY)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Failed to save folder handle'))
  })
  db.close()
}

export async function pickCutoutFolder(): Promise<FileSystemDirectoryHandle | null> {
  if (!isCutoutFolderSupported()) {
    throw new Error(
      'Your browser does not support choosing a folder. Try Chrome or Edge on desktop.',
    )
  }
  const handle = await window.showDirectoryPicker!({ mode: 'readwrite' })
  try {
    await saveFolderHandle(handle)
  } catch {
    // Persisting the handle is optional; continue with this session.
  }
  return handle
}

export async function resolveCutoutFolder(
  existing?: FileSystemDirectoryHandle | null,
): Promise<FileSystemDirectoryHandle> {
  if (existing) {
    const permission = await existing.queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') return existing
    const requested = await existing.requestPermission({ mode: 'readwrite' })
    if (requested === 'granted') return existing
  }

  const saved = await tryGetSavedFolderHandle()
  if (saved) return saved

  const picked = await pickCutoutFolder()
  if (!picked) throw new Error('Folder selection was cancelled.')
  return picked
}

function isPngName(name: string): boolean {
  return name.toLowerCase().endsWith('.png')
}

export async function listPngFiles(
  directory: FileSystemDirectoryHandle,
): Promise<PngFolderEntry[]> {
  const entries: PngFolderEntry[] = []
  for await (const entry of directory.values()) {
    if (entry.kind !== 'file' || !isPngName(entry.name)) continue
    entries.push({ name: entry.name, handle: entry as FileSystemFileHandle })
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
}

export async function readPngFile(handle: FileSystemFileHandle): Promise<Blob> {
  const file = await handle.getFile()
  if (!file.type.startsWith('image/')) {
    throw new Error(`"${file.name}" is not an image file.`)
  }
  return file
}

export async function writePngFile(
  directory: FileSystemDirectoryHandle,
  name: string,
  blob: Blob,
): Promise<FileSystemFileHandle> {
  const safeName = name.toLowerCase().endsWith('.png') ? name : `${name}.png`
  const handle = await directory.getFileHandle(safeName, { create: true })
  const writable = await handle.createWritable()
  await writable.write(blob)
  await writable.close()
  return handle
}

export async function deletePngFile(
  directory: FileSystemDirectoryHandle,
  name: string,
): Promise<void> {
  await directory.removeEntry(name)
}
