# Deploy feed server on Vercel + Blob (screenshots)

The feed API is **serverless Node** on Vercel. There are **two** valid layouts — pick **one** and match **Root Directory** in the Vercel project.

| Root Directory | Entry files | Config |
|----------------|-------------|--------|
| **Repository root** (`.`) | `api/index.js`, `api/[[...slug]].js` | `vercel.json` at repo root |
| **`feed-server`** | `api/server/[[...slug]].js` | `feed-server/vercel.json` |

Public URLs like `/health` are **rewritten** to `/api/...` or `/api/server/...`. The handler strips that prefix in `getRequestPathname` in `server-with-ai.js`. There is **no** `public/` output and **no** `vercel-build` script (API-only).

Screenshots use **Vercel Blob** when `BLOB_READ_WRITE_TOKEN` is set.

---

## A. Vercel project (repository root)

1. [Vercel Dashboard](https://vercel.com) → **Add New** → **Project** → import the Git repo.
2. **Root Directory:** `.` (leave empty / repository root).
3. **Framework Preset:** **Other**.
4. **Build Command:** leave empty, or rely on **`vercel.json`** `buildCommand` (skips the extension build).
5. **Output Directory:** **leave empty** (not `public`).

**Node:** root `package.json` has `"engines": { "node": ">=20" }`.

## B. Vercel project (`feed-server` only)

1. **Root Directory:** `feed-server`.
2. **Framework Preset:** **Other**.
3. **Build Command:** empty.
4. **Output Directory:** **leave empty**.

**Node:** `feed-server/package.json` has `"engines": { "node": "20.x" }`.

---

## Environment variables

In **Project → Settings → Environment Variables** (Production + Preview as needed):

| Name | Notes |
|------|--------|
| `OPENAI_API_KEY` | Required for AI. |
| `GUMROAD_PRODUCT_ID` | If using Gumroad (or use `GUMROAD_PRODUCT_PERMALINK` — see `feed-server/.env.example`). |
| `OPENAI_MODEL` | Optional (`gpt-4o-mini` default in code). |
| `DEV_CODES` | Optional. |
| `BLOB_READ_WRITE_TOKEN` | **Storage → Blob**; screenshots + trial persistence. |
| `LICENSE_JWT_PRIVATE_KEY` | PEM for RS256 — Pro JWT + trial endpoints (see **LICENSE-JWT-KEYS.md**). |
| `DEVLYNX_TRIAL_LIMIT` | Optional (default **20**). |

Do **not** rely on `PORT` on Vercel.

---

## Vercel Blob

1. **Storage** → **Create Database** → **Blob** → attach to this project.
2. Redeploy after the token is added.

**Trial accounting:** With `LICENSE_JWT_PRIVATE_KEY` + `BLOB_READ_WRITE_TOKEN`, trial usage is persisted in Blob. Without Blob on Vercel, trial counts are in-memory only.

---

## Custom domain

Point your API host (e.g. `api.devlynx.ai`) per Vercel **Domains**. The extension build uses **`HOSTED_FEED_API`** in `scripts/build.js`; align **`host_permissions`** in `src/manifest.json`.

---

## Verify

- `GET https://<your-domain>/health` → JSON with `"ok": true`, `"runtime": "vercel"` when deployed.
- Serverless limits: see `maxDuration` in the active `vercel.json` (`api/**/*.js` or `api/server/[[...slug]].js`).
