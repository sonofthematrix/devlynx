# DevLynx AI – User guide

## Why you need the local server

DevLynx AI uses a **small program on your PC** (the **feed server**) for AI requests, screenshots, and license checks. The Chrome extension connects to **`http://localhost:2847`**.  
Without the server running, the extension shows “server not connected” and AI features will not work.

**Plans:** **Free** includes core tools (inspect, API tester, site mods) plus a **shared trial of AI uses** (e.g. Dev assistant, AI Mod Generator, Explain Element, Error Explainer). **Pro** unlocks **unlimited** AI via a license key in Options.

## 1. Get the feed server

Download the **`feed-server`** folder from the same place you got DevLynx AI (e.g. GitHub releases, Gumroad download, or the project ZIP).  
The extension package from the Chrome Web Store **does not** include this folder—you need it separately.

## 2. Install Node.js

Install **Node.js 18 or newer**: https://nodejs.org  
(LTS version is fine.)

## 3. Configure OpenAI

1. Open the **`feed-server`** folder.
2. Copy **`.env.example`** to **`.env`** (if `.env` does not exist yet).
3. Edit **`.env`** and set your key:
   ```env
   OPENAI_API_KEY=sk-proj-your-key-here
   ```
   Create a key at: https://platform.openai.com/account/api-keys  
   Use **one line**, no spaces around `=`, no quotes.

## 4. Start the server

| OS | What to do |
|----|------------|
| **Local server** | In **`feed-server`**: `npm install`, then **`npm start`**. |
| **macOS / Linux** | Open Terminal, `cd` into `feed-server`, run: `node server-with-ai.js` |

**Leave the terminal window open** while you use the extension.

You should see something like:

```text
OpenAI key loaded: YES
DevLynx AI feed server http://127.0.0.1:2847
```

## 5. Pro license (optional)

If you bought **DevLynx AI Pro**, open the extension → **Options** (right-click the extension icon) → paste your **license key** → **Verify with server** (the feed server must be running).

## Troubleshooting

- **Port 2847 already in use** – Close the other program using that port, or set `PORT=2848` in `.env` (you would need to change the extension’s port too; default is 2847).
- **Incorrect API key** – Fix `.env`, save, restart the server.
- **OpenAI key loaded: NO** – Check that `.env` is in the `feed-server` folder and contains `OPENAI_API_KEY=...`.

## Test the server

In your browser open: **http://127.0.0.1:2847/health**  
You should get JSON with `"ok": true`.  
For an OpenAI test: **http://127.0.0.1:2847/test-openai**

---

## Developers: Load unpacked

To load this folder as an unpacked extension in Chrome/Edge: **Extensions** → **Developer mode** → **Load unpacked** → select the folder that contains **`manifest.json`** (this folder after build: use **`dist`**, or **`src`** during development).
