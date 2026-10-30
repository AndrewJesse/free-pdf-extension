import { PdfToolError } from './errors';

/**
 * Read a user-selected file entirely on this device.
 * FileReader is the read path for every PDF the tools accept.
 */
export function readFileBytes(file: File): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(reader.error ?? new PdfToolError(`Could not read ${file.name}.`));
    };
    reader.onload = () => {
      const result = reader.result;
      if (!(result instanceof ArrayBuffer)) {
        reject(new PdfToolError(`Could not read ${file.name}.`));
        return;
      }
      resolve(new Uint8Array(result));
    };
    reader.readAsArrayBuffer(file);
  });
}

export function assertPdf(bytes: Uint8Array, fileName: string): void {
  if (bytes.length < 5) {
    throw new PdfToolError(`${fileName} is not a PDF.`);
  }
  const header = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0, bytes[4] ?? 0);
  if (!header.startsWith('%PDF')) {
    throw new PdfToolError(`${fileName} is not a PDF.`);
  }
}
