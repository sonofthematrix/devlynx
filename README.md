# DevLynx AI

AI Developer Assistant for any website. Use your own OpenAI key; everything runs on your machine.

**Freemium:** Free tier includes Dev assistant, AI Mod Generator, and more. **Pro** (paid) unlocks AI Explain Element and Error explainer. See [developer/FREEMIUM.md](developer/FREEMIUM.md) for pricing setup and configuration.

---

## Build (production / store upload)

The extension is built from **source in `src/`** into an obfuscated **`dist/`** and optionally packaged as a zip for the Chrome Web Store.

- **Source:** Edit code in **`src/`** (readable). All JavaScript there is obfuscated only in the build output.
- **Build:** Run `npm run build` to produce **`dist/`** (obfuscated JS + copied manifest, HTML, CSS, icons).
- **Store / production zip:** Run **`npm run release`** — runs **`build:prod`** (production API base from `scripts/build.js`, currently **`https://devlynx-black.vercel.app`**) then zips → **`release/devlens-extension.zip`**.

**Commands:**

```bash
npm install           # once: install build tools
npm run build         # src/ → dist/ — hosted feed API (default: Vercel; see scripts/build.js)
npm run build:prod    # src/ → dist/ — same hosted API + production license-jwt strip
npm run build:local-feed   # dist/ uses http://localhost:2847 (run feed-server locally)
npm run build:dev:local   # readable dist + localhost feed (for debugging feed-server)
npm run release       # build:prod + zip → release/devlens-extension.zip (Chrome Web Store)
npm run package       # dev build + zip (localhost feed server)
```

**Structure:**

- `src/` – Source extension (manifest, JS, HTML, CSS, icons). Keep this readable.
- `dist/` – Build output; load this folder as “Load unpacked” to test the production build.
- `release/devlens-extension.zip` – Zip of `dist/` contents, ready for Chrome Web Store.

Build uses [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator) with options that stay compatible with Chrome extension Manifest V3 (no eval in the service worker).

---

## Quick start

1. **Extension**  
   **Chrome, Edge, Opera, Brave, Vivaldi:** open the browser’s extensions page (`chrome://extensions`, `edge://extensions`, `opera://extensions`, etc.) → turn on **Developer mode** → **Load unpacked** → select the **`src`** or **`dist`** folder (the one that contains `manifest.json`; do **not** select the project root).  
   In **Opera**, pin the extension via the Extensions (cube) menu so the icon appears in the toolbar. See **developer/BROWSERS.md** for per-browser steps.

2. **API key**  
   In the **feed-server** folder: copy `.env.example` to `.env` and set  
   `OPENAI_API_KEY=sk-your-key`

3. **Feed API (optional locally)**  
   **Default:** Dev and production builds use the **hosted** feed server (**`https://devlynx-black.vercel.app`**, configurable in **`scripts/build.js`** / `DEVLYNX_FEED_API`). No **`npm start`** required for the extension to connect.  
   **Local feed server only if you need it:** `npm run build:local-feed` (or `DEVLYNX_FEED_LOCAL=1`) then run **`npm start`** in **feed-server**.

**Toolbar icon:** Extensions menu (puzzle/cube) → find DevLynx AI → click **pin**.

**Disconnected or “refused to connect”?**  
- Confirm **`https://devlynx-black.vercel.app/health`** loads in a browser.  
- If you use **`build:local-feed`**: start **`npm start`** in **feed-server**.  
- Reload the extension after rebuilding; use **`dist`** (or **`src`** now defaults to hosted API when the placeholder is still present).  
2. Extensions → DevLynx AI → **reload** after code changes.  
3. Click status in the panel to retry.

**Chrome Web Store:** Upload only **`release/devlens-extension.zip`** (create with **`npm run release`** — production API). See **PROJECT-STRUCTURE.md**, **developer/RELEASE-PRODUCTION.md**, and **developer/VERCEL.md** (Vercel + Blob screenshots).

**Store screenshots & promo images** (marquee, thumbnail, tiles): put captures in **`assets/screenshot-sidepanel.png`** (and optionally **`assets/screenshot-contextmenu.png`**), then run **`npm run store-promos:from-screenshot`**. PNG’s are written to **`assets/store-mockups/`** — see **developer/PUBLISHING.md** §4.

---

## License verification (Pro)

The extension calls **`POST /verify-license`** on the configured feed API (default **hosted** URL in **`scripts/build.js`**, or **`http://localhost:2847`** with **`build:local-feed`**) with a `license_key` in the request body. Only the **feed-server** decides if a license is valid; the extension never contains dev codes or bypass logic.

**1. Gumroad (paid users)**  
Set **`GUMROAD_PRODUCT_ID`** in **feed-server/.env**. If the key is not a dev code (see below), the server verifies it with Gumroad’s API (`POST https://api.gumroad.com/v2/licenses/verify`). On success it returns `{ "valid": true, "ok": true, "type": "gumroad" }`.

**2. Developer / friend codes**  
Add comma-separated codes in **feed-server/.env**:

```env
DEV_CODES=DEVLENS-FRIEND-001,DEVLENS-FRIEND-002
```

If the submitted license key matches one of these, the server returns `{ "valid": true, "ok": true, "type": "dev" }`. Dev codes exist **only on the server** and are never shipped in the extension.

**3. Developer bypass (local development)**  
If the request comes from **localhost** (127.0.0.1) and **no license key** is sent, the server returns `{ "valid": true, "ok": true, "type": "developer" }`. So you can leave the license field empty in the Options page, click **Verify with server**, and get Pro while developing. This only works when the extension talks to your local server from the same machine.
