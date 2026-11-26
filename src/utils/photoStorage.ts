const DB_NAME = 'christmas_tree_gallery_v1';
const DB_VERSION = 1;
const STORE_NAME = 'photos';
const REMOVED_DEFAULTS_KEY = 'ct_removed_defaults_v1';

export interface StoredPhotoRecord {
  id: string;
  name: string;
  blob: Blob;
  createdAt: number;
}

const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'));
  });
}

export async function loadStoredPhotos(): Promise<StoredPhotoRecord[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const records = (req.result as StoredPhotoRecord[]).sort(
        (a, b) => b.createdAt - a.createdAt
      );
      resolve(records);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveStoredPhoto(record: StoredPhotoRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteStoredPhoto(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function isAcceptedImageFile(file: File): boolean {
  return ACCEPTED_MIME_TYPES.has(file.type);
}

export async function compressImageBlob(file: Blob, maxEdge = 1600): Promise<Blob | null> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = objectUrl;
    });

    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    if (Math.max(w, h) <= maxEdge) return file;

    const scale = maxEdge / Math.max(w, h);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(w * scale));
    canvas.height = Math.max(1, Math.round(h * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const outType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    return await new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob ?? file), outType, 0.88)
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function getRemovedDefaultIds(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(REMOVED_DEFAULTS_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function persistRemovedDefaultIds(ids: string[]): void {
  try {
    localStorage.setItem(REMOVED_DEFAULTS_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage quota / private mode errors
  }
}

export function formatCaptionFromFilename(name: string): string {
  const clean = name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
  if (!clean) return 'Winter Memory';
  return clean.length > 22 ? `${clean.slice(0, 21)}…` : clean;
}
