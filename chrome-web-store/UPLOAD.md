# Upload Free PDF to the Chrome Web Store

This folder is the submission package. The extension processes PDFs on the device. It has no host permissions, no remote code, no document upload, and no analytics.

## Files to upload

| Dashboard field | File |
| --- | --- |
| Package | `chrome-web-store/free-pdf-extension.zip` |
| Store icon, if asked separately | `chrome-web-store/icon-128.png` (128×128 PNG; the same file is `icons/icon-128.png` inside the zip) |
| Screenshot | `chrome-web-store/screenshots/popup-1280x800.png` (1280×800 PNG, merge) |
| Second screenshot | `chrome-web-store/screenshots/popup-compress-1280x800.png` (1280×800 PNG, compress) |
| Small promo tile | `chrome-web-store/screenshots/small-promo-440x280.png` (440×280 PNG) |
| Listing text | `chrome-web-store/STORE_LISTING.md` |

The zip root is the unpacked extension. `manifest.json` is at the top of the archive, not inside an extra folder. That is the layout Load unpacked and the store both expect.

## Build the zip again

From the repository root:

```bash
npm install
npm run build:extension
cd dist/extension
zip -r -X ../../chrome-web-store/free-pdf-extension.zip .
```

`npm run build:extension` writes `dist/extension`. Zip the contents of that directory. Do not zip the `dist/extension` folder itself.

## Developer dashboard

1. Open the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole) and sign in with the publisher account. A new publisher registers there and pays the one-time developer fee.
2. Choose **Add new item**.
3. Upload `chrome-web-store/free-pdf-extension.zip`.
4. Wait until the package is accepted, then open the item draft.

The manifest name is **Free PDF**. The manifest description is the summary in `STORE_LISTING.md`. Both are inside the zip, so you do not type them separately.

## Store listing

Open the **Store listing** tab.

1. Paste the detailed description from `STORE_LISTING.md`. It includes https://free-utils.com.
2. Category: **Productivity**.
3. Language: **English**.
4. Store icon: use the 128×128 icon from the package. If the form asks you to upload one, choose `chrome-web-store/icon-128.png`.
5. Screenshots: upload `chrome-web-store/screenshots/popup-1280x800.png` and `chrome-web-store/screenshots/popup-compress-1280x800.png`. Both are 1280×800 PNGs of the real popup, one on Merge and one on Compress.
6. Small promo tile: upload `chrome-web-store/screenshots/small-promo-440x280.png`. It is 440×280.
7. Homepage: `https://free-utils.com`.

Leave the marquee promo tile and the YouTube video empty.

## Privacy

Open the **Privacy practices** tab. Match the package. Do not add permissions to get past this form.

**Single purpose**

Merges and compresses PDF files on the user's device. Documents are not uploaded, and the extension does not collect data.

**Permissions**

The manifest requests no permissions and no host permissions. There should be nothing to justify. If a permission appears, remove it from the manifest, rebuild the zip, and upload the new package. Do not add `host_permissions`.

**Remote code**

Select **No, I am not using remote code.**

The popup, service worker, pdf.js worker, and MozJPEG encoder are files inside the zip. The content security policy is local (`script-src 'self' 'wasm-unsafe-eval'`, `worker-src 'self'`, `object-src 'self'`, `default-src 'self'`). The popup does not load scripts, fonts, or analytics from the network.

**Data use**

Do not check any data type. This extension does not collect or use user data. Then certify the limited-use statements:

- Data is not sold or transferred to third parties, outside of the approved use cases.
- Data is not used or transferred for purposes unrelated to the extension's single purpose.
- Data is not used or transferred to determine creditworthiness or for lending.

**Privacy policy**

The extension collects no user data. The policy text is in `STORE_LISTING.md`. If the form requires a URL, publish that section on a page you control and enter the URL. https://free-utils.com is the company site linked from the popup and the listing.

## Distribution and submit

1. Open **Distribution**.
2. Choose **Public** and leave the regions at the default unless you intend a limited release.
3. Submit for review.

Review looks at the listing, the screenshots, and the package together. The screenshots must keep matching the popup. Do not add analytics, a remote script, or host permissions in a later upload.
