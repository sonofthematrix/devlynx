# Server Offline Message System – Audit Report

**Constant:** `SERVER_OFFLINE_MSG`  
**Behaviour:** Offline copy is **`serverOfflineMsg()`** — local vs hosted (`api.devlynx.ai`), not a single static string.

---

## 1. Constant definition (all three files)

| File | Definition |
|------|------------|
| **panel.js** | `const SERVER_OFFLINE_MSG = 'DevLynx server not running. Start start-server-with-ai.bat in the feed-server folder.';` |
| **background.js** | `const SERVER_OFFLINE_MSG = 'DevLynx server not running. Start start-server-with-ai.bat in the feed-server folder.';` |
| **options.js** | `const SERVER_OFFLINE_MSG = 'DevLynx server not running. Start start-server-with-ai.bat in the feed-server folder.';` |

All three files define the constant with the same expected text.

---

## 2. Usage – panel.js

| Location | Use |
|----------|-----|
| loadProjects() – when result.error | `hint.textContent = SERVER_OFFLINE_MSG` (project list hint) |
| Explain Element – START_EXPLAIN_MODE error | `setStatus('explain-element-status', SERVER_OFFLINE_MSG, true)` |
| ELEMENT_EXPLAIN_RESULT – when success === false | `setStatus('explain-element-status', SERVER_OFFLINE_MSG, true)` |
| Generate Mod – on error | `setStatus('generate-mod-status', SERVER_OFFLINE_MSG, true)` |
| Error Explainer – result.error | `setStatus('error-explainer-status', SERVER_OFFLINE_MSG, true)` |
| Error Explainer – catch | `setStatus('error-explainer-status', SERVER_OFFLINE_MSG, true)` |
| Screenshot – when !serverOk | `setStatus('screenshot-status', SERVER_OFFLINE_MSG, true)` (fixed: was different text) |

All server-offline paths in the panel now use `SERVER_OFFLINE_MSG`.

---

## 3. Usage – background.js

| Location | Use |
|----------|-----|
| Explain Element – .catch() | `setLastError('Explain element (AI)', err.message \|\| SERVER_OFFLINE_MSG)` |
| Context menu (Ask AI / Code / Error) – catch | `setLastError(..., err.message \|\| SERVER_OFFLINE_MSG)` and stored answer `'Error: ' + (err.message \|\| SERVER_OFFLINE_MSG)` (fixed: was "Feed server not reachable. Start feed server on port 2847.") |

All server-offline paths in the background now use `SERVER_OFFLINE_MSG`.

---

## 4. Usage – options.js

| Location | Use |
|----------|-----|
| Verify button – fetch catch | `setStatus(SERVER_OFFLINE_MSG, 'error')` |

Options page uses the constant when the verify request fails (server offline).

---

## 5. UI when server is offline

- **Panel:** Project hint, status-bar badge (via setFeedServerStatus), and per-feature status lines (explain element, error explainer, generate mod, screenshot) show the same message when the server is unreachable or returns an error.
- **Panel disconnect-hint:** The paragraph `#disconnect-hint` is shown when not connected. Its text was updated to match the constant and adds: " Click status above to retry."
- **Background:** Last error (and stored AI result answer) use `SERVER_OFFLINE_MSG` so the panel or options can show the same text when they read the last error.
- **Options:** The status line shows `SERVER_OFFLINE_MSG` when verification fails due to server offline.

---

## 6. Fixes applied

| File | Before | After |
|------|--------|--------|
| background.js | Context menu catch used "Feed server not reachable. Start feed server on port 2847." | Uses `SERVER_OFFLINE_MSG` |
| panel.js | Screenshot status used "Server unavailable. Start feed server or check connection." | Uses `SERVER_OFFLINE_MSG` |
| panel.html | disconnect-hint: "Start the server: run **start-server-with-ai.bat**..." | "DevLynx server not running. Start start-server-with-ai.bat in the feed-server folder. Click status above to retry." |

---

## 7. Summary

| Check | Status |
|-------|--------|
| Same constant text in panel, background, options | Yes |
| Panel uses constant for all server-offline UI | Yes (after fixes) |
| Background uses constant for last error / answer | Yes (after fix) |
| Options uses constant on verify failure | Yes |
| Static disconnect-hint aligned with constant | Yes (after update) |

The server offline message is now consistent across panel.js, background.js, and options.js, and the UI shows the correct message when the server is offline.
