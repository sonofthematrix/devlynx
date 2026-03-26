# License & trial JWT keys (RS256)

The extension verifies **Pro license** and **free trial** JWTs locally using the public key in `src/license-jwt-public.js` (`DEVLYNX_LICENSE_JWT_PUBLIC_PEM`).

The feed server signs those JWTs with the matching **private** key from `LICENSE_JWT_PRIVATE_KEY` (environment variable, PEM text).

## Recommended workflow (best)

1. **Source of truth:** The **public** key committed in `src/license-jwt-public.js` is what every shipped extension uses.
2. **Vercel:** Set **`LICENSE_JWT_PRIVATE_KEY`** to the **matching private PEM** (full `-----BEGIN PRIVATE KEY-----` … `-----END PRIVATE KEY-----`). Same value in **Production** (and Preview if you use trial JWT there).
3. **Check:** `GET https://<your-feed>/health` → `"trialJwt": true` means the server loaded a private key. If trial requests still fail, the pair does **not** match the public key in the repo → fix Vercel or regenerate (below).
4. **Local dev:** Put the **same** `LICENSE_JWT_PRIVATE_KEY` in **`feed-server/.env`** (never commit). Copy from Vercel if you don’t have it locally.
5. **Vercel zonder .env openen (Windows):** vanuit projectroot: `npm run jwt:copy-for-vercel` — zet de private PEM op je **klembord**; plak in Vercel bij `LICENSE_JWT_PRIVATE_KEY` → Save → Redeploy. (Handmatig: root `.env` of `feed-server/.env`, regel `LICENSE_JWT_PRIVATE_KEY=`.) Root niet sync? `npm run sync:license-jwt-to-root-env`.
6. **Do not regenerate** a new pair unless you **intend to rotate**: after rotation you must update **Vercel**, commit the **new** public key, and ship a **new** extension build.

## Generate a key pair (new or rotation only)

**Preferred in this repo (PKCS8 PEM, matches server):** from repo root, with `feed-server/.env` present:

```bash
npm run gen:license-jwt-keys
```

This writes `LICENSE_JWT_PRIVATE_KEY` into `feed-server/.env`, mirrors it to the **root** `.env` (if that file exists), and updates `src/license-jwt-public.js`. Then: **`npm run jwt:copy-for-vercel`** (Windows) → plak in Vercel, of handmatig kopiëren. Commit the public key change, run `npm run release`.

### OpenSSL (alternative)

From any shell with OpenSSL:

```bash
openssl genrsa -out devlynx-license-private.pem 2048
openssl rsa -in devlynx-license-private.pem -pubout -out devlynx-license-public.pem
```

- **Never commit** `devlynx-license-private.pem`. Add to **Vercel** (env) and local `feed-server/.env` as `LICENSE_JWT_PRIVATE_KEY` (PEM body). In multi-line env vars you can use literal newlines or `\n` escapes; the server normalizes `\n` to newlines.
- **Do commit** the **public** PEM into `src/license-jwt-public.js` (replace the empty `DEVLYNX_LICENSE_JWT_PUBLIC_PEM` assignment with the contents of `devlynx-license-public.pem` in a template string).

Then rebuild the extension (`npm run build:prod` / `npm run release`) so `dist/` includes the public key.

## Endpoints that use these keys

| Endpoint            | Purpose                                      |
|---------------------|----------------------------------------------|
| `GET /trial-token`  | Issue signed trial JWT + `trial_remaining`    |
| `POST /trial-consume` | Refresh JWT after one AI use (server decrement) |

Pro flows may later use the same key pair for license JWTs if you add signing to `POST /verify-license`.
