# DevLynx AI Pro — Chrome Extension

## Project Overview
AI-powered web inspection, debugging, and modification tool built as a Chrome extension.

## Tech Stack
- **Runtime:** Manifest V3, vanilla JS, no framework
- **AI:** OpenAI API
- **Licensing:** Gumroad ($19 USD one-time, early adopter)
- **Storage:** Vercel Blob
- **Build:** Node.js (`scripts/build.js`) — obfuscation currently disabled (`SKIP_OBFUSCATE=true`)

## Key Files
| File | Role |
|------|------|
| `src/sidepanel/panel.js` | Main UI (side panel) |
| `src/content/content.js` | Page injection (isolated world) |
| `src/content/main-world-error-capture.js` | Error capture (MAIN world) |
| `src/content/error-capture-bridge.js` | Bridges MAIN→isolated world errors |
| `src/background.js` | Service worker |
| `src/options/options.js` | Options page |
| `scripts/build.js` | Build script (copies src/ → dist/) |

## Build
```
npm run build
```
Always rebuild after any `src/` change. Output goes to `dist/`.

## Rules

1. **Always rebuild after any `src/` change** — `npm run build`. The extension loads from `dist/`, not `src/`.

2. **Fix one problem at a time** — don't touch unrelated code while fixing a specific bug.

3. **Diagnose before fixing** — read the relevant file(s) first. Understand the current state before writing any changes.

4. **Never use `eval()` or inline `<script>` injection** — Stripe and other strict-CSP sites block both. There is no workaround; don't try.

5. **JS injection via `chrome.scripting.executeScript` with `func` + `args`** — never pass raw code strings. Background service worker handles this; content script sends `EXECUTE_MOD_JS` message to background.

6. **CSS injection via `chrome.scripting.insertCSS`** — always CSP-safe, works on every site including Stripe. Content script sends `APPLY_CSS_MOD` message to background.

7. **Content script → background: use `chrome.runtime.sendMessage`** — never `chrome.tabs.sendMessage` (that goes the other direction: background/panel → content script).

8. **If a fix fails twice, stop** — diagnose the root cause before attempting a third approach. Don't retry the same broken pattern.

## Known Limitations

- **Payment iframe errors cannot be captured** — errors from cross-origin iframes (Stripe, PayPal, etc.) are sandboxed by the browser. No MAIN-world hook (`onerror`, `addEventListener('error')`, `console.error`) in the parent frame can intercept them. This is a browser security boundary; do not attempt workarounds.
