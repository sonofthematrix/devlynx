# License & trial JWT keys (RS256)

The extension verifies **Pro license** and **free trial** JWTs locally using the public key in `src/license-jwt-public.js` (`DEVLYNX_LICENSE_JWT_PUBLIC_PEM`).

The feed server signs those JWTs with the matching **private** key from `LICENSE_JWT_PRIVATE_KEY` (environment variable, PEM text).

## Generate a key pair

From any shell with OpenSSL:

```bash
openssl genrsa -out devlynx-license-private.pem 2048
openssl rsa -in devlynx-license-private.pem -pubout -out devlynx-license-public.pem
```

- **Never commit** `devlynx-license-private.pem`. Add to Railway / Vercel / local `feed-server/.env` as `LICENSE_JWT_PRIVATE_KEY` (PEM body). In multi-line env vars you can use literal newlines or `\n` escapes; the server normalizes `\n` to newlines.
- **Do commit** the **public** PEM into `src/license-jwt-public.js` (replace the empty `DEVLYNX_LICENSE_JWT_PUBLIC_PEM` assignment with the contents of `devlynx-license-public.pem` in a template string).

Then rebuild the extension (`npm run build:prod` / `npm run release`) so `dist/` includes the public key.

## Endpoints that use these keys

| Endpoint            | Purpose                                      |
|---------------------|----------------------------------------------|
| `GET /trial-token`  | Issue signed trial JWT + `trial_remaining`    |
| `POST /trial-consume` | Refresh JWT after one AI use (server decrement) |

Pro flows may later use the same key pair for license JWTs if you add signing to `POST /verify-license`.
