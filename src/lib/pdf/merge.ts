import { PdfToolError } from './errors';
import { assertPdf, readFileBytes } from './read-file';
import type { ProgressHandler } from './types';

export type MergeResult = {
  bytes: Uint8Array;
  pageCount: number;
  fileCount: number;
};

function encryptedMessage(fileName: string): string {
  return `${fileName} is encrypted. Remove the password on this device and try again.`;
}

export async function mergePdfDocuments(documents: Uint8Array[]): Promise<MergeResult> {
  if (documents.length < 2) {
    throw new PdfToolError('Choose at least two PDFs to merge.');
  }

  const { EncryptedPDFError, PDFDocument } = await import('pdf-lib');
  const merged = await PDFDocument.create();
  let pageCount = 0;

  for (let index = 0; index < documents.length; index += 1) {
    const bytes = documents[index];
    if (!bytes) continue;
    let source;
    try {
      source = await PDFDocument.load(bytes);
    } catch (error) {
      const label = `PDF ${index + 1}`;
      if (error instanceof EncryptedPDFError) throw new PdfToolError(encryptedMessage(label));
      throw new PdfToolError(`${label} could not be read as a PDF.`);
    }
    const copied = await merged.copyPages(source, source.getPageIndices());
    for (const page of copied) {
      merged.addPage(page);
      pageCount += 1;
    }
  }

  if (pageCount === 0) {
    throw new PdfToolError('Those PDFs have no pages to merge.');
  }

  const bytes = await merged.save();
  return { bytes, pageCount, fileCount: documents.length };
}

export async function mergePdfFiles(files: File[], onProgress?: ProgressHandler): Promise<MergeResult> {
  if (files.length < 2) {
    throw new PdfToolError('Choose at least two PDFs to merge.');
  }

  const documents: Uint8Array[] = [];
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    if (!file) continue;
    onProgress?.({
      progress: index / (files.length + 1),
      message: `Reading ${file.name}`,
    });
    const bytes = await readFileBytes(file);
    assertPdf(bytes, file.name);
    documents.push(bytes);
  }

  onProgress?.({
    progress: files.length / (files.length + 1),
    message: 'Merging pages',
  });

  try {
    const result = await mergePdfDocuments(documents);
    onProgress?.({ progress: 1, message: 'Ready' });
    return result;
  } catch (error) {
    if (error instanceof PdfToolError && /PDF \d+/.test(error.message)) {
      const match = /PDF (\d+)/.exec(error.message);
      const fileIndex = match ? Number(match[1]) - 1 : -1;
      const file = files[fileIndex];
      if (file) {
        throw new PdfToolError(error.message.replace(/PDF \d+/, () => file.name));
      }
    }
    throw error;
  }
}
