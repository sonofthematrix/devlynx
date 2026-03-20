# Release to production (checklist)

## 1. Feed server (Railway **or** Vercel)

**Vercel + Blob:** See **[developer/VERCEL.md](VERCEL.md)** (root `feed-server`, Blob token, custom domain).

**Railway / Docker**

1. GitHub repo connected → **Root directory:** `feed-server` (Dockerfile deploy).
2. **Variables:** `OPENAI_API_KEY`, `GUMROAD_PRODUCT_ID` (if using Gumroad), optional `OPENAI_MODEL`, `DEV_CODES`, optional **`LICENSE_JWT_PRIVATE_KEY`** ( **`GET /trial-token`** / **`POST /trial-consume`** ; pair with public PEM in **`src/license-jwt-public.js`** — **[developer/LICENSE-JWT-KEYS.md](LICENSE-JWT-KEYS.md)** ), optional **`DEVLYNX_TRIAL_LIMIT`**. On Vercel, also **`BLOB_READ_WRITE_TOKEN`** for screenshot + persisted trial store.
3. **Public HTTPS URL** must match the extension build: set **`DEVLYNX_API_BASE_REPLACE`** in **`scripts/build.js`** (default **`https://devlynx-black.vercel.app`**) and add the same origin to **`src/manifest.json`** `host_permissions`, then rebuild.
4. Verify: `GET https://<your-host>/health` → `"ok": true`.

## 1b. DNS for `api.devlynx.ai` (registrar / Cloudflare / etc.)

Add records in the **devlynx.ai** zone. Use the **exact** target and TXT value from **Railway → your service → Settings → Networking → Custom domain** (they change if you re-add the domain).

| Type | Name (host) | Value |
|------|-------------|--------|
| **CNAME** | `api` | Your Railway hostname, e.g. `xxxx.up.railway.app` (no `https://`) |
| **TXT** | `_railway-verify.api` | `railway-verify=...` (full string from Railway) |

- **Name field:** Many panels expect `api` or `_railway-verify.api` relative to `devlynx.ai`. If unsure, use the **full** names: `api.devlynx.ai` / `_railway-verify.api.devlynx.ai` only if your DNS UI asks for FQDN.
- **Cloudflare:** set the **`api`** CNAME to **DNS only** (grey cloud), not Proxied, unless Railway’s docs say otherwise.
- After saving: wait for propagation (minutes–hours) → click **Verify** in Railway → wait for TLS **Active**.
- **Do not** commit the TXT verification value to git; copy it fresh from Railway if you re-verify.

**Proceed after DNS:** In Railway, add custom domain **`api.devlynx.ai`** if you haven’t already, complete verification, then open **`https://api.devlynx.ai/health`** in a browser.

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

## 3. Version

Bump **`version`** in **`src/manifest.json`** before store submission, then `npm run release` again.

## Scripts reference

| Command | Result |
|---------|--------|
| `npm run release` | **Production** zip (`build:prod` + zip) |
| `npm run package` | Dev zip (`build` + localhost API + zip) |
| `npm run package:prod` | Same as release pipeline without alias |
