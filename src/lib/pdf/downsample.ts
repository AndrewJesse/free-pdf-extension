import { PdfToolError } from './errors';

/**
 * Draw the image on an HTML canvas and downsample so the long edge
 * stays near print-readable DPI (about 140 DPI on a letter page).
 * Opaque white sits behind the image so a later JPEG has no alpha.
 */
export async function downsampleOnCanvas(
  rgba: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
  maxLongEdge: number,
): Promise<ImageData> {
  const longEdge = Math.max(sourceWidth, sourceHeight);
  const scale = longEdge > maxLongEdge ? maxLongEdge / longEdge : 1;
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const source = await sourceBitmap(rgba, sourceWidth, sourceHeight);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    source.close();
    throw new PdfToolError('This browser cannot draw on a canvas.');
  }
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(source, 0, 0, width, height);
  source.close();
  return context.getImageData(0, 0, width, height);
}

async function sourceBitmap(
  rgba: Uint8ClampedArray,
  sourceWidth: number,
  sourceHeight: number,
): Promise<ImageBitmap> {
  const pixels = ownedPixels(rgba);
  try {
    return await createImageBitmap(new ImageData(pixels, sourceWidth, sourceHeight));
  } catch {
    const fitted = boxFit(pixels, sourceWidth, sourceHeight, 2048);
    return createImageBitmap(new ImageData(fitted.rgba, fitted.width, fitted.height));
  }
}

function ownedPixels(data: Uint8ClampedArray): Uint8ClampedArray<ArrayBuffer> {
  const copy = new Uint8ClampedArray(new ArrayBuffer(data.length));
  copy.set(data);
  return copy;
}

function boxFit(
  rgba: Uint8ClampedArray<ArrayBuffer>,
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
): { rgba: Uint8ClampedArray<ArrayBuffer>; width: number; height: number } {
  const longEdge = Math.max(sourceWidth, sourceHeight);
  if (longEdge <= maxEdge) return { rgba, width: sourceWidth, height: sourceHeight };
  const scale = maxEdge / longEdge;
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const output = new Uint8ClampedArray(new ArrayBuffer(width * height * 4));
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(sourceHeight - 1, Math.floor((y * sourceHeight) / height));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(sourceWidth - 1, Math.floor((x * sourceWidth) / width));
      const from = (sourceY * sourceWidth + sourceX) * 4;
      const to = (y * width + x) * 4;
      output[to] = rgba[from] ?? 0;
      output[to + 1] = rgba[from + 1] ?? 0;
      output[to + 2] = rgba[from + 2] ?? 0;
      output[to + 3] = rgba[from + 3] ?? 255;
    }
  }
  return { rgba: output, width, height };
}
