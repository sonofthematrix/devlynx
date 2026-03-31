# DevLynx AI – Store listing (Chrome Web Store / Edge Add-ons)

Copy the text below into the store submission form. Vervang **`[PRIVACY_URL]`** en **`[SUPPORT_URL]`** door echte HTTPS-URL’s.

---

## Launch checklist (voor upload)

**Beknopt (NL, afvinken):** [STORE-READY-CHECKLIST-NL.md](STORE-READY-CHECKLIST-NL.md)

1. **Build + ZIP:** vanaf projectroot: `npm run store-ready` **of** `npm run release` → zie checklist voor zip-namen  
   → levert `release/devlynx-ai-chrome-store.zip` en vult `store-ready/` (alleen extensie).

2. **ZIP-inhoud:** mag **alleen** extensiebestanden bevatten, o.a.  
   `manifest.json`, `icons/`, `background.js`, `content/`, `sidepanel/`, `options/`, `README.md`  
   **niet:** `node_modules/`, `feed-server/`, `.env`, `developer/`, `src/` (het script pakt alleen `dist/` → `store-ready`).

3. **Manifest:** geen Opera-specifieke keys (bijv. **`minimum_opera_version`**) — Chrome Web Store geeft anders *Unrecognized manifest key*.

4. **Rate prompt (handtest):** na **10 geslaagde AI-responses** moet de banner zichtbaar zijn: **“⭐ Rate DevLynx AI on Chrome Web Store”**.  
   - Storage: `devlynx_successful_ai_uses` (teller), `devlynx_chrome_store_rate_dismissed` (na “Maybe later” verborgen).  
   - Code: `RATE_PROMPT_THRESHOLD = 10` in `src/sidepanel/panel.js`; contextmenu-success telt ook mee via `background.js`.

5. **Pro (handtest):** feed-server aan → **Options** → **Verify with server** (localhost: lege key = developer bypass, of echte key). Side panel sluiten/heropenen of herladen. In DevTools op het panel-document: `<body class="… plan-pro">`; elementen met **`data-upgrade-link`** (upgrade-box) moeten verborgen zijn.

6. **Permissions / privacy (review):** vul **Permission justification** in (zie sectie hieronder); zet een **nauwkeurige** privacy-samenvatting in de lange beschrijving + op **`[PRIVACY_URL]`** (BYOK + hosted feed + API tester).

---

## Chrome Web Store — invulvelden (copy-paste)

### Extension name (store listing title)

**Aanbevolen (positionering: Explain & Debug):**  
**`DevLynx AI: Explain, Debug & Modify Websites`**

*Alternatief (meer “inspect”-SEO):* **`DevLynx AI: Inspect, Debug & Modify Websites`**

*(Vermijd een listing die alleen “API debugging” suggereert — het product is breder: Explain Element, errors, mods, API tester, enz.)*

### Short description (max ±132 tekens — tel in het formulier)

**Aanbevolen (Explain & Debug):**  
`Explain UI & debug JS errors with AI. Modify pages, test APIs, dev assistant — BYOK OpenAI.`

**Alternatief:**  
`AI developer tools: explain elements, debug errors, modify sites & test APIs — BYOK OpenAI.`

### Single purpose (indien gevraagd in het dashboard)

**English:**

DevLynx AI is a single-purpose **developer tool**: it helps you **explain, debug, and modify** web pages you work on, with **AI-assisted** features (explain element, error help, Q&A, mods) and an **API tester**. **Free** includes core tools plus a **limited AI trial**; **Pro** (one-time purchase) unlocks **unlimited** use of Pro AI features. Users bring their **own OpenAI API key** (BYOK). The extension uses a **hosted DevLynx feed** for connectivity, licensing, and trial features, and may contact **OpenAI** and **user-entered URLs** (API tester) as described in the privacy policy.

### Detailed description

```
Inspect, debug, and modify any website — with AI where you enable it.

DevLynx AI lives in your browser's side panel and stays open while you browse. Click the toolbar icon once — the panel pins to the side of any tab. No popups, no switching windows: your AI dev toolkit is always one glance away.

It's an AI-powered developer toolkit: explain DOM elements, understand console errors, ask a dev assistant, generate page mods, run an HTTP API tester, capture screenshots, and use context-menu shortcuts on any site.

KEY FEATURES

• AI Explain Element (Pro) — Click any element for a clear explanation: role, layout, and practical dev notes.

• Error Explainer (Pro) — Paste a stack trace or capture page errors for AI explanations and fix hints.

• AI Dev Assistant — Ask about JavaScript, CSS, browser APIs, debugging, and extension development.

• AI Mod Generator — Describe a visual or behavior change; get CSS/JS for the current page.

• API Tester — Send GET / POST / PUT / DELETE to endpoints you type in (CORS-friendly from the panel).

• Screenshot — Capture the visible tab from the panel.

• Context menu — DevLynx AI actions on the page or on selected text.

FREE VS PRO

Free: core tools plus a shared AI trial (e.g. 20 successful AI uses — see in-app trial status).  
Pro: unlimited AI for Explain Element, Error Explainer, and other AI features. Pro is a one-time purchase at $19 USD with lifetime updates (sold via Gumroad when the product is available).

SETUP

Add your OpenAI API key under API & Environment in the panel (BYOK). In the default extension flow, AI calls go directly from the extension to OpenAI with your key. The hosted DevLynx feed is used for health, licensing, trial enforcement, and optional server-backed features (for example screenshot storage). Advanced users may point builds at a local feed server (see project documentation).

PRIVACY (SUMMARY)

We do not sell browsing history or run ad profiling. Your OpenAI API key is stored only in this browser on your device — not for resale. AI requests in the default extension flow go directly to OpenAI with your BYOK key. The extension contacts our hosted service for health, licensing, trial enforcement, and optional server-backed features (such as screenshot storage). The API tester sends requests only to URLs you explicitly enter. Details: https://devlynx.dev/privacy

PERMISSIONS

Broad access (<all_urls>) is required so developer features work on any site you debug, and so the API tester can reach URLs you choose. See permission justification in the listing.

SUPPORT

mailto:support@devlynx.dev
```

### Permission justification (plak in het dashboard)

```
DevLynx AI is a developer tool that inspects and modifies the DOM of pages the developer is working on.

The extension needs access to all URLs because developers debug and analyze any website they visit (their own sites, staging, client projects, documentation, third-party docs, etc.).

Host access is used only to:
• inspect page elements and analyze DOM structure
• inject in-page developer UI (e.g. explain-element mode, selections, mod tooling)
• apply temporary CSS/JS modifications the user requests (AI Mod Generator / site mods)
• run the API tester against URLs the user explicitly enters (any origin they type)

We do not use this access to harvest browsing history for advertising. The user’s OpenAI API key is stored locally in the extension. Network traffic may go to: OpenAI (BYOK AI calls from the extension), our hosted feed API for license/trial/health and optional server-backed features, optional license verification (e.g. Gumroad), and user-chosen API tester targets. No silent bulk collection of page content for unrelated purposes.
```

### Privacy policy — punten voor je publieke pagina (`[PRIVACY_URL]`)

Gebruik een eigen pagina; minimum-inhoud:

- Geen verkoop van browse-historie; geen advertentie-profielen.  
- **BYOK:** OpenAI-sleutel alleen **lokaal in de browser**; billing bij OpenAI.  
- **Hosted feed:** licentie, trial, health en optionele server-backed functies (zoals screenshot-opslag) — in het kort benoemen.  
- **API tester:** verkeer naar **door jou ingevoerde** endpoints; derde partijen vallen onder hun eigen policies.  
- **Gumroad** (indien actief): aankoop/licentie.  
- Contact voor privacyvragen.

*(Zie ook [STORE-SECTION-3-BRIEFING-NL.md](STORE-SECTION-3-BRIEFING-NL.md) § privacy.)*

### Pricing (product — géén maandprijs tenzij je model wijzigt)

| Plan | Model |
|------|--------|
| **Free** | Core tools + **AI trial** (o.a. ~20 succesvolle uses; zie app). |
| **Pro** | **$19 USD** eenmalig · lifetime updates · onbeperkte Pro-AI (zoals in app). |

*Gebruik **geen** €12/mnd of €99/jr in store-copy tenzij je daar echt op verkoopt — dat botst met de huidige **lifetime**-Pro in de extensie.*

### Category

**Developer Tools** (of **Productivity**)

### Suggested screenshots (1280 × 800)

1. **Explain Element** — panel + “Try it” of resultaat op echte site.  
2. **Error Explainer** — error + AI-antwoord.  
3. **API Tester** — method, URL, response (optioneel Gen code / Explain).  
4. **Side panel overview** — statusbalk (server, OpenAI, plan / trial).  
5. *(Optioneel)* AI Mod Generator of contextmenu — geen API-keys zichtbaar op PNG’s.

### Store tags / keywords (in lange tekst verweven)

inspect element, DOM inspector, debug website, JavaScript errors, modify website, web debugging, frontend debugging, AI developer assistant, API testing, BYOK, Chrome extension.

### Support URL

`mailto:support@devlynx.dev`

---

## Promo — één zin

DevLynx AI: **explain** any element, **debug** errors with AI, then tweak pages and test APIs from one side panel — BYOK OpenAI, free trial, optional Pro lifetime unlock.

---

## Positioning (store-safe, current features only)

Gebruik dit in je listing/website copy zonder toekomstclaims:

- **Web developer focus:** built for frontend/full-stack debug workflows, not generic AI chat.
- **Real browser context:** explain elements and errors on the actual page you are working on.
- **Persistent side panel:** pins to the side of any tab — stays open while you browse, no popup that closes on every click.
- **All-in-one toolkit:** explain element, error capture+explain, dev assistant, API tester, mod generator, screenshot.
- **Privacy-first BYOK:** users add their own OpenAI key; key stays local in browser storage.
- **Practical outcomes:** action-oriented fixes and implementation guidance, not only theory.

### Competitive framing (kort, niet agressief)

- **Vs general AI chat:** DevLynx sees page context + extension constraints (MV3, CORS, content/background boundaries).
- **Vs DevTools only:** DevLynx adds AI explanations and concrete fix guidance on top of native browser debugging.
- **Vs generic extensions:** DevLynx is focused on web dev workflows instead of marketing/content use cases.

---

## Snelle referentie — zoekhooks (bovenaan lange tekst optioneel)

1. **Explain, debug and modify any website with AI.**  
2. **Understand the DOM and fix JavaScript errors faster.**

---

*Manifest-naam/descriptie staan in `src/manifest.json`. Store-titel mag iets uitgebreider zijn dan de korte manifest `name`.*
