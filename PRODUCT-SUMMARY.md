# DevLens AI – Product & project summary

Single reference for what the product is, how it’s built, and how the repo is organized.

---

## 1. What the product is

**DevLens AI** is a **Chrome (and Chromium) extension** that acts as an **AI developer assistant** on any website.

- **For users:** Install the extension (default build talks to the **hosted** feed API on Vercel). They can add their **OpenAI API key** in the extension for BYOK flows; optional **local feed-server** is for advanced/self-hosted setups.
- **Model:** **Freemium.** Free: Dev assistant, AI Mod Generator, API Tester, Screenshot, context menu. **Pro** (Gumroad license): AI Explain Element, Error explainer.
- **Privacy:** No telemetry. AI calls go from the user’s machine to their OpenAI key via the local server; no data to DevLens.

**Browsers:** Chrome, Edge, Opera, Brave (Manifest V3).

---

## 2. Main components

| Component | Role |
|-----------|------|
| **Browser extension** | UI: sidepanel (panel), content script on pages, options page, context menu. Default API base: **hosted** feed (`scripts/build.js` → e.g. Vercel). Optional **`build:local-feed`** → `http://localhost:2847`. |
| **Feed server** (Node, port 2847) | Same as hosted deployment: OpenAI, Gumroad, JWT trials, screenshots. **Local `npm start`** only when developing the server or using **`npm run build:local-feed`**. |
| **Website** (optional) | Static pricing/landing page (e.g. Free vs Pro). Host separately (e.g. GitHub Pages). |

Only the **extension** is distributed via the Chrome Web Store. The server and website are not in the store.

---

## 3. Repo structure (high level)

```
devlens-saas/
├── src/                 Extension source (readable). You edit here.
├── dist/                Build output (obfuscated). Created by npm run build.
├── release/             Contains devlens-extension.zip ← only this is for store upload
├── scripts/             build.js, package.js (obfuscate + zip)
├── feed-server/         Local Node server (not in store)
├── website/             Pricing/landing (not in store)
├── developer/           Docs: store copy, publishing, freemium, security
├── assets/              Screenshots; store promo-PNG’s → **`assets/store-mockups/`** (`npm run store-promos:from-screenshot`; zie **developer/PUBLISHING.md** §4)
├── package.json         npm run build | package | release
├── PROJECT-STRUCTURE.md What is for store vs not
└── README.md
```

- **For store:** Upload **`release/devlens-extension.zip`** only. Create it with **`npm run release`**.
- **Not for store:** Everything else (src, dist, feed-server, website, developer, assets, scripts, node_modules).

---

## 4. Extension layout (src/ and dist/)

```
src/  (and dist/ after build)
├── manifest.json
├── background.js          Service worker (messages, context menu, API proxy, Explain element)
├── content/
│   ├── content.js         Page script: mods, explain mode, inspect, console errors
│   └── content.css
├── sidepanel/
│   ├── panel.html
│   ├── panel.js           Main UI: Explain Element, Dev assistant, Error explainer, Mod generator, API tester, Screenshot
│   └── panel.css
├── options/
│   ├── options.html       License key + Verify with server
│   └── options.js
└── icons/
    ├── icon.svg
    └── icon128.png
```

- **Build:** All `.js` in `src/` are obfuscated into `dist/`; manifest, HTML, CSS, icons are copied. No source maps.
- **Load unpacked:** Use folder **`dist/`** (production-like) or **`src/`** (development, readable).

---

## 5. Feed server (feed-server/)

- **Entry:** `server-with-ai.js` (run directly or via `start-server-with-ai.bat`).
- **Config:** `.env` from `.env.example`: `OPENAI_API_KEY` required for AI; optional `PORT`, `OPENAI_MODEL`, `GUMROAD_PRODUCT_ID`.
- **Behavior:** Serves extension on port 2847; handles `devQuestion`, `aiContext`, `generateMod`, `screenshot`, `POST /verify-license` (Gumroad). When `GUMROAD_PRODUCT_ID` is set, AI requests require a valid `license_key` in the body.

---

## 6. NPM commands (project root)

| Command | Effect |
|--------|--------|
| `npm install` | Install devDependencies (javascript-obfuscator, archiver). |
| `npm run build` | Read `src/` → obfuscate JS, copy rest → write `dist/`. |
| `npm run package` | **Dev** build (localhost API), then zip → `release/devlens-extension.zip`. |
| `npm run release` | **Production:** `build:prod` (hosted API) + zip → `release/devlens-extension.zip`. |
| `npm run store-promos:from-screenshot` | Bouwt **store screenshots + promo’s** (marquee, tile, thumbnail) uit `assets/screenshot-sidepanel.png` → **`assets/store-mockups/`**. Zie **developer/PUBLISHING.md** §4. |

---

## 7. Developer docs (developer/)

| File | Purpose |
|------|---------|
| **STORE-LISTING.md** | Title, short/long description, screenshots, keywords for Chrome Web Store. |
| **PUBLISHING.md** | Pre-upload checklist, zip structure check, store steps, icon/screenshots. |
| **FREEMIUM.md** | Free vs Pro, Gumroad, pricing URL, license verification, options page. |
| **SUMMARY.md** | Feature list, server endpoints, build/release, file overview. |
| **SECURITY.md** | CSP, API key handling, store zip contents. |
| **WAAR-STAAT-WAT.md** | Structure and “what for store” (Dutch). |
| **GEBRUIKSAANWIJZING.md** | User guide: load extension, start server (Dutch). |
| **README.md** | Index of developer docs. |
| **EXAMPLES.md**, **OPERA-ICON.md** | Extra references. |

---

## 8. Version and store

- **Extension version:** In `src/manifest.json` (e.g. `1.1.1`). Bump there, then run `npm run release`.
- **Store:** Upload **`release/devlens-extension.zip`** in Chrome Web Store Developer Dashboard. Icon: 128×128 PNG (`icons/icon128.png`). Screenshots & promo PNG’s: **`npm run store-promos:from-screenshot`** → **`assets/store-mockups/`** (zie **developer/PUBLISHING.md** §4). Listing copy: **STORE-LISTING.md**.

---

## 9. Quick checklist

- [ ] Extension source in **src/**; no duplicate **extension/** folder.
- [ ] **npm run release** produces **release/devlens-extension.zip** with manifest at zip root.
- [ ] Only that zip is for the store; feed-server, website, developer, assets are not.
- [ ] Feed-server: `.env` from `.env.example`, `OPENAI_API_KEY` set; optional `GUMROAD_PRODUCT_ID` for Pro.
- [ ] Docs: PROJECT-STRUCTURE.md (what to upload); developer/ for copy and publishing.

This file is the **full product and structure summary**. For “what to upload”, see **PROJECT-STRUCTURE.md**. For features and server details, see **developer/SUMMARY.md**.
