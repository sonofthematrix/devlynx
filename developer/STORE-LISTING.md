# DevLynx AI – Store listing (Chrome Web Store / Edge Add-ons)

Copy the text below into the store submission form. Replace the support URL with your GitHub repo or landing page.

---

## Launch checklist (voor upload)

1. **Build + ZIP:** vanaf projectroot: `npm run store-ready`  
   → levert `release/devlynx-ai-chrome-store.zip` en vult `store-ready/` (alleen extensie).

2. **ZIP-inhoud:** mag **alleen** extensiebestanden bevatten, o.a.  
   `manifest.json`, `icons/`, `background.js`, `content/`, `sidepanel/`, `options/`, `README.md`  
   **niet:** `node_modules/`, `feed-server/`, `.env`, `developer/`, `src/` (het script pakt alleen `dist/` → `store-ready`).

3. **Manifest:** geen Opera-specifieke keys (bijv. **`minimum_opera_version`**) — Chrome Web Store geeft anders *Unrecognized manifest key*.

4. **Rate prompt (handtest):** na **10 geslaagde AI-responses** moet de banner zichtbaar zijn: **“⭐ Rate DevLynx AI on Chrome Web Store”**.  
   - Storage: `devlynx_successful_ai_uses` (teller), `devlynx_chrome_store_rate_dismissed` (na “Maybe later” verborgen).  
   - Code: `RATE_PROMPT_THRESHOLD = 10` in `src/sidepanel/panel.js`; contextmenu-success telt ook mee via `background.js`.

5. **Pro (handtest):** feed-server aan → **Options** → **Verify with server** (localhost: lege key = developer bypass, of echte key). Side panel sluiten/heropenen of herladen. In DevTools op het panel-document: `<body class="… plan-pro">`; elementen met **`data-upgrade-link`** (upgrade-box) moeten verborgen zijn.

6. **Permissions / privacy (review):** vul **Permission justification** in (zie sectie hieronder) zodat `<all_urls>` niet als “overbroad” wordt afgewezen; zet de **privacy**-zin in je lange beschrijving.

---

## Store hook (zet dit bovenaan je Detailed description)

**Aanbevolen opening (2 zinnen):**

1. **Inspect, debug and modify any website with AI.**  
2. **Fix JavaScript errors instantly and understand complex DOM structures in seconds.**

*Extra hook (kort):* **Fix JavaScript errors instantly with AI.** — werkt goed in korte beschrijving of als derde regel.

Deze zinnen matchen hoe developers zoeken (errors, DOM, debug).

**Review (indicatief):** na upload vaak automatische scan (minuten), daarna handmatige review (vaak 1–3 dagen), daarna publicatie.

---

## Permissions justification (tegen “Overbroad permissions” / `<all_urls>`)

Plak in het Chrome Web Store-dashboard bij **Permission justification** (of het veld waar reviewers om uitleg vragen). Volledige uitgebreide versie + per-permission uitleg staat ook in **`developer/CHROME-WEB-STORE-DESCRIPTION.md`**.

**Engels (copy-paste):**

DevLynx AI is a developer tool that inspects and modifies the DOM of the current page.

The extension needs access to all URLs because it allows developers to debug and analyze any website they visit.

Host access is only used to:

• inspect page elements  
• analyze DOM structure  
• inject developer tools for debugging  
• apply temporary CSS/JS modifications requested by the user  
• run the API tester against URLs the user explicitly enters  

No browsing data is collected or transmitted to external servers except when the user explicitly sends a request to the local AI server (localhost), or when a Pro user triggers license verification (Gumroad).

**Privacy (1 zin – ook in Detailed description zetten):**  
*Privacy: DevLynx AI runs locally and sends AI requests only to a local server controlled by the user.*

---

## Titel

**DevLens AI – Developer Assistant for Any Website**

*Alternatief (meer klikbaar):* **DevLens AI – Explain & Debug Any Website**

---

## Short description (max ±132 tekens)

**Aanbevolen (keywords voor review + SEO):**  
`AI developer tools to inspect elements, debug JavaScript errors and modify any website.`

**Andere suggesties:**  
`Fix JavaScript errors instantly with AI. Explain elements, API tester, mod tools & dev assistant.`  
`Fix JS errors with AI. Inspect, explain elements, test APIs, debug any page.`

**Zoektermen om in de lange beschrijving te verwerken:** inspect element, DOM inspector, debug website, JavaScript errors, modify website.

*(Chrome Web Store: vaak ~132 tekens max — tel even na in het formulier.)*

---

## Volledige beschrijving (Detailed description)

**Fix JavaScript errors instantly with AI.**

**DevLynx AI – Understand and Debug Any Website Instantly**

**Privacy:** DevLynx AI runs locally and sends AI requests only to a local server controlled by the user.

DevLynx AI is a powerful developer assistant that helps you analyze, understand, and modify any website directly in your browser.

Whether you're inspecting UI components, debugging JavaScript errors, or experimenting with APIs, DevLens gives you AI-powered insights instantly.

**Key Features**

🔍 **AI Explain Element**  
Click any element on a webpage and instantly get an explanation of:
- what the element does
- its role in the page layout
- how it affects the user interface
- useful development insights

Perfect for learning, reverse‑engineering UI components, and understanding complex websites.

🐞 **Error Explainer**  
Paste a console error or capture errors from the page and let DevLens explain:
- what the error means
- why it happens
- how to fix it

Great for debugging faster.

🤖 **Developer AI Assistant**  
Ask DevLens development questions directly inside the browser:
- JavaScript
- CSS
- browser APIs
- debugging help
- extension development

🧪 **API Tester**  
Quickly test API endpoints without leaving the page.
- GET / POST / PUT / DELETE requests
- instant responses
- quick debugging

🎨 **AI Mod Generator**  
Describe a visual change and DevLens generates CSS or JavaScript modifications for the current page.  
*Example:* "Make this button bigger and blue" — DevLens generates the code instantly.

📸 **Screenshot Tool**  
Capture screenshots of the current page directly from the DevLens panel.

**Built for Developers**  
DevLens is designed for:
- frontend developers
- web developers
- extension developers
- UI engineers
- people learning web development

**Privacy**  
DevLens does not collect telemetry or user data.  
AI requests are processed through your own local server and API key.

**Version**  
DevLens v1.1.1

---

## Category

**Developer Tools** (or **Productivity**)

---

## Screenshot ideeën (heel belangrijk)

Maak 4 screenshots (aanbevolen **1280×800**):

1️⃣ **Explain Element** actief op een website  
2️⃣ **Error Explainer** met console error  
3️⃣ **API Tester** – request + response  
4️⃣ **DevLens sidepanel** – overview

---

## Keywords (vindbaarheid)

Gebruik woorden zoals:
- developer tools
- debugging
- AI developer
- inspect element
- web development
- frontend debugging
- API testing

---

## Support URL

Use your GitHub repo (e.g. `https://github.com/your-org/devlens-saas`) or a landing page. Required for store listing.

---

## Single sentence for promo / social

DevLens AI: right-click any element or selection on a page and get instant AI explanations, code generation, and error help—using your own OpenAI key and a local server.
