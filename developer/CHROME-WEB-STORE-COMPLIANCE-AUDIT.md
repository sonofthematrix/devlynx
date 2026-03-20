# Chrome Web Store Compliance Audit – DevLynx AI

**Extension:** DevLynx AI  
**Manifest version:** 3  
**Extension version (manifest):** 1.1.1  

---

## 1. Manifest verification

| Item | Value | Notes |
|------|--------|--------|
| **manifest_version** | 3 | MV3 required for new extensions. |
| **version** | 1.1.1 | Present and semantic. |
| **permissions** | `tabs`, `activeTab`, `storage`, `downloads`, `contextMenus`, `scripting` | All used; see §2. |
| **host_permissions** | `<all_urls>`, `https://*/*`, `http://*/*`, `http://127.0.0.1:2847/*`, `http://localhost:2847/*` | Broad; see §2. |
| **content_security_policy** | Not declared | MV3 default applies: `script-src 'self'; object-src 'self'`. No `unsafe-eval` or remote scripts. |

---

## 2. Rejection risk assessment

### Remote code execution – **LOW RISK**

- No `eval()`, `new Function()`, or string-based `setTimeout`/`setInterval` in extension code.
- `chrome.scripting.executeScript` is used with **inline function** only: `func: () => window.getSelection().toString()` (background.js). No user or server-supplied code is executed.
- No dynamic script injection from remote URLs.

**Verdict:** Compliant; no remote code execution.

---

### Unsafe eval usage – **NO RISK**

- Grep for `eval(`, `new Function(`, and string forms of `setTimeout`/`setInterval` found no matches in `src/`.

**Verdict:** Compliant.

---

### External script loading – **NO RISK**

- All script tags in extension pages use **relative paths**: `panel.js`, `options.js` (no `https://` or CDN).
- No `importScripts()` in the service worker.
- No runtime loading of external JS.

**Verdict:** Compliant.

---

### Permissions justification – **MEDIUM RISK (store listing)**

- **tabs** – Used for `chrome.tabs.create` (upgrade URL), tab context for API requests, and screenshot/explain flows.
- **activeTab** – Used for one-off access to the current tab (e.g. API tester, explain element).
- **storage** – Used for license key, plan, trial count, preferences (`chrome.storage.local`).
- **downloads** – Used if the extension offers download of responses or screenshots.
- **contextMenus** – Used for “Explain element”, “Ask AI”, “Explain error”, etc.
- **scripting** – Used for `executeScript` (e.g. get selection, inject UI) and possibly `insertCSS`.

The Chrome Web Store **does not** read a justification from the manifest; justification is entered in the developer dashboard. If the listing does not clearly explain why **host_permissions** and each permission are needed, reviewers may request changes or reject.

**Risk:** Rejection or “narrow permissions” request if justification is missing or vague, especially for `<all_urls>`.

---

### Overly broad permissions – **MEDIUM RISK**

- **host_permissions:**  
  - `"<all_urls>"`, `"https://*/*"`, `"http://*/*"` – allow the extension to call **any** URL (needed for the “API tester” feature that lets users send requests to arbitrary endpoints).  
  - `http://127.0.0.1:2847/*` and `http://localhost:2847/*` – local DevLynx server.

**Risk:** Broad host access is a common rejection cause. Mitigation: in the **single purpose** and **permission justification** sections of the store listing, state clearly that:

- The extension is a developer tool.
- `<all_urls>` / `https://*/*` / `http://*/*` are required so users can test any API URL from the “API tester” feature; the extension does not send data to the developer’s servers except to the user’s local server (localhost:2847) and the user-chosen API URL.

**Recommendation:** Consider narrowing to only the origins you truly need (e.g. localhost + optional fixed API domains) if you can restrict “API tester” to a fixed list or user-configured origins. If the product must support “any URL” for API testing, keep the permission and justify it explicitly.

---

### CSP violations – **NO RISK**

- No `content_security_policy` in manifest → MV3 default: `script-src 'self'; object-src 'self'`.
- No inline scripts in HTML (scripts loaded via `<script src="panel.js">` etc.).
- No `'unsafe-inline'` or `'unsafe-eval'` required.

**Verdict:** Compliant.

---

### Background service worker – **LOW RISK**

- Single service worker: `background.js`.
- No remote scripts or `importScripts` of external URLs.
- Uses standard APIs: `chrome.runtime`, `chrome.tabs`, `chrome.storage`, `chrome.contextMenus`, `chrome.scripting`, fetch.
- No long-running timers or persistent connections that would violate “service worker should be idle when not in use”; fetch and message handlers are event-driven.

**Verdict:** No issues identified.

---

### Insecure localhost communication – **LOW RISK**

- Local server URLs are fixed: `http://localhost:2847` and `http://127.0.0.1:2847` (license, projects, health, AI).
- No user-supplied localhost port or path used for sensitive operations without validation.
- Traffic is HTTP to localhost only (user’s own machine); no TLS required for loopback. Store policy typically allows localhost for developer tools.

**Verdict:** Acceptable; document in listing that the extension talks to a local server on port 2847.

---

## 3. Additional checks

| Check | Result |
|------|--------|
| **innerHTML with user/server data** | Panel: project/extension names from local server; AI answers passed through `escapeHtml` / `markdownToHtml` (escape then replace). Content script: user text escaped with `replace(/</g,'&lt;')` before use in HTML. No raw unsanitized injection found. |
| **Sensitive data in code** | No API keys or secrets in repo; server URL is localhost. |
| **Optional permissions** | None declared; all permissions are required. Consider moving non-critical host access to optional if the product allows. |

---

## 4. Possible rejection risks (summary)

| # | Risk | Severity | Mitigation |
|---|------|----------|------------|
| 1 | **Broad host_permissions** (`<all_urls>`, `https://*/*`, `http://*/*`) without clear justification in store listing | Medium | Add a clear “Permission justification” and “Single purpose” description: developer tool; API tester needs to call user-specified URLs; no data sent to developer. |
| 2 | **Missing or weak permission justification** in developer dashboard | Medium | In CWS dashboard, justify each permission (tabs, activeTab, storage, downloads, contextMenus, scripting) and host access in plain language. |
| 3 | **Single purpose** not clearly stated | Low | Describe the extension as a single-purpose developer assistant (AI help, API testing, screenshots, local server) so reviewers see why broad host access is needed. |

No high-severity technical issues (no remote code, no eval, no external scripts, CSP compliant, service worker and localhost use are acceptable).

---

## 5. Recommended changes

1. **Store listing (required for approval)**  
   - In the Chrome Web Store developer dashboard, fill **Permission justification** and **Single purpose** explicitly.  
   - State that host access to all URLs is used only for the “API tester” feature so users can test any API endpoint; no data is sent to the developer’s servers.  
   - Mention that the extension communicates with a local server (localhost:2847) for AI and license checks.

2. **Optional: narrow host_permissions**  
   - If the product roadmap allows, restrict to e.g. `http://localhost:2847/*`, `http://127.0.0.1:2847/*`, and a fixed set of API demo URLs, and add optional_permissions for “access on specific sites” so users can grant broader access only when using API tester.  
   - If you must support “any URL” for API testing, keep current permissions and rely on strong justification.

3. **Optional: explicit CSP**  
   - Add to manifest for clarity (same as default):  
     `"content_security_policy": { "extension_pages": "script-src 'self'; object-src 'self'" }`.  
   - Not required for compliance but makes policy explicit for reviewers.

4. **Privacy / data handling**  
   - If not already present, add a short privacy notice (store description or dedicated page) stating: no analytics or tracking; license check and AI go to user’s local server and/or user-chosen API URL; optional Gumroad for license verification.

---

## 6. Compliance score: **82 / 100**

| Category | Score | Notes |
|----------|-------|--------|
| **Code safety** (no remote code, no eval, no external scripts) | 25/25 | No violations found. |
| **CSP & scripts** | 15/15 | Default MV3 CSP; no inline/eval. |
| **Service worker** | 15/15 | Single local script; event-driven. |
| **Permissions & justification** | 12/20 | Permissions are used and reasonable; broad host access needs clear store listing justification to avoid rejection. |
| **Localhost & security** | 15/15 | Fixed localhost:2847; no sensitive data in code. |

**Summary:** The extension is technically compliant (no remote code, no eval, no external scripts, CSP ok, service worker and localhost use are fine). The main store risk is **overly broad host_permissions** and **missing or weak permission/single-purpose justification** in the Chrome Web Store listing. Addressing the recommended store listing text and, if possible, narrowing or clearly justifying host permissions should significantly reduce rejection risk.
