"use client";

// Client-side image preparation. Phone photos are often 4–12 MB; they are
// downscaled and re-encoded before upload so records stay light.

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Couldn't read this image"));
    img.src = src;
  });
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Couldn't read this file"));
    reader.readAsDataURL(file);
  });
}

function draw(img: HTMLImageElement, maxSide: number, quality: number, square = false): string {
  const { naturalWidth: w, naturalHeight: h } = img;
  let sx = 0,
    sy = 0,
    sw = w,
    sh = h;
  if (square) {
    const side = Math.min(w, h);
    sx = (w - side) / 2;
    sy = (h - side) / 2;
    sw = sh = side;
  }
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image processing isn't available in this browser");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
}

/** Photo from camera/gallery → JPEG data URL, longest side ≤ 1400px. */
export async function compressPhoto(file: File, maxSide = 1400, quality = 0.82): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file");
  const src = await readFile(file);
  const img = await loadImage(src);
  return draw(img, maxSide, quality);
}

/** Small square thumbnail (for list rows) from a data URL or same-origin path. */
export async function makeThumbnail(src: string, size = 240): Promise<string> {
  const img = await loadImage(src);
  return draw(img, size, 0.78, true);
}
