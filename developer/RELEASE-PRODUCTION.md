# Release to production (checklist)

## 1. Feed server (Vercel)

Full steps: **[developer/VERCEL.md](VERCEL.md)** — project root **`feed-server`**, env vars, Blob, custom domain.

**Checklist**

1. GitHub repo → Vercel project → **Root Directory:** `feed-server`.
2. **Environment variables:** `OPENAI_API_KEY`, `GUMROAD_PRODUCT_ID` (if using Gumroad), optional `OPENAI_MODEL`, `DEV_CODES`, **`BLOB_READ_WRITE_TOKEN`** (screenshots + persisted trials), optional **`LICENSE_JWT_PRIVATE_KEY`** for **`GET /trial-token`** / **`POST /trial-consume`** (pair with public PEM in **`src/license-jwt-public.js`** — **[developer/LICENSE-JWT-KEYS.md](LICENSE-JWT-KEYS.md)** ), optional **`DEVLYNX_TRIAL_LIMIT`**.
3. **Public HTTPS URL** must match the extension build: set **`DEVLYNX_API_BASE_REPLACE`** in **`scripts/build.js`** (default **`https://devlynx-black.vercel.app`**) and add the same origin to **`src/manifest.json`** `host_permissions`, then rebuild.
4. Verify: `GET https://<your-host>/health` → `"ok": true`.

## 1b. Custom domain (e.g. `api.devlynx.ai`)

Use **Vercel → Project → Settings → Domains** and follow their DNS instructions (often **CNAME** to `cname.vercel-dns.com`). Details: **[developer/VERCEL.md](VERCEL.md)** §4.

After DNS propagates, open **`https://<your-domain>/health`** in a browser.

## 2. Extension (store or unpacked)

From **project root**:

```bash
npm install
npm run release
```

- Output: **`release/devlens-extension.zip`** — points at **production API** (`build:prod`).
- If you use server-signed trials, embed the matching **public** key in **`src/license-jwt-public.js`** before `npm run release`.
- **Chrome Web Store:** upload that zip only.
- **Sideload test:** Extensions → Developer mode → **Load unpacked** → select **`dist/`** after `npm run release` (or run `npm run build:prod` then load `dist/`).
- **ZIP for testers (one folder, no nested `dist/`):** `npm run zip:manual` → **`release/DevLynx-AI-Manual-Install.zip`** — unzip, then Load unpacked → folder **`DevLynx-AI-Extension`**.

## 3. Version

Bump **`version`** in **`src/manifest.json`** before store submission, then `npm run release` again.

## Scripts reference

| Command | Result |
|---------|--------|
| `npm run release` | **Production** zip (`build:prod` + zip) |
| `npm run package` | Dev zip (`build` + localhost API + zip) |
| `npm run package:prod` | Same as release pipeline without alias |
| `npm run zip:manual` | `build:prod` + **`release/DevLynx-AI-Manual-Install.zip`** (unpacked install folder for testers) |
