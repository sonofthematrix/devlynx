# Trial Decrement Logic – Audit Report

**Rule:** Trial must only decrement on **successful AI responses**. Server failures, network errors, and AI failures must **not** consume trial uses.

---

## 1. Explain Element

### Flow
1. User triggers Explain Element → background sends `POST /` with `type: 'aiContext', action: 'explainElement'`.
2. Server calls OpenAI; returns `{ ok: true, answer }` (HTTP 200 in all cases).
3. Background receives response and sends `ELEMENT_EXPLAIN_RESULT` to panel (and content) with `answer` and `success`.
4. Panel listens for `ELEMENT_EXPLAIN_RESULT` and decrements only when `message.success === true && !licenseValid()`.

### Requirement
Trial decrement **only** when `message.success === true`.

### Bug (fixed)
- **Before:** Server always returned HTTP 200 with `{ ok: true, answer }`. On AI failure it put the error text in `answer`. Background used `tryFetch` and on any 200 response called `.then()` and sent `success: true`. So **trial was decremented on AI failure** (e.g. "Error connecting to OpenAI") and on any 200 response.
- **After:**  
  - **Server** (`feed-server/server-with-ai.js`): For `aiContext`, on success sends `{ ok: true, success: true, answer: result.content }`; on AI failure sends `{ ok: true, success: false, error: result.error, answer: result.error }`.  
  - **Background** (`src/background.js`): Sets `success = data && data.success === true` and sends `ELEMENT_EXPLAIN_RESULT` with that `success` value.  
  - **Panel** (`src/sidepanel/panel.js`): Unchanged: decrements only when `message.success === true && !(await licenseValid())`.

### Verification
- **Network error / server unreachable:** `tryFetch` rejects → `.catch()` runs → `ELEMENT_EXPLAIN_RESULT` sent with `success: false` → no decrement. ✅  
- **Server returns 200 with AI error:** Server now sends `success: false` → background sends `success: false` → no decrement. ✅  
- **Server returns 200 with AI success:** Server sends `success: true` → background sends `success: true` → decrement. ✅  

---

## 2. Error Explainer

### Flow
1. User clicks Error Explainer → panel calls `apiPost({ type: 'aiContext', action: 'explainError', ... })`.
2. Background handles `API_REQUEST`, fetches server; returns `{ ok, status, data }` or `{ error }`.
3. Panel checks `result.error` (transport), then `result.data.error` (server error field), then shows answer and optionally decrements.

### Requirement
Trial must decrement only after a successful response. Server failures, network errors, and AI failures must **not** consume trial.

### Bug (fixed)
- **Before:** Panel decremented when `!result.error && !(result.data && result.data.error)`. The server did **not** set `result.data.error` on AI failure for `aiContext`; it only set `answer` to the error message. So when the server returned 200 with `{ ok: true, answer: "Incorrect API key" }`, the panel did not see `result.data.error` and **did decrement** on AI failure.
- **After:**  
  - **Server:** Sends `success: true` or `success: false` (and when false, `error` and `answer`) for `aiContext` as above.  
  - **Panel:** Decrements only when `result.data && result.data.success === true` and `!(await licenseValid())`. So if the server sends `success: false` (or omits it), no decrement.

### Verification
- **Network error:** `apiPost` resolves with `result.error` set → early return, no decrement. ✅  
- **Server returns 200 with AI error:** Server sends `success: false` (and `error`) → `result.data.success !== true` → no decrement. ✅  
- **Server returns 200 with AI success:** Server sends `success: true` → `result.data.success === true` → decrement. ✅  
- **Server returns 4xx/5xx or body with ok: false:** `handleApiRequest` returns `{ ok: false, data }`; panel could receive that. If the background returns the body as `data`, then `result.data.error` or missing `result.data.success` would prevent decrement. ✅  

---

## 3. Summary Table

| Scenario                     | Explain Element      | Error Explainer       |
|----------------------------|----------------------|------------------------|
| Network / server unreachable | No decrement ✅      | No decrement ✅        |
| Server 200, AI success     | Decrement ✅         | Decrement ✅           |
| Server 200, AI failure     | No decrement ✅ (fix) | No decrement ✅ (fix)  |
| Server 200, empty/invalid  | No decrement ✅      | No decrement ✅        |

---

## 4. Code References (after fix)

- **Server** (`feed-server/server-with-ai.js`): `aiContext` branch sends `success: true` with `answer: result.content` on success; `success: false` with `error` and `answer: result.error` on failure.
- **Background** (`src/background.js`): `ELEMENT_EXPLAIN_RESULT` uses `success = data && data.success === true`.
- **Panel Explain Element** (`src/sidepanel/panel.js`): `if (message.success === true && !(await licenseValid())) { await decrementTrialUse(); ... }`.
- **Panel Error Explainer** (`src/sidepanel/panel.js`): `const aiSuccess = data && data.success === true;` then `if (aiSuccess && !(await licenseValid())) { await decrementTrialUse(); ... }`.

---

## 5. Backward compatibility

- **New extension + old server:** Old server does not send `success`. Then `data.success` is `undefined`, so `data.success === true` is false. Explain Element: background sends `success: false` → no decrement. Error Explainer: no decrement. So with an old server, trial is **never** decremented (safe, no double-charge).
- **Old extension + new server:** New server sends `success`. Old panel ignores it for Error Explainer (would still decrement whenever `!result.error && !result.data.error`; new server also sets `result.data.error` on failure, so old panel would not decrement on AI failure for Error Explainer). Old panel for Explain Element only decrements on `message.success === true`; old background always sent `success: true` on 200, so old extension would still decrement on AI failure for Explain Element until the extension is updated.
- **Recommendation:** Deploy server first, then extension, so that once the extension is updated, both paths are correct everywhere.

---

## 6. Bugs found and fixed

| # | Feature         | Bug | Fix |
|---|-----------------|-----|-----|
| 1 | Explain Element | Background always sent `success: true` on any HTTP 200, so AI failures (e.g. "Error connecting to OpenAI") still decremented trial. | Server sends `success: true/false` for aiContext; background sets `message.success = data.success === true`. |
| 2 | Error Explainer | Panel only checked `result.error` and `result.data.error`. Server did not set `error` on AI failure (only `answer`), so AI failures still decremented trial. | Server sends `success: false` and `error` on AI failure; panel decrements only when `result.data.success === true`. |

Trial now decrements only on successful AI responses; server failures, network errors, and AI failures do not consume trial.
