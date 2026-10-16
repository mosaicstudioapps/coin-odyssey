'use client';

// Coin photos from a file input, resized in the browser before upload. The
// photo bucket accepts JPEG, PNG, or WebP up to 5 MB; everything is saved as
// JPEG, like the mobile app.

export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const PHOTO_ACCEPT_ATTRIBUTE = ACCEPTED_PHOTO_TYPES.join(',');

const MAX_BYTES = 5 * 1024 * 1024;
/** Plenty for a coin's date and mint mark on a big screen, and well under 5 MB. */
const MAX_EDGE_PX = 1600;
const QUALITY_STEPS = [0.85, 0.75, 0.65];

export class PhotoError extends Error {}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
}

/** Resize a chosen photo to a JPEG under the bucket's limit. */
export async function preparePhoto(file: File): Promise<Blob> {
  if (!(ACCEPTED_PHOTO_TYPES as readonly string[]).includes(file.type)) {
    throw new PhotoError('Use a JPEG, PNG, or WebP photo.');
  }
  let bitmap: ImageBitmap;
  try {
    // Browsers apply the photo's EXIF rotation here, so phone photos come out upright.
    bitmap = await createImageBitmap(file);
  } catch {
    throw new PhotoError('That photo could not be read. Try another one.');
  }
  const scale = Math.min(1, MAX_EDGE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new PhotoError('This browser could not prepare the photo.');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of QUALITY_STEPS) {
    const blob = await toBlob(canvas, quality);
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new PhotoError('That photo is too large. Try a smaller one.');
}
