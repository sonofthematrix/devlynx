# Deploy feed server on Vercel + Blob (screenshots)

The **feed-server** runs as a **Node Serverless Function** at **`api/server/[[...slug]].js`**. Public URLs like `/health` are **rewritten** to `/api/server/health`; the handler strips the `/api/server` prefix from `req.url` before routing (see `getRequestPathname` in `server-with-ai.js`). Screenshots use **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set.

## 1. Vercel project

1. [Vercel Dashboard](https://vercel.com) → **Add New** → **Project** → import your Git repo.
2. **Root Directory:** `feed-server` (critical).
3. Framework Preset: **Other** (no framework).
4. **Build Command:** `npm run vercel-build` (creates `public/` for Vercel’s static output step).
5. **Output Directory:** `public` — or match **`vercel.json`** (`buildCommand` + `outputDirectory`). The repo includes a tiny **`feed-server/public/index.html`** placeholder; **`/`** is still served by the API via rewrites.

**Node version:** `feed-server/package.json` sets `"engines": { "node": "20.x" }` so Vercel uses **Node 20** and you avoid the `"node": ">=18"` warning about automatic major upgrades. You can override in **Project → Settings → General → Node.js Version** if needed.

## 2. Environment variables

In **Project → Settings → Environment Variables**, add (Production + Preview as needed):

| Name | Notes |
|------|--------|
| `OPENAI_API_KEY` | Required for AI. |
| `GUMROAD_PRODUCT_ID` | If using Gumroad license checks. |
| `OPENAI_MODEL` | Optional (`gpt-4o-mini` default in code). |
| `DEV_CODES` | Optional. |
| `BLOB_READ_WRITE_TOKEN` | From **Storage → Blob** (below). Screenshots + **authoritative trial counts** (see below). |
| `LICENSE_JWT_PRIVATE_KEY` | PEM for RS256 — enables **`GET /trial-token`** and **`POST /trial-consume`** (see **`developer/LICENSE-JWT-KEYS.md`**). |
| `DEVLYNX_TRIAL_LIMIT` | Optional. Initial trial uses per device (default **20**). |

Do **not** rely on `PORT` on Vercel.

## 3. Vercel Blob

1. In the same Vercel project (or team): **Storage** → **Create Database** → **Blob**.
2. Attach the store to this project (wizard adds **`BLOB_READ_WRITE_TOKEN`** to env).
3. Redeploy if the token was added after the first deploy.

**Behaviour:** When `BLOB_READ_WRITE_TOKEN` is set, `POST /` with `type: "screenshot"` uploads to Blob and returns a public **`path`** URL. Locally or on Railway **without** this token, screenshots still go to **`feed-server/screenshots/`**.

**Trial accounting on Vercel:** With **`LICENSE_JWT_PRIVATE_KEY`** + **`BLOB_READ_WRITE_TOKEN`**, trial usage is persisted in Blob as **`internal/devlynx-trials.json`**. Without Blob on Vercel, trial counts are **in-memory only** (unstable); prefer Blob or Railway for strict enforcement.

## 4. Custom domain

Point **`api.devlynx.ai`** (CNAME to `cname.vercel-dns.com` or as shown in Vercel **Domains**) to this project if you use a custom domain.

The extension **`npm run build:prod`** API base is set in **`scripts/build.js`** (default **`https://devlynx-black.vercel.app`**). Add that host under **`host_permissions`** in `src/manifest.json` if you change it.

## 5. Verify

- `GET https://<your-domain>/health` → JSON with `"ok": true`, `"runtime": "vercel"`, `"blobStorage": true` once Blob is configured, and **`trialJwt` / `trialPersistence`** when trial signing is configured.
- **Limits:** Serverless has body-size and duration limits; AI routes may need **Pro** for longer **`maxDuration`** (see `vercel.json`).

## 6. Railway vs Vercel

| | Railway / Docker | Vercel |
|---|------------------|--------|
| Model | Long-running `node server-with-ai.js` | Per-request `api/server.js` |
| Screenshots | Local volume / `screenshots/` | **Blob** (when token set) |
| Rewrites | N/A | `vercel.json` maps `/` → handler |

You can keep **Railway** for simplicity or use **Vercel** for Blob + serverless; use **one** production URL in the extension build.
