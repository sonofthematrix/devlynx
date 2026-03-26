# Store checklist §3 – briefing (mockups, teksten, juridische hooks)

Alles wat je nodig hebt voor **Chrome Web Store → listing** (screenshots, beschrijvingen, privacy, permissies, support-URL).  
**Brand:** **DevLynx AI** (zelfde als in `src/manifest.json`).

**Huidige extensieversie (manifest):** `1.1.3`  
**Pro-prijs in UI:** **$35.99 USD** · eenmalig · lifetime updates (Gumroad-product kan tijdelijk uit staan — in teksten mag je prijs + model wel vastleggen).

---

## 1. Concept in één ademtocht

| | |
|--|--|
| **Wat het is** | Chrome-extensie (MV3): **AI developer-assistent** op elke website — side panel + content script + contextmenu. |
| **Voor wie** | Frontend/web developers, extension-makers, debug werk. |
| **Freemium** | **Free:** core tools + **gedeelde AI trial** (standaard **20** succesvolle AI-uses, server/client afhankelijk van JWT). **Pro:** o.a. **Explain Element** & **Error Explainer** **onbeperkt** + onbeperkte AI voor de rest van de AI-features; **eenmalige aankoop**. |
| **Technisch** | Default **production build** praat met **gehoste feed API** (bijv. Vercel: `https://devlynx-black.vercel.app`) + **jouw OpenAI API key (BYOK)** in de extensie. Optioneel lokaal: `localhost:2847`. |
| **Privacy-kern** | Geen analytics/telemetry van ons. Key blijft **lokaal in de browser**; netwerk naar **OpenAI**, **jouw feed-host**, en **door de gebruiker gekozen URL’s** (API tester). |

Gebruik dit als rode draad in mockups (Free vs Pro, BYOK, “developer tool op elke site”).

---

## 2. Features om te tonen / te beschrijven

Plak in screenshotvolgorde of in de lange beschrijving (Engels voor store):

1. **AI Explain Element (Pro)** – Try it → element op pagina → AI-uitleg (DOM/UI context).
2. **Error Explainer (Pro)** – Console-error plakken of **Get Errors** → AI-uitleg + fixrichting.
3. **AI Dev Assistant** – Vragen over code, extensions, debug (trial / Pro).
4. **AI Mod Generator** – Natuurlijke taal → CSS/JS voor huidige pagina (trial / Pro).
5. **API & Environment** – OpenAI key **Save/Clear**; **Open API tester** (GET/POST/…, **Call**), optioneel **Gen code / Explain** op endpoint (met AI + key).
6. **Screenshot** – Capture via panel (o.a. naar server/Blob afhankelijk van deploy — in privacy page vermelden als je server-side screenshot opslaat).
7. **Context menu** – Rechtsklik: o.a. Ask AI, Explain error, code genereren (afhankelijk van context).

**Side panel** laat status: server verbonden, OpenAI, plan (free/pro), trial waar relevant.

---

## 3. Wat jij in §3 moet invullen / produceren

| Store-veld | Jouw deliverable |
|--------------|------------------|
| **Screenshots** | **3–5** beelden, liefst **1280×800** (of store-eisen van dat moment). Zie §8 ideeën. |
| **Promo/mockups** | Optioneel: `npm run store-promos:from-screenshot` levert o.a. materialen onder `assets/store-mockups/` (zie `PUBLISHING.md`). |
| **Korte beschrijving** | Engels, **~132 tekens** — voorstel in §5. |
| **Lange beschrijving** | Engels — sjabloon §6 (pas aan op echte privacy-URL). |
| **Privacy policy URL** | **Publieke HTTPS-pagina** die BYOK + hosted feed + `<all_urls>` / API tester uitlegt. Mag GitHub `PRIVACY.md` raw of een simpele `website/privacy.html`. |
| **Permission justification** | Engels — §7 plakken in dashboard. |
| **Support / website URL** | Repo, `website/index.html` live, of support-mail pagina — **verplicht** voor listing. |

---

## Engels – **Short description** (~132 tekens, tel na in formulier)

**Aanbevolen (Explain & Debug — zie STORE-LISTING.md):**  
`Explain UI & debug JS errors with AI. Modify pages, test APIs, dev assistant — BYOK OpenAI.`

**Alternatief:**  
`AI developer tools: explain elements, debug errors, modify sites & test APIs — BYOK OpenAI.`

---

## Engels – **Detailed description** (sjabloon)

**Master-copy (volledige blok, telkens bijwerken):** [STORE-LISTING.md](STORE-LISTING.md) → sectie **“Detailed description”**.

Pas daar **`[PRIVACY_URL]`** en **`[SUPPORT_URL]`** aan. Kern: **geen** “alleen localhost” — wel **BYOK in browser**, **hosted feed**, **API tester = alleen door user ingevoerde URL’s**.

---

## Engels – **Permission justification** (plak in dashboard)

*(Identiek aan **STORE-LISTING.md** — daar is de master-tekst.)*

```
DevLynx AI is a developer tool that inspects and modifies the DOM of pages the developer is working on.

The extension needs access to all URLs because developers debug and analyze any website they visit (their own sites, staging, client projects, documentation, third-party docs, etc.).

Host access is used only to:
• inspect page elements and analyze DOM structure
• inject in-page developer UI (e.g. explain-element mode, selections, mod tooling)
• apply temporary CSS/JS modifications the user requests (AI Mod Generator / site mods)
• run the API tester against URLs the user explicitly enters (any origin they type)

We do not use this access to harvest browsing history for advertising. The user’s OpenAI API key is stored locally in the extension. Network traffic may go to: OpenAI (when the user configures BYOK), our hosted feed API for license/trial/health and related features, optional license verification (e.g. Gumroad), and user-chosen API tester targets. No silent bulk collection of page content for unrelated purposes.
```

**Per permissie (kort, indien apart gevraagd):**

| Permission | Waarom |
|------------|--------|
| **tabs** | Actieve tab voor Explain Element, screenshot, API-context; open pricingsupport in nieuw tabblad. |
| **activeTab** | Eenmalige toegang bij actie van de gebruiker. |
| **storage** | License, plan, trial, voorkeuren lokaal (`chrome.storage.local`). |
| **downloads** | Screenshots / exports naar apparaat. |
| **contextMenus** | Rechtsklikmenu “DevLynx AI”. |
| **scripting** | Kleine scripts in tab (selectie, explain-overlay); geen remote code. |
| **sidePanel** | Side panel UI (Chrome). |

**Host permissions (manifest):** `<all_urls>`, `localhost`/`127.0.0.1:2847`, `https://api.openai.com/*`, `https://api.devlynx.ai/*`, `https://devlynx-black.vercel.app/*` — in teksten: leg uit dat **OpenAI** + **jouw feed-host** + **API tester naar willekeurige URL** de breedte rechtvaardigen.

---

## Privacy policy – punten die je pagina moet dekken

Gebruikers en reviewers verwachten expliciet:

1 Geen verkoop van browse-historie; geen reclame-profielen.  
2 **OpenAI API key:** alleen lokaal opgeslagen in de browser; gebruiker is verantwoordelijk voor hun OpenAI-account/billing (BYOK).  
3 **Hosted feed:** welke data (bijv. health check, license verify, trial JWT, eventuele server-side AI-proxy, screenshots naar Blob) — wees eerlijk en globaal (“requests needed to operate the service”).  
4 **API tester:** verkeer gaat naar **door de gebruiker ingevoerde endpoints** — geen controle van jou op derde partijen.  
5 **Gumroad** (als actief): licentiecontrole bij purchase.  
6 **Contact:** e-mail of issue-tracker voor privacyvragen.

*(Oude zin “alleen localhost” is voor productie **niet** volledig correct — gebruik bovenstaande.)*

---

## Screenshot / mockup checklist (1280×800)

1 **Hero:** Side panel open op een echte dev-site — zichtbaar: Explain Element + “Try it” of resultaat.  
2 **Error Explainer:** error in textarea + AI-antwoord.  
3 **API tester:** URL + method + response / Call-knop.  
4 **Free + trial:** trial-regel of statusbalk (server / OpenAI / plan).  
5 **Upgrade/footer (optioneel):** Pro-copy met **$35.99 USD** — alleen als store geen “prijsonly” promo verbiedt in beeld (check actuele policy).

Zorg dat geen **secrets** (API keys) zichtbaar zijn op PNG’s.

---

## Category & keywords

- **Category:** Developer Tools (of Productivity).  
- **Keywords (in lange tekst verwerken):** inspect element, DOM inspector, debug website, JavaScript errors, modify website, web debugging, frontend debugging, AI developer assistant, API testing.

---

## Na jouw side project

1 Publiceer **privacy** + **support** URL’s.  
2 Vul dashboard in; upload PNG’s.  
3 Kruis `STORE-READY-CHECKLIST-NL.md` §3 af.  
4 Zorg dat **Gumroad-pagina** en **prijs** in store/developer teksten gelijk lopen wanneer je weer verkoopt.

---

*Bronnen in repo: `developer/STORE-LISTING.md`, `developer/CHROME-WEB-STORE-DESCRIPTION.md`, `developer/CHROME-WEB-STORE-COMPLIANCE-AUDIT.md`, `developer/FREEMIUM.md`, `PRODUCT-SUMMARY.md`, `src/manifest.json`.*
