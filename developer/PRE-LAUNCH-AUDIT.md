# DevLynx AI – Final Pre-Launch Audit

**Date:** Pre-launch  
**Scope:** Bugs, security, performance, UX, trial/license bypass, upgrade flow, storage races, branding.

---

## 1. Bugs found

| # | Severity | Description | Location | Recommendation |
|---|----------|-------------|----------|----------------|
| 1 | Low | **loadProjects() race:** Multiple calls (initial, 800ms retry, 5s interval, visibility) can run concurrently. Last completion wins; a late failure can overwrite an earlier success and show "Disconnected" briefly. | panel.js | Optional: use a "load id" and only apply state when the response matches the latest started load. |
| 2 | Low | **Plan in status bar:** `updateStatusBar()` sets plan text inside `getPlan().then()` / `getTrialUsesRemaining().then()`, so plan can update a moment after server/OpenAI. Multiple rapid `updateStatusBar()` calls can reorder. | panel.js | Cosmetic only; no logic bug. |
| 3 | Low | **Screenshot filename:** If `filename` becomes empty after sanitization (e.g. only invalid chars), server may write to an unexpected path. | feed-server/server-with-ai.js | Reject with 400 when `!base || base.length === 0` and do not write. |

No critical or high-severity bugs found. Trial decrement, license verification, and server-offline handling have been audited and fixed in earlier passes.

---

## 2. Security issues

| # | Severity | Description | Status |
|---|----------|-------------|--------|
| 1 | — | **.env in .gitignore:** `.env` and `feed-server/.env` are listed. API keys and DEV_CODES not committed. | OK |
| 2 | Medium | **Server listens on 0.0.0.0:** Reachable from LAN. Developer bypass still uses only `remoteAddress` (127.0.0.1/::1). | Document; for strict local-only, use 127.0.0.1 or firewall. |
| 3 | Medium | **No body size limit:** `parseBody(req)` reads the full body; very large JSON could cause high memory use (DoS). | Add max body size (e.g. 1–2 MB) and return 413/400 for oversized. |
| 4 | Low | **X-Forwarded-For:** Not used; bypass uses only `req.socket.remoteAddress`. If a proxy is added later, do not trust X-Forwarded-For for localhost unless the proxy is trusted. | Document. |
| 5 | — | **Options Save:** Only stores the key; Pro is set only after "Verify with server" (server decides). No license bypass. | OK |
| 6 | — | **API_REQUEST:** Fetches any URL from extension context only; not callable from web pages. host_permissions are broad by design for API tester. | Accepted. |

No critical security bugs. Sensitive data (OPENAI_API_KEY, DEV_CODES, GUMROAD_PRODUCT_ID) stay on the server; extension only holds plan and license key.

---

## 3. Performance improvements

| # | Suggestion | Impact |
|---|------------|--------|
| 1 | **loadProjects sequence:** Currently GET /projects then GET /health. Could do both in parallel after first success to reduce latency; current order is correct for "connected" then "API key". | Optional. |
| 2 | **Throttle retries:** 5s interval and visibility retry can cause many calls if the user keeps the panel open and server is down. Consider backoff or max retries. | Low. |
| 3 | **Status bar plan:** `getPlan()` and `getTrialUsesRemaining()` are async; could cache for the same "tick" to avoid duplicate storage reads when multiple `updateStatusBar()` calls happen. | Low. |

No blocking performance issues. Extension and server are lightweight.

---

## 4. UX improvements

| # | Suggestion | Status |
|---|------------|--------|
| 1 | **SERVER_OFFLINE_MSG** used consistently in panel, background, options. | Done. |
| 2 | **Upgrade buttons** all use `openPricingUrl()` and GUMROAD_URL. | Done. |
| 3 | **Trial UI** shows remaining uses, low-uses color, "Upgrade before trial ends" when &lt; 5. | Done. |
| 4 | **Status bar** shows Server, OpenAI, Plan. | Done. |
| 5 | **Placeholder in website:** Footer has `your-username/devlens-saas`; replace with real repo or remove before public launch. | Pre-launch todo. |
| 6 | **API tester placeholder:** `api-url` default is jsonplaceholder; fine for demo. | OK. |

---

## 5. Trial bypass possibilities

| Vector | Mitigation | Residual risk |
|--------|------------|----------------|
| Delete only `trialUsesRemaining` | `trialInstallId` + "if installId and no remaining → set 0". | Low. |
| Full `chrome.storage.local.clear()` | Trial resets to 20; no server-side trial. | Accepted (documented). |
| Reinstall extension | New install gets new installId and 20 uses. | Accepted. |

Trial is client-side by design; no server-side trial. Mitigations limit simple resets. No code bugs found that allow bypass without clearing storage or reinstalling.

---

## 6. License bypass risks

| Vector | Status |
|--------|--------|
| Options "Save" sets Pro without verify | **Fixed.** Save only stores the key; Pro only after "Verify with server" returns success. |
| Setting plan in storage from console | User can set `devlens_plan` to 'pro' locally; server still validates license for AI. So UI would show Pro but AI would fail without a valid key. | Accepted (server enforces). |
| Developer bypass (localhost, no key) | Intentional for dev; only when request is from 127.0.0.1/::1. | By design. |

No unmitigated license bypass. Server is the source of truth for AI access when GUMROAD_PRODUCT_ID or DEV_CODES are used.

---

## 7. Upgrade flow

| Check | Status |
|-------|--------|
| GUMROAD_URL constant | `https://jcdreamz.gumroad.com/l/devlynx-ai` (panel.js). |
| openPricingUrl() | Uses GUMROAD_URL, chrome.tabs.create + fallback, hideUpgradeModal. |
| Footer / Go Pro button | Uses openPricingUrl. |
| Upgrade modal button | Uses openPricingUrl. |
| No PRICING_URL or wrong URL in extension | Confirmed. |

Upgrade flow is consistent and correct.

---

## 8. Storage race conditions

| Scenario | Behavior | Risk |
|----------|----------|------|
| Two PRO features with 1 trial left | Both may pass `canUseProTrialFeature()`, both decrement; storage uses Math.max(0, n). Result: 0, no negative. One "extra" use possible. | Low; acceptable for client-side trial. |
| Concurrent setPlan / refreshLicenseIfStale | Different keys; no shared counter. | OK. |
| Trial decrement + updateTrialUI | Decrement then updateTrialUI(); storage.onChanged also fires. No double-decrement. | OK. |

No critical storage races. Trial read–write is not atomic but is bounded and safe.

---

## 9. Branding consistency (DevLynx AI)

| Check | Result |
|-------|--------|
| Visible UI text contains "DevLens" | **None.** Grep for "DevLens" in src (excluding storage keys/internal IDs): no matches in user-facing strings. |
| Manifest / panel / options / content | Name/title "DevLynx AI"; toast "DevLynx AI Explain Element"; context menu "DevLynx AI". |
| Storage keys unchanged | `devlens_plan`, `devlens_license_key`, `devlens_license_verified_at`, etc. left as-is per requirement. |
| GUMROAD_URL | Product slug `devlynx-ai` (Gumroad URL); matches product name DevLynx AI. |
| Website | Footer "DevLynx AI"; placeholder "your-username/devlens-saas" for GitHub. |

Branding is consistent; no visible "DevLens" in the extension UI.

---

## 10. Launch readiness score (original): **82 / 100** → see §13 for updated score after fixes

| Area | Score | Notes |
|------|-------|--------|
| **Bugs** | 18/20 | Minor races and edge cases only; no critical bugs. |
| **Security** | 14/20 | .env and options fixed; 0.0.0.0 and body limit are documented medium items. |
| **Performance** | 16/20 | No blocking issues; optional improvements. |
| **UX** | 18/20 | Consistent messages and upgrade flow; placeholder in website. |
| **Trial / License** | 16/20 | Client-side trial and server-enforced license; accepted residual risks. |

**Summary (original):** Ready for launch with known, documented limitations. Body size limit, loadProjects race, and screenshot filename validation have since been implemented; see §12–§13.

---

## 11. Pre-launch checklist (quick reference)

- [x] SERVER_OFFLINE_MSG consistent (panel, background, options)
- [x] Upgrade buttons use openPricingUrl() and GUMROAD_URL
- [x] Trial decrement only on successful AI (Explain Element + Error Explainer)
- [x] License Pro only after Verify (Save does not set Pro)
- [x] No visible "DevLens" in extension UI; storage keys unchanged
- [x] .env in .gitignore
- [x] Body size limit on feed-server (2 MB, 413)
- [x] Screenshot reject empty/invalid filename (400)
- [x] loadProjects race condition (loadId guard)
- [ ] Website: set real GitHub URL or remove placeholder

---

## 12. Post-fixes re-audit (post race / body limit / filename validation)

**Verified fixes:**

| Fix | Location | Verification |
|-----|----------|--------------|
| **Race condition** | `src/sidepanel/panel.js` | `currentLoadId` declared; `loadId = ++currentLoadId` at start of `loadProjects()`; guard `if (loadId !== currentLoadId) return` after each `await` (projects fetch, health fetch) and before all UI/state updates (catch blocks, success path, setFeedServerStatus, project list). Only the latest request updates UI; no overwrite by older requests. |
| **Body size limit** | `feed-server/server-with-ai.js` | `MAX_BODY_SIZE = 2 * 1024 * 1024`; `parseBody()` tracks byte length, rejects with `err.code = 'PAYLOAD_TOO_LARGE'` when `total > MAX_BODY_SIZE`, calls `req.destroy()` to stop reading; server try/catch sends 413 with `Payload too large` when `err.code === 'PAYLOAD_TOO_LARGE'`. CORS header set on 413. |
| **Filename validation** | `feed-server/server-with-ai.js` | After sanitize: `base = String(filename).replace(...).trim()`; check `!base \|\| base === '.' \|\| base === '..' \|\| base.includes('..')`; if true, `send(res, 400, { ok: false, error: 'Invalid filename' })` and return before `writeFileSync`. No file written for empty or path-traversal names. |

**Regressions checked:** No changes to success paths for valid inputs. Extension does not assume a specific status for oversized/invalid; 413 and 400 are handled as errors by fetch. Screenshot success flow unchanged for valid `image` + `filename`.

**New bugs:** None identified. loadId is module-scoped and only incremented; parseBody `done` flag prevents double resolve/reject; filename validation does not alter valid names.

---

## 13. Launch readiness score (updated): **88 / 100**

| Area | Score | Notes |
|------|-------|--------|
| **Bugs** | 20/20 | Race and screenshot edge cases addressed. |
| **Security** | 18/20 | Body limit and filename validation in place; 0.0.0.0 and X-Forwarded-For remain documented. |
| **Performance** | 16/20 | No blocking issues; optional improvements (throttle retries, status bar cache). |
| **UX** | 18/20 | Unchanged; consistent messages and upgrade flow. |
| **Trial / License** | 16/20 | Unchanged; client-side trial and server-enforced license. |

**Summary:** Ready for launch. Race condition, body size limit, and screenshot filename validation are resolved with no observed regressions.
