# CURSOR-TASKS.md

Tasks for Cursor AI to implement. Work through them top to bottom.
Always edit `src/` only — never `dist/`. Rebuild with `npm run build:dev` to test.

---

## 1. Security fix — API key leak in console (options.js)

**File:** `src/options/options.js`
**Problem:** `console.warn` logs the first 800 chars of the API validation response, which may contain the raw API key or token.
**Fix:** Remove or replace any `console.warn` / `console.log` that outputs response body content. Keep error logging but never log response body text.

---

## 2. Fix hardcoded Extension ID (panel.js)

**File:** `src/sidepanel/panel.js`
**Problem:** `CHROME_WEB_STORE_EXTENSION_ID = 'REPLACE_WITH_EXTENSION_ID'` — the Chrome Web Store review link is broken.
**Fix:** Replace the placeholder with the real extension ID. Find it in `manifest.json` or the Chrome Web Store dashboard. If it's not known at build time, construct the review URL as `https://chromewebstore.google.com/detail/${chrome.runtime.id}` instead of hardcoding it.

---

## 3. Remove auto-verify on license key paste (panel.js)

**File:** `src/sidepanel/panel.js`
**Problem:** Pasting a license key triggers verification after 200ms without the user clicking "Verify". This is unexpected and can fire multiple times.
**Fix:** Remove the `paste` event listener that auto-triggers verify. Verification should only start on explicit button click. Also remove the 200ms `setTimeout` debounce around it.

---

## 4. Add cancel button to license verification (panel.js)

**File:** `src/sidepanel/panel.js`
**Problem:** License verification can take up to 45 seconds with no way to cancel. The panel is partially blocked during this time.
**Fix:**
- Add a "Cancel" button that appears while verification is in progress
- Use an `AbortController` for the verify fetch call
- On cancel: abort the request, reset `licenseVerifyInFlight = false`, restore the UI to its pre-verify state
- Hide the cancel button when verification completes or fails

---

## 5. Better error messages (panel.js + background.js)

**Files:** `src/sidepanel/panel.js`, `src/background.js`

**5a.** "No response from background" → replace with: `"Extension background process did not respond. Try reloading the extension."`

**5b.** Rate limit message → replace `"Rate limit exceeded. Please wait."` with `"Rate limit reached. Please wait 60 seconds before trying again."`

**5c.** License verify timeout → after 45s failure, show: `"Verification timed out. Check your internet connection and try again."`

**5d.** HS256 JWT silent failure → when `reason === 'hs256_not_supported_locally'`, show a visible error: `"License token format not supported. Please contact support."`

---

## 6. Fix silent errors in content script (content.js)

**File:** `src/content/content.js`
**Problem:** `APPLY_CSS_MOD` and `EXECUTE_MOD_JS` message sends use `.catch(() => {})` — errors are swallowed silently.
**Fix:** Replace `.catch(() => {})` with `.catch((err) => { console.error('[DevLynx] mod apply failed:', err); })` so failures are visible in DevTools. Do the same for any `chrome.storage.local.set` calls without callbacks.

---

## 7. Hint text for disabled API tester buttons (panel.js)

**File:** `src/sidepanel/panel.js`
**Problem:** "Gen code" and "Explain" buttons in the API tester are disabled on load with no indication why.
**Fix:** Add a `title` attribute or visible helper text: `"Send a request first to enable code generation"`. Show this hint near the buttons when they are in disabled state.

---

## 8. Reduce duplicate server-offline messaging (panel.js)

**File:** `src/sidepanel/panel.js`
**Problem:** The server offline state is communicated in 3+ places (status bar, disconnect hint, modal) with redundant and sometimes contradictory text.
**Fix:** Keep the status bar indicator as the single source of truth for connection state. Remove or consolidate the duplicate offline messages so the same message doesn't appear in multiple UI areas simultaneously.

---

## Done criteria

- `npm run build:dev` completes without errors
- Load `dist/` unpacked in Chrome — no console errors on open
- License verify: paste key → no auto-verify; click button → verify starts; cancel button visible and works
- API tester: disabled buttons show tooltip on hover
- No API key content in console output
