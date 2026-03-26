# DevLynx AI – Project structure

Overview of all folders: what is **for Chrome Web Store upload** and what is **not**.

---

## For store upload (what to upload)

| Path | Use |
|------|-----|
| **`release/devlens-extension.zip`** | **Upload this file to the Chrome Web Store.** Production build (`build:prod` → hosted API). Create with **`npm run release`**. |

Do not upload anything else to the store. Not `src/`, not `feed-server/`, not docs.

---

## Not for the store (local / development / docs)

| Folder / file | What it is |
|---------------|------------|
| **`src/`** | Extension source code (readable). This is where you develop. Built into → `dist/`. |
| **`dist/`** | Build output (obfuscated JS + manifest, HTML, CSS, icons). For testing: “Load unpacked” on this folder. Packaged into → `release/devlens-extension.zip`. |
| **`release/`** | Contains `devlens-extension.zip` (after `npm run release`). That zip is for the store. |
| **`scripts/`** | Build scripts (`build.js`, `package.js`). Development only. |
| **`feed-server/`** | Local Node server (port 2847). Users run it themselves; **not** included in the store. |
| **`website/`** | Pricing/landing page. Host separately; not in the store. |
| **`developer/`** | Documentation: store copy, publishing checklist, freemium, security. For you only. |
| **`assets/`** | Screenshots etc. for docs or store listing. Not in the zip. |
| **`node_modules/`** | NPM packages for the build. Not in the store. |
| **`package.json`**, **`package-lock.json`** | NPM config. Build only; not in the store. |

---

## Quick reference

- **Store upload:** `release/devlens-extension.zip` (create with `npm run release`)
- **Extension source:** `src/`
- **Test extension locally:** “Load unpacked” on `dist/` or `src/`
- **AI server:** `feed-server/` (not in the store)
