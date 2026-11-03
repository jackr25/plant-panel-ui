// Plant photos: downscaled before upload, fetched through the API client (so Tauri's
// HTTP plugin applies) and shown from object URLs cached per sensor and upload time.

import type { PlantSummary } from './icd';
import { api, settings } from './state.svelte';

const MAX_SIDE = 1024;
const JPEG_QUALITY = 0.85;

/** Re-encodes `file` as a JPEG at most 1024 px on its longest side (~100–300 KB). */
export async function downscale(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That file is not an image this app can read.');
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Could not encode the image'))),
      'image/jpeg',
      JPEG_QUALITY,
    ),
  );
}

const cache = new Map<string, { version: string; url: Promise<string> }>();

/** Object URL for the plant's current photo, or null if it has none. */
export function photoUrl(p: PlantSummary): Promise<string> | null {
  if (!p.photo) return null;
  const id = `${settings.server}|${p.sensor_id}`;
  const version = String(p.photo.updated);
  const hit = cache.get(id);
  if (hit?.version === version) return hit.url;
  hit?.url.then(URL.revokeObjectURL, () => {});
  const url = api()
    .photo(p.sensor_id)
    .then((b) => URL.createObjectURL(b));
  url.catch(() => {
    if (cache.get(id)?.url === url) cache.delete(id);
  });
  cache.set(id, { version, url });
  return url;
}
