type ExtensionRuntime = {
  id?: string;
  getURL?: (path: string) => string;
};

function extensionRuntime(): ExtensionRuntime | null {
  const runtime = globalThis.chrome?.runtime;
  if (runtime?.id && typeof runtime.getURL === 'function') return runtime;
  return null;
}

/** Same-origin URL for a file shipped with the site or the extension. */
export function localAsset(path: string): string {
  const normalized = path.replace(/^\/+/, '');
  const runtime = extensionRuntime();
  if (runtime?.getURL) return runtime.getURL(normalized);
  return `/${normalized}`;
}

export function pdfjsPaths(): { workerSrc: string; wasmUrl: string } {
  const workerSrc = new URL(localAsset('pdfjs/pdf.worker.min.mjs'), window.location.href).href;
  const wasmUrl = new URL('wasm/', workerSrc).href;
  return { workerSrc, wasmUrl };
}
