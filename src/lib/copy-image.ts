/**
 * Copies an image to the clipboard as PNG (the only image type browsers accept).
 * Falls back to /api/proxy when the image host doesn't allow CORS.
 */

export async function fetchImageBlob(url: string): Promise<Blob> {
  // blob:/data: URLs and CORS-enabled hosts work directly
  try {
    const res = await fetch(url);
    if (res.ok) return await res.blob();
  } catch {
    // probably CORS: try the proxy below
  }
  const res = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error(`Image download failed (${res.status})`);
  return res.blob();
}

async function toPngBlob(blob: Blob): Promise<Blob> {
  if (blob.type === 'image/png') return blob;
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('PNG conversion failed'))), 'image/png')
  );
}

/** Copies the image itself (never the link). Throws if the browser can't. */
export async function copyImageToClipboard(url: string): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error('This browser cannot copy images to the clipboard');
  }
  // Pass a promise so Safari keeps the user gesture while we download
  const png = fetchImageBlob(url).then(toPngBlob);
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
