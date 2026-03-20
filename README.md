# DevLynx AI

AI Developer Assistant for any website. The extension can use a **hosted feed API** (OpenAI + license checks on the server) or your **own OpenAI key** (BYOK) for some flows. **Freemium:** free tier includes Dev assistant, AI Mod Generator, and more; **Pro** unlocks Explain Element and Error explainer. See [developer/FREEMIUM.md](developer/FREEMIUM.md).

---

## Architecture (short)

| Piece | Role |
|--------|------|
| **Chrome extension** (`src/` → `dist/`) | Side panel, API tester, AI tools; talks to the **feed API** URL from `scripts/build.js` (default: **Vercel**). |
| **Feed server** (`feed-server/`) | Node API: OpenAI, Gumroad verify, trial JWTs, screenshots. Deployed to **Vercel** (serverless) or run locally with `npm start`. |

Default extension builds use **`https://devlynx-black.vercel.app`** as the feed base (see **`HOSTED_FEED_API`** in `scripts/build.js`). Override with **`DEVLYNX_FEED_API`** or use **`npm run build:local-feed`** for **`http://localhost:2847`**.

---

## 1. Deploy feed server on Vercel (step by step)

Do this **once** per project (or when you add a new environment).

### 1.1 Create the Vercel project

1. Push this repo to **GitHub** (no secrets in git — use `.env` / `.env.local` only on your machine; see `.gitignore`).
2. Open [Vercel Dashboard](https://vercel.com) → **Add New** → **Project** → import the repo.
3. **Root Directory:** set to **`feed-server`** (required).
4. **Framework Preset:** **Other**.
5. **Build Command:** `npm run vercel-build` (or leave empty if `vercel.json` already defines it).
6. **Output Directory:** **`public`** (must match `feed-server/vercel.json`).
7. Deploy. If the build fails, confirm `feed-server/public/` exists and `package.json` has `vercel-build`.

### 1.2 Environment variables

In **Project → Settings → Environment Variables** (Production + Preview as needed):

| Variable | Required | Notes |
|----------|----------|--------|
| `OPENAI_API_KEY` | For AI on server | Server-side model calls |
| `BLOB_READ_WRITE_TOKEN` | Strongly recommended | **Storage → Blob**; screenshots + persistent trial store on Vercel |
| `GUMROAD_PRODUCT_ID` | If you use Gumroad | License verification |
| `LICENSE_JWT_PRIVATE_KEY` | Optional | **`/trial-token`** / **`/trial-consume`** — pair with public PEM in `src/license-jwt-public.js` ([developer/LICENSE-JWT-KEYS.md](developer/LICENSE-JWT-KEYS.md)) |
| `OPENAI_MODEL` | Optional | Default `gpt-4o-mini` |
| `DEV_CODES` | Optional | Server-only bypass keys |
| `DEVLYNX_TRIAL_LIMIT` | Optional | Default `20` |

Redeploy after adding variables.

### 1.3 Blob store (screenshots + trial persistence)

1. **Storage** → **Create** → **Blob** → attach to this project.
2. Confirm **`BLOB_READ_WRITE_TOKEN`** appears in env; redeploy if needed.

### 1.4 Custom domain (optional)

In **Settings → Domains**, add e.g. **`api.devlynx.ai`** and set DNS per Vercel’s instructions.

If the URL changes, update **`HOSTED_FEED_API`** in **`scripts/build.js`** and add the same origin to **`src/manifest.json`** → `host_permissions`, then rebuild the extension.

### 1.5 Verify

In a browser open:

`https://<your-deployment>/health`

You should see JSON with `"ok": true`, `"runtime": "vercel"`, and ideally `"blobStorage": true`.

More detail: [developer/VERCEL.md](developer/VERCEL.md).

### 1.6 CLI deploy (optional)

From the **`feed-server`** folder (logged in with `vercel login`):

```bash
cd feed-server
npx vercel deploy --prod
```

---

## 2. Build & load the Chrome extension locally (step by step)

### 2.1 One-time setup

From the **repository root** (`devlens-saas/`, not `feed-server/`):

```bash
npm install
```

### 2.2 Production-oriented build (hosted API, obfuscated)

Matches the store pipeline; points at **`scripts/build.js`** → default Vercel URL.

```bash
npm run build:prod
```

Output: **`dist/`** (load this folder in Chrome).

### 2.3 Load unpacked in Chrome

1. Open **`chrome://extensions`** (Edge: **`edge://extensions`**, etc.).
2. Turn **Developer mode** **ON**.
3. Click **Load unpacked**.
4. Select the **`dist`** folder (must contain **`manifest.json`** — do **not** choose the repo root).

### 2.4 After code changes

1. Run **`npm run build`** or **`npm run build:prod`** again.
2. On **`chrome://extensions`**, click **Reload** on DevLynx AI.

### 2.5 Optional: load readable source (no obfuscation)

```bash
npm run build:dev
```

Then **Load unpacked** → **`dist`**. Same default hosted API unless you use **`npm run build:dev:local`**.

### 2.6 Optional: point extension at local feed only

```bash
npm run build:local-feed
# or: npm run build:dev:local   # readable + localhost
```

Start the server:

```bash
cd feed-server
npm install
npm start
```

Per-browser notes: [developer/BROWSERS.md](developer/BROWSERS.md).

---

## 3. Store release (production zip)

From repo root:

```bash
npm run release
```

· Creates **`release/devlens-extension.zip`** ( **`build:prod`** + zip).  
· Upload **only** that zip to the Chrome Web Store.  
· Bump **`version`** in **`src/manifest.json`** before submission, then run **`npm run release`** again.

Full checklist: [developer/RELEASE-PRODUCTION.md](developer/RELEASE-PRODUCTION.md).

---

## 4. Build commands (reference)

```bash
npm install                 # once
npm run build               # dist/ — default hosted API, obfuscated
npm run build:prod          # dist/ — hosted API + production JWT dev-secret strip
npm run build:local-feed    # dist/ — http://localhost:2847
npm run build:dev           # dist/ readable, hosted API, DEBUG logs
npm run build:dev:local     # dist/ readable, localhost feed
npm run release             # build:prod + release/devlens-extension.zip
npm run package             # build + zip (same default API as npm run build)
```

**Layout:**

- **`src/`** — editable extension source.  
- **`dist/`** — build output; use for **Load unpacked** and store packaging.  
- **`feed-server/`** — Node feed API; deploy root = this folder on Vercel.

Obfuscation: [javascript-obfuscator](https://github.com/javascript-obfuscator/javascript-obfuscator), MV3-safe (no `eval` in the service worker).

---

## 5. Quick troubleshooting

| Issue | What to do |
|-------|------------|
| Panel **Disconnected** / **ERR_CONNECTION_REFUSED** | Open **`https://devlynx-black.vercel.app/health`** (or your `DEVLYNX_FEED_API`). If OK, reload extension; ensure you loaded **`dist`** after a build. If you use **local-feed**, run **`npm start`** in **feed-server**. |
| Push blocked (GitHub secrets) | Never commit **`.env`**, **`.env.local`**, or keys. See `.gitignore`. |
| Wrong API host | Edit **`HOSTED_FEED_API`** / **`DEVLYNX_FEED_API`** in **`scripts/build.js`**, update **`host_permissions`** in **`src/manifest.json`**, rebuild. |

**Toolbar:** Extensions (puzzle) → **DevLynx AI** → **Pin**.

---

## 6. License verification (Pro)

The extension calls **`POST /verify-license`** on the configured feed API with a `license_key`. Only the server validates (Gumroad, **`DEV_CODES`**, etc.). Details: [developer/FREEMIUM.md](developer/FREEMIUM.md).

**Gumroad:** set **`GUMROAD_PRODUCT_ID`** in the **Vercel** env (or **`feed-server/.env`** locally).

**Dev codes (server-only):** in env: `DEV_CODES=key1,key2`

**Local dev bypass:** requests from **localhost** with **no** license key return valid for local server only.

---

## 7. Store assets

Screenshots / promos: **`assets/screenshot-sidepanel.png`**, then **`npm run store-promos:from-screenshot`** → **`assets/store-mockups/`**. See [developer/PUBLISHING.md](developer/PUBLISHING.md) §4.

---

## More docs

- [PROJECT-STRUCTURE.md](PROJECT-STRUCTURE.md) — repo layout  
- [PRODUCT-SUMMARY.md](PRODUCT-SUMMARY.md) — product overview  
- [developer/VERCEL.md](developer/VERCEL.md) — Vercel deep dive  
- [developer/RELEASE-PRODUCTION.md](developer/RELEASE-PRODUCTION.md) — production checklist  
- [src/README.md](src/README.md) — extension-focused readme  
