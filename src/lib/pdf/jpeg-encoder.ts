import { localAsset } from './assets';
import { PdfToolError } from './errors';

type JpegModule = typeof import('@jsquash/jpeg/encode');

let encoderPromise: Promise<JpegModule> | null = null;

/**
 * MozJPEG compiled to WASM, copied into the build from @jsquash/jpeg.
 * The bytes are fetched from this origin only — never from a CDN.
 */
function loadEncoder(): Promise<JpegModule> {
  if (!encoderPromise) {
    encoderPromise = (async () => {
      const jpeg = await import('@jsquash/jpeg/encode');
      const url = localAsset('codecs/mozjpeg_enc.wasm');
      const response = await fetch(url);
      if (!response.ok) {
        throw new PdfToolError('The local JPEG encoder could not be loaded.');
      }
      const wasmBinary = await response.arrayBuffer();
      await jpeg.init({
        wasmBinary,
        locateFile: () => url,
      });
      return jpeg;
    })().catch((error: unknown) => {
      encoderPromise = null;
      throw error;
    });
  }
  return encoderPromise;
}

export async function encodeJpeg(image: ImageData, quality: number): Promise<Uint8Array> {
  const jpeg = await loadEncoder();
  const encoded = await jpeg.default(image, {
    quality,
    baseline: true,
    progressive: false,
  });
  const bytes = new Uint8Array(encoded);
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    throw new PdfToolError('The local JPEG encoder returned an unreadable image.');
  }
  return bytes;
}
