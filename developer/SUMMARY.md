# DevLens AI – Feature summary and key details

Use this for store listings, landing pages, or quick reference.

---

## Extension (browser)

- **Name:** DevLens AI  
- **Version:** see src/manifest.json (e.g. 1.1.1)  
- **Manifest:** V3  
- **UI:** Sidepanel (toolbar icon opens panel).  
- **Browsers:** Chrome, Edge, Opera, Brave (Chromium).

---

## Features

### 1. AI Assistant (panel)

| Feature | What it does |
|--------|----------------|
| **✨ AI Explain Element** | Explains the HTML/CSS/behavior of an element. **Trigger:** Right-click → DevLens AI → Explain element; or panel “Try it!” then left-click. Choose **Simple** (beginner) or **Technical** (layout, CSS, performance). Result in panel + in-page toast. |
| **Dev assistant** | Q&A about code, extensions, debugging. Textarea + “Ask AI” → answer in panel. |
| **Error explainer** | Paste error/stack trace (or “Get Errors” from page) → “Explain error” → AI explanation + fix. |
| **Last AI result** | Shows result of context-menu actions (Ask AI, Generate code, Explain error). |

### 2. Context menu (right-click)

| Item | When | Action |
|------|------|--------|
| **Explain element** | Right-click on page (any element) | Sends that element to AI; explanation in panel + toast. |
| **Ask AI** | After selecting text | Explains or fixes the selection. |
| **Generate request code** | After selecting a URL | Generates Fetch / Axios / Python request code. |
| **Explain error** | After selecting error text | Explains error and suggests fix. |

### 3. Page tools (panel)

| Feature | What it does |
|--------|----------------|
| **AI Mod Generator** | Describe change in text → AI returns CSS/JS → injects into current tab. “Reset Site” removes mods and reloads. |
| **Screenshot** | Captures visible tab. With server: saves to `feed-server/screenshots/`, copies folder path to clipboard. Without server: saves to Downloads, opens Downloads folder. |
| **API Tester** (slide-over) | Enter URL, method (GET/POST/etc.) → “CALL” → response in panel. “Gen Code” / “Explain” use AI on that response. |

### 4. Debug / reliability

- **Connection status:** Badge “Connected” / “Disconnected” (click to retry).  
- **Last error block:** Shows last failure (from background or panel); dismissible.  
- **Background:** All failure paths call `setLastError(feature, message)` → stored in `devlens_last_error`, logged in service worker console.  
- **Panel:** Every `setStatus(..., true)` also saves that error and shows it in “Debug / Last error”.

---

## Feed server (local)

- **Port:** 2847 (default; overridable via `feed-server/.env` → `PORT=`).  
- **Role:** Receives extension requests (screenshots, AI). Sends AI requests to OpenAI using your key.  
- **Start:**  
  - No AI: `node server-with-ai.js` or `start-server-with-ai.bat`.  
  - With AI: set `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `feed-server/.env`, then `node server-with-ai.js` or `START-SERVER-WITH-AI.bat`.  
- **Endpoints:**  
  - `GET /projects` – list workspaces (extension uses for “Connected” check).  
  - `GET /extensions` – list extensions.  
  - `POST /` – body types: `screenshot`, `devQuestion`, `aiContext` (ask, explainError, generateRequestCode, explainEndpoint, explainElement), `generateMod`, `quickPrompt`, `addCommand`.  
- **Config (.env):** `OPENAI_API_KEY`, `OPENAI_MODEL` (default `gpt-4o-mini`), `PORT`.

---

## Technical details

- **Permissions:** tabs, activeTab, storage, downloads, contextMenus, scripting; host_permissions &lt;all_urls&gt;, http(s).  
- **Content script:** Injected on http(s) pages (excluding Opera start/newtab/addons). Handles: explain mode (click/toast), inspect mode (toolbar), mod injection, console error capture, `EXPLAIN_LAST_RIGHT_CLICKED_ELEMENT`, `SHOW_EXPLAIN_RESULT`.  
- **Background:** Service worker; handles API_REQUEST, CAPTURE_VISIBLE_TAB, MOD_TO_TAB, INJECT_MOD, INJECT_PRESET, GET_SELECTION, ELEMENT_EXPLAIN_DATA; context menu clicks; debug `setLastError`.  
- **Project:** Single codebase; extensie in **src/**, build → **dist/** en **release/devlens-extension.zip**.

---

## Build & release

- **Build:** `npm run build` → leest **src/**, schrijft **dist/** (obfuscated).  
- **Package:** `npm run release` → build + zip → **release/devlens-extension.zip** (dit upload je naar de store).  
- **Store copy:** Teksten in **developer/STORE-LISTING.md**; checklist in **developer/PUBLISHING.md**.  
- **Privacy:** No telemetry; AI uses user’s key and local server only; screenshots only on user’s machine.

---

## File overview

| Area | Main files |
|------|------------|
| Extension source | **src/**: manifest.json, background.js, sidepanel/, content/, options/, icons/ |
| Extension build | **dist/** (output); **release/devlens-extension.zip** (store upload) |
| Server | feed-server/server-with-ai.js, feed-server/.env.example, start-server-with-ai.bat |
| Docs | README.md, PROJECT-STRUCTURE.md, developer/STORE-LISTING.md, developer/PUBLISHING.md, developer/SUMMARY.md |
| Scripts | scripts/build.js, scripts/package.js; npm run build / release |
