# Supported browsers – Load unpacked

DevLens AI is a **Manifest V3** extension and loads in all Chromium-based browsers that support MV3.

---

## Supported browsers

| Browser | Load unpacked | Extensions URL |
|---------|----------------|----------------|
| **Chrome** | ✓ | chrome://extensions |
| **Edge** | ✓ | edge://extensions |
| **Opera** | ✓ | opera://extensions |
| **Brave** | ✓ | chrome://extensions |
| **Vivaldi** | ✓ | chrome://extensions |

Use the **same folder** in every browser: **`src`** (development) or **`dist`** (after `npm run build`). Select the folder that contains `manifest.json`.

---

## Load unpacked in each browser

1. **Chrome**  
   Go to `chrome://extensions` → turn on **Developer mode** → **Load unpacked** → select the **`src`** or **`dist`** folder.

2. **Edge**  
   Go to `edge://extensions` → turn on **Developer mode** → **Load unpacked** → select the **`src`** or **`dist`** folder.

3. **Opera**  
   Go to `opera://extensions` → turn on **Developer mode** → **Load unpacked** (or **Load extension**) → select the **`src`** or **`dist`** folder.  
   The icon may not appear in the toolbar by default: click the **Extensions** (cube) icon → find **DevLens AI** → click the **pin** to show it.

4. **Brave**  
   Go to `brave://extensions` → turn on **Developer mode** → **Load unpacked** → select the **`src`** or **`dist`** folder.

5. **Vivaldi**  
   Go to `vivaldi://extensions` → turn on **Developer mode** → **Load unpacked** → select the **`src`** or **`dist`** folder.

---

## Manifest compatibility

- **manifest_version: 3** – supported in all listed browsers.
- **Chrome Web Store builds** omit Opera-only manifest keys (e.g. `minimum_opera_version`) so the store does not warn about unrecognized keys. Opera users can still load the same CRX/ZIP if the browser accepts it.
- **chrome.*** APIs – work in Chrome, Edge, Opera, Brave, Vivaldi (Chromium engine).
- The extension opens the correct extensions page per browser (Opera → opera://extensions, Edge → edge://extensions, others → chrome://extensions).

If a browser refuses to load the extension, check the error on that browser’s extensions page and ensure you selected the **folder** that contains `manifest.json` (e.g. `devlens-saas/src` or `devlens-saas/dist`), not the project root.
