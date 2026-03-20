# Chrome Web Store – Description & Justification

Kopieer deze teksten naar het Chrome Web Store Developer Dashboard waar de extension wordt ingediend.

---

## Single purpose (korte beschrijving)

**Nederlands (concept):**  
DevLynx AI heeft één doel: developers helpen met AI op elke website. De extensie biedt een AI-developerassistent (vragen, code, uitleg), API-tester, screenshot, en op Pro-niveau: “Explain Element” en “Error Explainer”. Alle AI- en licentiechecks lopen via een lokaal draaiende server die de gebruiker zelf start; de extensie stuurt geen data naar onze servers behalve bij licentieverificatie (Gumroad).

**English (for Chrome Web Store – use this):**

**Single purpose:**  
DevLynx AI is a single-purpose developer tool: it helps developers use AI on any website. The extension provides an AI developer assistant (Q&A, code, explanations), API tester, and screenshots. Pro features include “Explain Element” (click any element for AI explanation) and “Error Explainer” (paste or capture errors for AI analysis). All AI and license checks run through a local server that the user runs on their machine; the extension does not send user data to our servers except for license verification (Gumroad) when the user has purchased Pro.

---

## Detailed description (SEO – plak in Chrome Web Store listing, “Description” veld)

**Titel in dashboard (mag langer dan manifest):**  
DevLynx AI – Inspect, Debug & Modify Any Website with AI

**Lange beschrijving (zoekwoorden: inspect element, web debugging, developer tools, modify website, AI dev assistant, frontend debugging, DOM inspector):**

DevLynx AI is an **AI-powered developer toolkit** that lets you **inspect**, **modify** and **debug** any website directly in your browser.

**Keywords developers search for:** inspect element, **web debugging**, **developer tools**, **modify website**, **AI dev assistant**, **frontend debugging**, **DOM inspector**, API testing, live page tweaks.

**Features**
• **AI Explain Element** – click any element for a clear explanation (like a smart **DOM inspector** with AI).  
• **Error Explainer** – paste or capture errors for AI-powered **frontend debugging** fixes.  
• **AI Dev Assistant** – ask coding and debugging questions.  
• **API Tester** – send HTTP requests without CORS hassle.  
• **Live modification** – presets and custom CSS to **modify website** appearance and behavior.  
• Screenshot to your local dev server.

**Free vs Pro**  
Free: inspect/DOM tools, API tester, screenshot, site mods, context menu — plus a **shared AI trial** (e.g. 20 uses) for Dev assistant, AI Mod Generator, API tester AI helpers, Explain Element, and Error Explainer.  
Pro: **unlimited** AI for all of the above; one-time purchase · lifetime updates (Gumroad).

**Setup**  
Runs with a small **local feed server** (Node.js) and your **OpenAI API key** — see README in the package. License verification optional via Gumroad for Pro.

**Context menu:** Explain element, Ask AI, Generate request code, Explain error.

**Privacy**  
DevLynx AI runs locally and sends AI requests only to a **local server** controlled by the user (`http://localhost:2847`). We do not run a remote AI backend or harvest browsing data. Pro license verification may contact Gumroad when the user has purchased Pro.

---

## Korte manifest-beschrijving (al in manifest.json)

De `description` in `manifest.json` is beperkt in lengte en bevat kernkeywords voor store-zoekresultaten.

---

## Permission justification (verplicht voor reviewers)

Vul in het dashboard in bij “Permission justification” (of het tekstveld waar om uitleg wordt gevraagd voor permissions):

---

**Why does DevLynx AI need access to all websites (“Host permission: `<all_urls>`” / overbroad permissions)?**

DevLynx AI is a **developer tool** that inspects and modifies the **DOM of pages the developer is working on**. The extension needs access to all URLs because developers **debug and analyze any website they visit** (their own sites, staging, client projects, documentation, etc.).

Host access is used to:

• **Inspect** page elements and **analyze DOM structure**  
• **Inject** in-page developer UI (e.g. explain-element mode, selections)  
• **Apply temporary CSS/JS modifications** the user requests (mods / AI Mod Generator)  
• **API tester** – send HTTP requests to **any URL the user explicitly enters** (their API or third-party endpoints)

**Data flow:** No browsing data is collected or sent to **our** remote servers. AI and debugging context go to the user’s **local feed server** (`http://localhost:2847`) when they run it, plus the **user-entered API tester URL**. Optional **Gumroad** calls only for Pro license verification. This addresses reviewer questions about remote data collection.

---

**Why do we need each permission?**

• **tabs** – To open the upgrade/pricing page in a new tab, to get the active tab for “Explain Element”, screenshots, and API tester context.  
• **activeTab** – To access the current tab when the user invokes the extension (e.g. click icon, use context menu) for reading selection and injecting the explain-element UI.  
• **storage** – To store the user’s license key, plan (free/pro), trial usage count, and preferences locally; no sync to our servers.  
• **downloads** – To let the user save screenshots (e.g. from the panel) to their device.  
• **contextMenus** – To show the right-click menu (“DevLynx AI” → Explain element, Ask AI, Generate request code, Explain error).  
• **scripting** – To run a small script in the active tab to get the selected text (e.g. for “Ask AI”, “Explain error”) and to inject the explain-element overlay; we do not execute remote or user-supplied code.

---

## Korte samenvatting voor “Permission declaration” (1–2 zinnen)

DevLynx AI needs broad host access so developer features work on **any site** the user builds or debugs (DOM inspect, explain element, temporary mods), and so the **API tester** can call **user-entered URLs**. AI traffic goes to the user’s **localhost** server, not our servers; no browsing data harvesting. Pro users: optional Gumroad license check only.

---

## Short description (keywords – paste in store “Short description”, ~132 chars)

**Recommended:**  
`AI developer tools to inspect elements, debug JavaScript errors and modify any website.`

**SEO keywords to weave into long description:** inspect element, DOM inspector, debug website, JavaScript errors, modify website, web debugging, frontend debugging, AI dev assistant.
