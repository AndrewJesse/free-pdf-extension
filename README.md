# Free PDF

A local-first PDF tool. Merge and compress documents in the browser, and in a Manifest V3 Chrome extension, without uploading them.

The site is a Next.js App Router static export. The extension popup is a separate bundle of the same TypeScript modules. There is no account, database, subscription, or document API.

## Privacy

PDFs are read with `FileReader` and processed on the device. Merge uses `pdf-lib`. Compress uses `pdfjs-dist` to read embedded images, an HTML canvas to downsample them, and a MozJPEG WebAssembly encoder that is copied into the build from `@jsquash/jpeg`. Image-heavy PDFs typically end up about 50–70% smaller. A PDF with no embedded images is left as it was. The pdf.js worker and its WASM decoders are files in the build, not CDN URLs.

The extension requests no host permissions. Manifest V3 only allows certain CSP directives on extension pages, so the manifest sets `script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self'`, `object-src 'self'`, and `default-src 'self'` (which blocks remote fetch and XHR). The popup also sets an explicit `connect-src 'self'` meta policy. There is no analytics, telemetry, or remote font.

## Site

```bash
npm install
npm run dev
```

Open the URL printed by Next.js. `npm run dev` is only for local development.

```bash
npm run build
```

`npm run build` writes a static site to `out/`. It does not create server actions or file-processing API routes, so a host such as Vercel can serve it with no runtime compute.

## Extension

```bash
npm run build:extension
```

That command statically exports the site and writes an unpacked extension to `dist/extension` (`manifest.json`, `background.js`, and the popup).

Load it in Chrome:

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Choose Load unpacked.
4. Select the `dist/extension` folder.

## Layout

- `src/app` — landing page, merge, and compress routes
- `src/components` — shared tool UI
- `src/lib/pdf` — local merge and compress modules
- `src/extension` — popup and service worker sources
- `scripts/build-extension.mjs` — static export plus extension package
- `public/pdfjs` and `public/codecs` — local worker and WASM, copied from installed packages by `npm install`
