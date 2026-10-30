import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import * as esbuild from 'esbuild';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';
import { copyAssets } from './copy-assets.mjs';

const root = process.cwd();
const outDir = path.join(root, 'dist/extension');
if (process.argv.includes('--icons-only')) {
  writeIcons(path.join(root, 'src/extension/icons'));
  process.exit(0);
}
const forbiddenHosts = [
  'cdnjs.cloudflare.com',
  'unpkg.com',
  'jsdelivr.net',
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'googletagmanager.com',
  'google-analytics.com',
  'www.google-analytics.com',
];

copyAssets(root);

const nextBin = path.join(root, 'node_modules/next/dist/bin/next');
const webBuild = spawnSync(process.execPath, [nextBin, 'build'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' },
});
if (webBuild.status !== 0) {
  process.exit(webBuild.status ?? 1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(root, 'src/extension/popup.tsx')],
  bundle: true,
  outfile: path.join(outDir, 'popup.js'),
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  minify: true,
  jsx: 'automatic',
  legalComments: 'none',
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  plugins: [
    {
      name: 'at-alias',
      setup(build) {
        build.onResolve({ filter: /^@\// }, (args) => {
          const base = path.join(root, 'src', args.path.slice(2));
          const candidates = [base, `${base}.tsx`, `${base}.ts`, `${base}.jsx`, `${base}.js`];
          const resolved = candidates.find((candidate) => existsSync(candidate));
          if (!resolved) return { errors: [{ text: `Cannot resolve ${args.path}` }] };
          return { path: resolved };
        });
        build.onLoad({ filter: /mozjpeg_enc\.js$/ }, async (args) => {
          const contents = readFileSync(args.path, 'utf8')
            .replaceAll('if(import.meta.url===undefined){import.meta.url="https://localhost"}', '')
            .replaceAll('import.meta.url', '""');
          return { contents, loader: 'js' };
        });
      },
    },
  ],
});

const cssPath = path.join(root, 'src/app/globals.css');
const processed = await postcss([tailwindcss()]).process(readFileSync(cssPath, 'utf8'), { from: cssPath });
writeFileSync(path.join(outDir, 'popup.css'), processed.css);

cpSync(path.join(root, 'src/extension/popup.html'), path.join(outDir, 'popup.html'));
cpSync(path.join(root, 'src/extension/background.js'), path.join(outDir, 'background.js'));
cpSync(path.join(root, 'public/pdfjs'), path.join(outDir, 'pdfjs'), { recursive: true });
cpSync(path.join(root, 'public/codecs'), path.join(outDir, 'codecs'), { recursive: true });
const iconDir = path.join(root, 'src/extension/icons');
writeIcons(iconDir);
writeIcons(path.join(outDir, 'icons'));

const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
const manifest = {
  manifest_version: 3,
  name: 'Free PDF',
  version: typeof pkg.version === 'string' ? pkg.version : '1.0.0',
  description: 'Merge and compress PDFs on your device. Documents never leave this browser.',
  action: {
    default_title: 'Free PDF',
    default_popup: 'popup.html',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
  },
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  background: {
    service_worker: 'background.js',
  },
  content_security_policy: {
    extension_pages:
      "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'; worker-src 'self'; default-src 'self'",
  },
};
writeFileSync(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
assertLocalExtension(outDir, manifest);

function assertLocalExtension(directory, manifestJson) {
  const required = [
    'manifest.json',
    'background.js',
    'popup.html',
    'popup.js',
    'popup.css',
    'pdfjs/pdf.worker.min.mjs',
    'pdfjs/wasm/openjpeg.wasm',
    'codecs/mozjpeg_enc.wasm',
    'icons/icon-16.png',
    'icons/icon-32.png',
    'icons/icon-48.png',
    'icons/icon-128.png',
  ];
  for (const relative of required) {
    const file = readFileSync(path.join(directory, relative));
    if (relative.startsWith('icons/icon-')) {
      const size = Number(relative.match(/icon-(\d+)/)?.[1]);
      const width = file.readUInt32BE(16);
      const height = file.readUInt32BE(20);
      if (file[0] !== 0x89 || width !== size || height !== size) {
        throw new Error(`${relative} is not a ${size}×${size} PNG.`);
      }
    }
  }
  for (const size of [16, 32, 48, 128]) {
    const iconPath = `icons/icon-${size}.png`;
    if (manifestJson.icons?.[String(size)] !== iconPath) {
      throw new Error(`manifest is missing the ${size}px icon.`);
    }
  }
  if (manifestJson.host_permissions || manifestJson.optional_host_permissions || manifestJson.permissions) {
    throw new Error('The extension manifest must not request host or API permissions.');
  }
  const policy = manifestJson.content_security_policy?.extension_pages ?? '';
  if (
    !policy.includes("script-src 'self'") ||
    !policy.includes('wasm-unsafe-eval') ||
    !policy.includes("default-src 'self'") ||
    !policy.includes("worker-src 'self'") ||
    !policy.includes("object-src 'self'")
  ) {
    throw new Error('Extension CSP is missing the local-only policy.');
  }
  if (policy.includes('connect-src')) {
    throw new Error('Manifest V3 rejects connect-src on extension pages. Use default-src and the popup meta policy.');
  }
  if (policy.includes('http://') || policy.includes('https://')) {
    throw new Error('Extension CSP must not allow remote origins.');
  }
  const bundle = readFileSync(path.join(directory, 'popup.js'), 'utf8');
  const css = readFileSync(path.join(directory, 'popup.css'), 'utf8');
  const background = readFileSync(path.join(directory, 'background.js'), 'utf8');
  const html = readFileSync(path.join(directory, 'popup.html'), 'utf8');
  for (const host of forbiddenHosts) {
    for (const [label, source] of [
      ['popup.js', bundle],
      ['popup.css', css],
      ['background.js', background],
      ['popup.html', html],
    ]) {
      if (source.includes(host)) {
        throw new Error(`${label} references remote host ${host}.`);
      }
    }
  }
  if (!css.includes('.text-ink') && !css.includes('text-ink')) {
    throw new Error('Popup CSS is missing shared tool styles.');
  }
}

function writeIcons(directory) {
  mkdirSync(directory, { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    writeFileSync(path.join(directory, `icon-${size}.png`), png(size));
  }
}

function markColor(u, v) {
  const left = 0.22;
  const right = 0.78;
  const top = 0.16;
  const bottom = 0.84;
  const fold = 0.18;
  const page = [
    [left, top],
    [right - fold, top],
    [right, top + fold],
    [right, bottom],
    [left, bottom],
  ];
  const dogEar = [
    [right - fold, top],
    [right - fold, top + fold],
    [right, top + fold],
  ];
  if (inside(u, v, dogEar)) return [12, 12, 11];
  if (inside(u, v, page)) return [243, 241, 234];
  return [12, 12, 11];
}

function inside(x, y, polygon) {
  let crossed = false;
  for (let index = 0, next = polygon.length - 1; index < polygon.length; next = index, index += 1) {
    const [x1, y1] = polygon[index];
    const [x2, y2] = polygon[next];
    const intersects = y1 > y !== y2 > y && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1;
    if (intersects) crossed = !crossed;
  }
  return crossed;
}

function png(size) {
  const rowBytes = size * 4 + 1;
  const raw = Buffer.alloc(rowBytes * size);
  const samples = 3;
  for (let y = 0; y < size; y += 1) {
    raw[y * rowBytes] = 0;
    for (let x = 0; x < size; x += 1) {
      let red = 0;
      let green = 0;
      let blue = 0;
      for (let sy = 0; sy < samples; sy += 1) {
        for (let sx = 0; sx < samples; sx += 1) {
          const u = (x + (sx + 0.5) / samples) / size;
          const v = (y + (sy + 0.5) / samples) / size;
          const [r, g, b] = markColor(u, v);
          red += r;
          green += g;
          blue += b;
        }
      }
      const count = samples * samples;
      const offset = y * rowBytes + 1 + x * 4;
      raw[offset] = Math.round(red / count);
      raw[offset + 1] = Math.round(green / count);
      raw[offset + 2] = Math.round(blue / count);
      raw[offset + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([length, typeBuf, data, checksum]);
}

function crc32(buffer) {
  let crc = ~0;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit += 1) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return ~crc >>> 0;
}
