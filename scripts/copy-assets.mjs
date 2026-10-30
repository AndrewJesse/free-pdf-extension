import { cpSync, copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);

/**
 * Copy the pdf.js worker, its WASM decoders, and the MozJPEG encoder
 * out of node_modules into public/. The site and the extension load these
 * files from their own origin. Nothing is fetched from a CDN.
 */
export function copyAssets(root = process.cwd()) {
  const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
  const jpegWasm = require.resolve('@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm');

  const pdfjsOut = path.join(root, 'public/pdfjs');
  const wasmOut = path.join(pdfjsOut, 'wasm');
  const codecOut = path.join(root, 'public/codecs');

  rmSync(pdfjsOut, { recursive: true, force: true });
  mkdirSync(wasmOut, { recursive: true });
  mkdirSync(codecOut, { recursive: true });

  copyFileSync(path.join(pdfjsRoot, 'build/pdf.worker.min.mjs'), path.join(pdfjsOut, 'pdf.worker.min.mjs'));
  cpSync(path.join(pdfjsRoot, 'standard_fonts'), path.join(pdfjsOut, 'standard_fonts'), { recursive: true });

  const wasmDir = path.join(pdfjsRoot, 'wasm');
  for (const name of readdirSync(wasmDir)) {
    if (name.startsWith('quickjs')) continue;
    copyFileSync(path.join(wasmDir, name), path.join(wasmOut, name));
  }

  copyFileSync(jpegWasm, path.join(codecOut, 'mozjpeg_enc.wasm'));
}

const isDirectRun = Boolean(process.argv[1]) && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  copyAssets();
}
