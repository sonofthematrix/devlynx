# Chrome Web Store – Description & Justification

Kopieer deze teksten naar het Chrome Web Store Developer Dashboard. **Actuele volledige blokken** staan ook in **[STORE-LISTING.md](STORE-LISTING.md)** (die file is leading voor copy-paste).

---

## Single purpose (korte beschrijving)

**English (for Chrome Web Store – use this):**

DevLynx AI is a single-purpose **developer tool**: it helps you **explain, debug, and modify** web pages you work on, with **AI-assisted** features (explain element, error help, Q&A, mods) and an **API tester**. **Free** includes core tools plus a **limited AI trial**; **Pro** (one-time **$35.99 USD**, lifetime updates) unlocks **unlimited** Pro AI features. Users add their **own OpenAI API key** (BYOK). The extension uses a **hosted DevLynx feed** for connectivity, licensing, and trial enforcement, and may contact **OpenAI** and **user-entered API tester URLs** as described in the privacy policy — we do not sell browsing history.

---

## Detailed description

Zie **[STORE-LISTING.md](STORE-LISTING.md) → "Detailed description"** (volledige blok).

---

## Permission justification

Zie **STORE-LISTING.md → "Permission justification"**.

**Why do we need each permission?**

• **tabs** – Active tab for Explain Element, screenshots, API context; open support/pricing in a new tab.  
• **activeTab** – One-shot access when the user invokes the extension.  
• **storage** – License key, plan (free/pro), trial count, preferences in `chrome.storage.local` only.  
• **downloads** – Save screenshots or exports to the user’s device.  
• **contextMenus** – “DevLynx AI” submenu (Explain element, Ask AI, etc.).  
• **scripting** – Selection text, explain-element overlay; no execution of remote or user-supplied code as arbitrary eval.  
• **sidePanel** – Chrome side panel UI (`side_panel` + default path in manifest).

---

## Korte samenvatting voor “Permission declaration” (1–2 zinnen)

DevLynx AI needs broad host access so features work on **any site** you debug (DOM, explain element, temporary mods), and so the **API tester** can reach **URLs you type in**. We do not harvest browsing history for ads. BYOK key stays **local in the browser**; the **hosted feed** handles license/trial as configured. See privacy policy for full data flows.

---

## Short description (~132 chars)

**Recommended (Explain & Debug):**  
`Explain UI & debug JS errors with AI. Modify pages, test APIs, dev assistant — BYOK OpenAI.`

---

## SEO keywords (in long description)

inspect element, DOM inspector, debug website, JavaScript errors, modify website, web debugging, frontend debugging, AI dev assistant, API testing, BYOK.

---

## Positioning snippet (for website/store FAQ)

Use this short block when asked "why not just ChatGPT/Cursor/DevTools?":

DevLynx AI is not a generic chat app. It is an in-browser developer workspace that combines page-aware AI help with real browser tooling in one side panel. You can capture real console errors, inspect live elements, test APIs, and apply fixes faster without switching between multiple tools.

What makes it different:

- Real browser context (live tab + page elements)
- Extension-native debugging context (MV3/CORS/content vs background)
- All-in-one workflow (capture -> explain -> generate -> test)
- BYOK privacy model (OpenAI key stored locally)
