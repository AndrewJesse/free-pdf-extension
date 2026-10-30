import { downsampleOnCanvas } from './downsample';
import { PdfToolError } from './errors';
import { extractEmbeddedImages } from './extract-images';
import { formatBytes } from './format';
import { encodeJpeg } from './jpeg-encoder';
import { assertPdf, readFileBytes } from './read-file';
import { pdfRefKey } from './refs';
import type { ProgressHandler } from './types';

export const NO_EMBEDDED_IMAGES_MESSAGE = 'No embedded images were found. Pages were left intact.';

/**
 * Cap the long edge around 2200px (about 250 DPI on letter width) and
 * re-encode with MozJPEG at quality 80. On image-heavy photos that is
 * about a 50–70% smaller PDF. Pages without images are not rewritten.
 */
const MAX_LONG_EDGE = 2200;
const JPEG_QUALITY = 80;

export type CompressResult = {
  bytes: Uint8Array;
  changed: boolean;
  message: string;
  originalBytes: number;
  outputBytes: number;
  imageCount: number;
  compressedCount: number;
};

type PdfLib = typeof import('pdf-lib');

type ImageXObject = {
  ref: import('pdf-lib').PDFRef;
  refKey: string;
  dict: import('pdf-lib').PDFDict;
  streamLength: number;
  hasMask: boolean;
};

export async function compressPdfFile(file: File, onProgress?: ProgressHandler): Promise<CompressResult> {
  onProgress?.({ progress: 0.04, message: `Reading ${file.name}` });
  const original = await readFileBytes(file);
  assertPdf(original, file.name);
  const originalBytes = original.byteLength;

  onProgress?.({ progress: 0.12, message: 'Looking for embedded images' });
  const extracted = await extractEmbeddedImages(original.slice(), file.name, (pageNumber, pageCount) => {
    onProgress?.({
      progress: 0.12 + (pageNumber / pageCount) * 0.28,
      message: `Reading page ${pageNumber} of ${pageCount}`,
    });
  });

  const pdfLib = await import('pdf-lib');
  let document;
  try {
    document = await pdfLib.PDFDocument.load(original);
  } catch (error) {
    if (error instanceof pdfLib.EncryptedPDFError) {
      throw new PdfToolError(`${file.name} is encrypted. Remove the password on this device and try again.`);
    }
    throw new PdfToolError(`${file.name} could not be read as a PDF.`);
  }

  const images = listImageXObjects(document, pdfLib);
  if (images.length === 0) {
    onProgress?.({ progress: 1, message: NO_EMBEDDED_IMAGES_MESSAGE });
    return unchanged(original, NO_EMBEDDED_IMAGES_MESSAGE, 0, 0);
  }

  let compressedCount = 0;
  let skippedMask = 0;
  let skippedBilevel = 0;

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    if (!image) continue;
    onProgress?.({
      progress: 0.42 + ((index + 1) / images.length) * 0.46,
      message: `Compressing image ${index + 1} of ${images.length}`,
    });
    if (image.hasMask) {
      skippedMask += 1;
      continue;
    }
    const decoded = extracted.get(image.refKey);
    if (!decoded) continue;
    if (decoded.bilevel || !decoded.rgba) {
      skippedBilevel += 1;
      continue;
    }
    const sampled = await downsampleOnCanvas(decoded.rgba, decoded.width, decoded.height, MAX_LONG_EDGE);
    const jpeg = await encodeJpeg(sampled, JPEG_QUALITY);
    if (jpeg.byteLength >= image.streamLength) continue;
    replaceImage(document, pdfLib, image, jpeg, sampled.width, sampled.height);
    compressedCount += 1;
  }

  if (compressedCount === 0) {
    const message = untouchedMessage(skippedMask, skippedBilevel);
    onProgress?.({ progress: 1, message });
    return unchanged(original, message, images.length, 0);
  }

  onProgress?.({ progress: 0.94, message: 'Building PDF' });
  const saved = await document.save();
  if (saved.byteLength >= originalBytes) {
    const message = 'Recompression would not make this PDF smaller. Pages were left intact.';
    onProgress?.({ progress: 1, message });
    return unchanged(original, message, images.length, 0);
  }

  const message = compressedMessage({
    originalBytes,
    outputBytes: saved.byteLength,
    compressedCount,
    skippedMask,
    skippedBilevel,
  });
  onProgress?.({ progress: 1, message });
  return {
    bytes: saved,
    changed: true,
    message,
    originalBytes,
    outputBytes: saved.byteLength,
    imageCount: images.length,
    compressedCount,
  };
}

function unchanged(original: Uint8Array, message: string, imageCount: number, compressedCount: number): CompressResult {
  return {
    bytes: original,
    changed: false,
    message,
    originalBytes: original.byteLength,
    outputBytes: original.byteLength,
    imageCount,
    compressedCount,
  };
}

function untouchedMessage(skippedMask: number, skippedBilevel: number): string {
  if (skippedMask > 0 && skippedBilevel === 0) {
    return 'Embedded images use transparency and were left unchanged. Pages were left intact.';
  }
  if (skippedBilevel > 0 && skippedMask === 0) {
    return 'Embedded images are bilevel and were left unchanged. Pages were left intact.';
  }
  return 'Embedded images were left unchanged. Pages were left intact.';
}

function compressedMessage(input: {
  originalBytes: number;
  outputBytes: number;
  compressedCount: number;
  skippedMask: number;
  skippedBilevel: number;
}): string {
  const percent = Math.round((1 - input.outputBytes / input.originalBytes) * 100);
  const images = input.compressedCount === 1 ? '1 image' : `${input.compressedCount} images`;
  const parts = [
    `Compressed ${images}. ${formatBytes(input.originalBytes)} → ${formatBytes(input.outputBytes)} (${percent}% smaller).`,
  ];
  if (input.skippedMask > 0) {
    parts.push(
      input.skippedMask === 1
        ? '1 transparent image was left unchanged.'
        : `${input.skippedMask} transparent images were left unchanged.`,
    );
  }
  if (input.skippedBilevel > 0) {
    parts.push(
      input.skippedBilevel === 1
        ? '1 bilevel image was left unchanged.'
        : `${input.skippedBilevel} bilevel images were left unchanged.`,
    );
  }
  return parts.join(' ');
}

function listImageXObjects(document: import('pdf-lib').PDFDocument, pdfLib: PdfLib): ImageXObject[] {
  const { PDFBool, PDFDict, PDFName, PDFRawStream } = pdfLib;
  const images: ImageXObject[] = [];
  for (const [ref, object] of document.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    const stream = object;
    const dict = stream.dict;
    if (!(dict instanceof PDFDict)) continue;
    const subtype = dict.lookup(PDFName.of('Subtype'));
    if (!(subtype instanceof PDFName) || subtype.decodeText() !== 'Image') continue;
    const imageMask = dict.lookupMaybe(PDFName.of('ImageMask'), PDFBool);
    const hasMask = Boolean(imageMask?.asBoolean()) || dict.has(PDFName.of('SMask')) || dict.has(PDFName.of('Mask'));
    images.push({
      ref,
      refKey: pdfRefKey(ref.objectNumber, ref.generationNumber),
      dict,
      streamLength: stream.getContents().length,
      hasMask,
    });
  }
  return images;
}

function replaceImage(
  document: import('pdf-lib').PDFDocument,
  pdfLib: PdfLib,
  image: ImageXObject,
  jpeg: Uint8Array,
  width: number,
  height: number,
): void {
  const { PDFBool, PDFName, PDFNumber, PDFRawStream } = pdfLib;
  const dict = image.dict;
  dict.set(PDFName.of('Type'), PDFName.of('XObject'));
  dict.set(PDFName.of('Subtype'), PDFName.of('Image'));
  dict.set(PDFName.of('Width'), PDFNumber.of(width));
  dict.set(PDFName.of('Height'), PDFNumber.of(height));
  dict.set(PDFName.of('ColorSpace'), PDFName.of('DeviceRGB'));
  dict.set(PDFName.of('BitsPerComponent'), PDFNumber.of(8));
  dict.set(PDFName.of('Filter'), PDFName.of('DCTDecode'));
  dict.set(PDFName.of('Interpolate'), PDFBool.True);
  for (const key of ['DecodeParms', 'Decode', 'SMask', 'Mask', 'Matte', 'Intent', 'Alternates', 'Metadata', 'ImageMask']) {
    dict.delete(PDFName.of(key));
  }
  document.context.assign(image.ref, PDFRawStream.of(dict, jpeg));
}
