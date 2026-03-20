# Freemium model – DevLynx AI

DevLynx AI is **freemium**: **Free** = core dev tools + a shared **AI trial**; **Pro** = **unlimited AI**.

---

## Positioning

| | Free | Pro |
|---|------|-----|
| **Positioning** | Tools + try AI | Unlimited AI productivity |
| Inspect / DOM / mods | ✓ | ✓ |
| API tester (HTTP) | ✓ | ✓ |
| Screenshot, context menu tools | ✓ | ✓ |
| **AI** (Dev assistant, Mod generator, API tester “Gen code / Explain”, Explain Element, Error Explainer) | **20 uses total** (shared trial, extension-side) | **Unlimited** |

**Rule of thumb:** Free = tools + limited AI trial. Pro = unlimited AI + lifetime updates (see upgrade copy in `src/sidepanel/panel.html`).

---

## Implementation

- **Trial limit:** `TRIAL_LIMIT` in `src/sidepanel/panel.js` (default **20**). Storage: `trialUsesRemaining`, `trialInstallId`.
- **Gating:** `canUseProTrialFeature()` — Pro (`devlens_plan === 'pro'`) always allowed; otherwise trial must be &gt; 0.
- **Decrement:** After a **successful** AI response (`success: true` from feed server where applicable). Panel handles panel UI; **background** applies the same trial rules for **context-menu** AI actions (`aiContext` selection flows).
- **Feed server:** `devQuestion` responses include `success: true | false`. `generateMod` includes `success` when parseable CSS/JS was returned.
- **User OpenAI key (BYOK) & trial:** For `OPENAI_AI` flows (`devQuestion`, `aiContext`, `generateMod`), **Free** users need a valid **server-signed trial JWT** when the feed server has **`LICENSE_JWT_PRIVATE_KEY`** set (`GET /trial-token`, **`POST /trial-consume`** after each successful AI use). The extension verifies JWTs with **`DEVLYNX_LICENSE_JWT_PUBLIC_PEM`** in `src/license-jwt-public.js` (see **`developer/LICENSE-JWT-KEYS.md`**).
- **Fallback (no server signing):** If **`/trial-token`** is missing, misconfigured, or unreachable, **client `trialUsesRemaining`** &gt; 0 still allows AI; **`postTrialConsumeAfterAi`** then decrements **`trialUsesRemaining`** only when there is no trial JWT (`src/background.js`).

### Server-side trial storage

| Deploy | Persistence |
|--------|-------------|
| Local / Railway | `feed-server/trials.json` (gitignored) |
| Vercel + Blob | Blob object `internal/devlynx-trials.json` (same token as screenshots) |
| Vercel, no Blob | In-memory only — **not** safe for enforcement (cold starts reset counts). |

`GET /health` includes `trialJwt`, `trialPersistence`, and `trialDefaultLimit`.

---

## Configuration

### 1. Checkout URL (extension)

In **`src/sidepanel/panel.js`**, `GUMROAD_URL` is the primary upgrade link (`https://jcdreamz.gumroad.com/l/devlynx-ai`).

### 2. Website / pricing page

- **`website/index.html`** — static pricing; host on GitHub Pages, Netlify, etc.

### 3. Gumroad (license keys)

- Enable **License keys** on the product. Set **`GUMROAD_PRODUCT_ID`** in **`feed-server/.env`** so the server can verify keys on AI requests when you want paid enforcement server-side.

### 4. License verification

- **`POST /verify-license`** with `{ "license_key": "..." }` → `{ "ok": true }` or error. Options page: **Verify with server**.
- When `GUMROAD_PRODUCT_ID` is set, AI types `devQuestion`, `aiContext`, `generateMod` require a valid Gumroad key in the request body (server-side).

### 5. Developer bypass

- Localhost + empty license key → Pro for local dev (see root `README.md`).

---

## Summary

| Item | Where |
|------|--------|
| Plan | `chrome.storage.local` `devlens_plan` (`free` \| `pro`) |
| License key | `devlens_license_key` |
| Trial uses | `trialUsesRemaining` |
| Panel gates & decrement | `src/sidepanel/panel.js` |
| Context menu trial | `src/background.js` (shared keys) |
| Upgrade copy | `src/sidepanel/panel.html` |
| Options hint | `src/options/options.html` |
| Server `success` flags | `feed-server/server-with-ai.js` (`devQuestion`, `generateMod`) |
