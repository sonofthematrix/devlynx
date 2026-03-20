# Server Connection Logic – Audit Report

**Expected flow:** Extension loads → GET /projects → if success set server connected → GET /health → update UI from `apiKeyConfigured`.

---

## 1. Flow verification

### Sequence (panel.js)

1. **Extension / panel loads**  
   `DOMContentLoaded` runs `loadProjects().catch(() => {})` (and later `applyPlanUI`, `updateTrialUI`).

2. **GET /projects**  
   `loadProjects()` calls `result = await apiGet(projectsUrl)` where `projectsUrl = http://localhost:2847/projects`.

3. **If success → server connected**  
   - If `result` is missing or `result.error` is set: `serverConnected = false`, hint set to `SERVER_OFFLINE_MSG`, `updateStatusBar()`, return.  
   - Otherwise: `serverConnected = true`, then continues.

4. **Then GET /health**  
   Only after projects success, `healthRes = await apiGet(healthUrl)` with `healthUrl = http://localhost:2847/health`.

5. **Health response**  
   `serverApiKeyConfigured = !!(healthRes && healthRes.data && healthRes.data.apiKeyConfigured)`.  
   If `/health` throws or returns invalid data, the catch now sets `serverApiKeyConfigured = false` and `statusMessage = 'Connected · No OpenAI key'` so the UI does not show "OpenAI: Ready" when health is unknown.

**Verdict:** Flow matches the intended order: projects first, then health only when projects succeeded.

---

## 2. Server responses

### GET /projects (feed-server)

Returns `{ ok: true, projects: [...] }`. Extension treats any non-error response with data as success and sets `serverConnected = true`.

### GET /health (feed-server)

Returns:

```json
{
  "ok": true,
  "connected": true,
  "service": "devlens-feed",
  "version": "1.1.1",
  "serverVersion": "1.1.1",
  "ai": true | false,
  "apiKeyConfigured": true | false,
  "model": "gpt-4o-mini",
  "licenseCheck": true | false
}
```

Extension uses only `healthRes.data.apiKeyConfigured` (boolean). So the expected shape `{ apiKeyConfigured: true | false }` is satisfied (nested under `data` because the background returns `{ ok, status, data }` with the parsed body in `data`).

---

## 3. UI behavior

| Condition | Badge (feed-server-status) | Status bar: Server | Status bar: OpenAI |
|-----------|----------------------------|--------------------|--------------------|
| Projects fail / error | Disconnected | ● DevLynx Server: Disconnected | ● OpenAI: — |
| Projects ok, health ok, apiKeyConfigured true | Connected | ● DevLynx Server: Connected | ● OpenAI: Ready |
| Projects ok, health ok, apiKeyConfigured false | Connected · No OpenAI key | ● DevLynx Server: Connected | ● OpenAI: Not configured |
| Projects ok, health fails (catch) | Connected · No OpenAI key | ● DevLynx Server: Connected | ● OpenAI: Not configured |

- **apiKeyConfigured true** → status bar shows **"● OpenAI: Ready"** (and badge "Connected").  
- **apiKeyConfigured false** (or health failed) → status bar shows **"● OpenAI: Not configured"**, badge **"Connected · No OpenAI key"**.

**Plan** (status bar) is updated asynchronously in `updateStatusBar()` via `getPlan()` / `getTrialUsesRemaining()`: **"● Plan: Pro"** or **"● Plan: Free (X trial uses)"** / **"● Plan: Free (trial ended)"**.

---

## 4. Race conditions and UI bugs

### 4.1 Concurrent `loadProjects()`

Multiple calls can run at once (e.g. initial load, 800 ms retry, visibility retry, 5 s interval). Each call sets `serverConnected` and `serverApiKeyConfigured` when it finishes. The last completion wins, so:

- If an earlier call succeeds and a later one fails (e.g. transient network issue), the UI can flip to Disconnected.
- If an earlier call fails and a later one succeeds, the UI correctly ends up Connected.

**Recommendation (optional):** Use a sequence number or “load id” and only apply state when the response belongs to the latest started load, to avoid a late failure overwriting an earlier success.

### 4.2 Health request fails (fixed)

**Before:** If `apiGet(healthUrl)` threw (network error, parse error), the catch was empty. `serverApiKeyConfigured` stayed at its initial value `true`, so the UI could show **"● OpenAI: Ready"** even when health was never successfully read.

**After:** In the catch we set `serverApiKeyConfigured = false`, `statusMessage = 'Connected · No OpenAI key'`, and the hint text so the UI shows **"● OpenAI: Not configured"** and the badge/hint reflect “No OpenAI key” when health cannot be determined.

### 4.3 Plan segment in status bar is async

`updateStatusBar()` sets server and OpenAI text synchronously, but plan text is set inside `getPlan().then(...)` and `getTrialUsesRemaining().then(...)`. So the plan line can update slightly after the rest. Multiple rapid `updateStatusBar()` calls can reorder these async updates. This is a minor visual quirk, not a logic error.

### 4.4 Initial state

- `serverConnected = false`, `serverApiKeyConfigured = true` at load.  
- When disconnected, the status bar shows **"● OpenAI: —"** because of the `if (!serverConnected)` branch, so the initial “true” for API key does not show “Ready” until the server is connected. Correct.

---

## 5. Where connection is triggered

- **On panel load:** `loadProjects().catch(() => {})`.  
- **800 ms later if still disconnected:** `setTimeout(..., 800)` calls `loadProjects()` again if `!serverConnected`.  
- **When panel becomes visible again:** `visibilitychange` calls `loadProjects()` if `!serverConnected`.  
- **Every 5 s while disconnected:** `setInterval` calls `loadProjects()` when `!serverConnected`.  
- **User click:** Status bar “DevLynx Server” and feed-server-status badge trigger `retryConnection()` → `loadProjects()`.

---

## 6. Summary

| Check | Status |
|-------|--------|
| Flow: load → GET /projects → then GET /health | OK |
| Server response: `apiKeyConfigured` in /health | OK |
| apiKeyConfigured true → OpenAI: Ready | OK |
| apiKeyConfigured false → Connected · No OpenAI key + Not configured | OK |
| Status bar: Server / OpenAI / Plan | OK |
| Health failure no longer shows “OpenAI: Ready” | Fixed (catch sets `serverApiKeyConfigured = false`) |
| Race: concurrent loadProjects() | Documented; optional “latest load only” improvement |

No remaining logic bugs found; the only improvement identified is optional handling of concurrent `loadProjects()` so a late failure does not override an earlier success.
