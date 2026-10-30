import { pdfjsPaths } from './assets';
import { PdfToolError } from './errors';
import { pdfjsRefKey } from './refs';

export type ExtractedImage = {
  width: number;
  height: number;
  rgba: Uint8ClampedArray | null;
  bilevel: boolean;
};

type ObjectStore = {
  get(id: string, callback?: (value: unknown) => void): unknown;
};

const GRAYSCALE_1BPP = 1;
const RGBA_32BPP = 3;

export async function extractEmbeddedImages(
  bytes: Uint8Array,
  fileName: string,
  onPage?: (pageNumber: number, pageCount: number) => void,
): Promise<Map<string, ExtractedImage>> {
  const pdfjs = await import('pdfjs-dist');
  const paths = pdfjsPaths();
  pdfjs.GlobalWorkerOptions.workerSrc = paths.workerSrc;

  const task = pdfjs.getDocument({
    data: bytes,
    wasmUrl: paths.wasmUrl,
    useWasm: true,
    useWorkerFetch: true,
    isOffscreenCanvasSupported: false,
    isImageDecoderSupported: false,
    disableFontFace: true,
    useSystemFonts: false,
    enableXfa: false,
    verbosity: 0,
    maxImageSize: 25_000_000,
  });

  try {
    const pdf = await task.promise;
    const images = new Map<string, ExtractedImage>();
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      onPage?.(pageNumber, pdf.numPages);
      const page = await pdf.getPage(pageNumber);
      try {
        const operators = await page.getOperatorList({
          annotationMode: pdfjs.AnnotationMode.DISABLE,
        });
        const seenOnPage = new Set<string>();
        for (let index = 0; index < operators.fnArray.length; index += 1) {
          const fn = operators.fnArray[index];
          if (fn !== pdfjs.OPS.paintImageXObject && fn !== pdfjs.OPS.paintImageXObjectRepeat) continue;
          const args = operators.argsArray[index] as unknown;
          const name = Array.isArray(args) ? args[0] : undefined;
          if (typeof name !== 'string' || seenOnPage.has(name)) continue;
          seenOnPage.add(name);
          const raw = (await readStore(page.objs, name)) ?? (await readStore(page.commonObjs, name));
          const image = await normalizeImage(raw);
          if (!image) continue;
          const key = pdfjsRefKey(image.ref);
          if (!key || images.has(key)) continue;
          images.set(key, {
            width: image.width,
            height: image.height,
            rgba: image.rgba,
            bilevel: image.bilevel,
          });
        }
      } finally {
        page.cleanup();
      }
    }
    return images;
  } catch (error) {
    if (error instanceof PdfToolError) throw error;
    throw describePdfError(error, fileName);
  } finally {
    await task.destroy();
  }
}

function describePdfError(error: unknown, fileName: string): PdfToolError {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';
  if (name === 'PasswordException' || /password|encrypted/i.test(message)) {
    return new PdfToolError(`${fileName} is encrypted. Remove the password on this device and try again.`);
  }
  if (name === 'InvalidPDFException' || /invalid pdf/i.test(message)) {
    return new PdfToolError(`${fileName} could not be read as a PDF.`);
  }
  return new PdfToolError(`Could not read ${fileName} on this device.`);
}

function readStore(store: ObjectStore, id: string): Promise<unknown | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 15000);
    try {
      store.get(id, (value: unknown) => {
        clearTimeout(timer);
        resolve(value ?? null);
      });
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });
}

async function normalizeImage(raw: unknown): Promise<{
  width: number;
  height: number;
  rgba: Uint8ClampedArray | null;
  bilevel: boolean;
  ref: unknown;
} | null> {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as {
    width?: unknown;
    height?: unknown;
    kind?: unknown;
    data?: unknown;
    bitmap?: ImageBitmap;
    ref?: unknown;
  };
  const width = Number(record.width);
  const height = Number(record.height);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) return null;
  const kind = typeof record.kind === 'number' ? record.kind : null;
  if (kind === GRAYSCALE_1BPP) {
    return { width, height, rgba: null, bilevel: true, ref: record.ref };
  }
  if (isBytes(record.data)) {
    const rgba = pixelsToRgba(record.data, width, height, kind);
    if (!rgba) return null;
    return { width, height, rgba, bilevel: false, ref: record.ref };
  }
  if (isBitmap(record.bitmap)) {
    const painted = await rgbaFromBitmap(record.bitmap);
    return {
      width: painted.width,
      height: painted.height,
      rgba: painted.rgba,
      bilevel: false,
      ref: record.ref,
    };
  }
  return null;
}

function isBytes(value: unknown): value is Uint8Array | Uint8ClampedArray {
  return value instanceof Uint8Array || value instanceof Uint8ClampedArray;
}

function isBitmap(value: unknown): value is ImageBitmap {
  return typeof ImageBitmap !== 'undefined' && value instanceof ImageBitmap;
}

function pixelsToRgba(
  data: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
  kind: number | null,
): Uint8ClampedArray | null {
  const pixels = width * height;
  if (kind === RGBA_32BPP || data.length === pixels * 4) {
    if (data.length < pixels * 4) return null;
    if (data instanceof Uint8ClampedArray && data.length === pixels * 4) return data;
    return new Uint8ClampedArray(data.subarray(0, pixels * 4));
  }
  if (data.length < pixels * 3) return null;
  const rgba = new Uint8ClampedArray(pixels * 4);
  for (let index = 0, offset = 0; index < pixels; index += 1, offset += 4) {
    const source = index * 3;
    rgba[offset] = data[source] ?? 0;
    rgba[offset + 1] = data[source + 1] ?? 0;
    rgba[offset + 2] = data[source + 2] ?? 0;
    rgba[offset + 3] = 255;
  }
  return rgba;
}

async function rgbaFromBitmap(bitmap: ImageBitmap): Promise<{ rgba: Uint8ClampedArray; width: number; height: number }> {
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new PdfToolError('This browser cannot draw on a canvas.');
  context.drawImage(bitmap, 0, 0);
  const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close();
  return { rgba: image.data, width: image.width, height: image.height };
}
