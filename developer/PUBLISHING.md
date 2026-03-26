# Publishing DevLynx AI

Checklist and steps for publishing the extension to the Chrome Web Store (or Edge Add-ons).

---

## Laatste check voordat je uploadt

Open **`release/devlens-extension.zip`** en controleer dat de structuur zo is:

```
devlens-extension.zip
├ manifest.json      ← in de root, NIET in dist/
├ background.js
├ content/
├ sidepanel/
├ icons/
├ options/
```

**BELANGRIJK:** `manifest.json` moet in de root van de zip staan (niet `dist/manifest.json`). De build (`npm run release`) maakt de zip zo aan. Als dat klopt kun je uploaden.

---

## 3️⃣ Onboarding (eerste keer dat iemand opent)

Eerste-keer flow voor gebruikers (gebruik in app, store description of help):

1. **Install extension** – uit de store of Load unpacked.
2. **Start feed server** – `start-server-with-ai.bat` in de map `feed-server` (of `node server-with-ai.js`).
3. **Add OpenAI API key** – in `feed-server/.env`: `OPENAI_API_KEY=sk-...`.

Daarna toont de extensie “Connected” en werken alle AI-features.

---

## 4️⃣ Store screenshots & promo’s

Chrome Web Store vraagt meestal **3–5 screenshots** (**1280×800** of 640×400). **Promo-tegels** (marquee, thumbnail, kleine tile) upload je in hetzelfde dashboard — die zitten **niet** in de extension-ZIP.

### Automatisch uit echte screenshots (aanbevolen)

1. Maak / vervang de bron-PNG’s:
   - **`assets/screenshot-sidepanel.png`** — browser + zijpaneel (verplicht).
   - **`assets/screenshot-contextmenu.png`** — contextmenu (optioneel; voor een extra screenshot).
2. Voer uit vanaf de projectroot:
   ```bash
   npm run store-promos:from-screenshot
   ```
3. Alle **store- en promo-PNG’s** worden geschreven naar **`assets/store-mockups/`** (alleen afbeeldingen, geen README in die map).

**Bestanden die het script schrijft** (`npm run store-promos:from-screenshot`):

| Bestand | Formaat |
|---------|---------|
| `01-full-browser-1280x800.png` | 1280×800 — hele screenshot |
| `02-panel-full-1280x800.png` | 1280×800 — alleen zijpaneel |
| `store-screenshot-1280x800.png` | zelfde als `02` |
| `03-panel-top-explain-1280x800.png` | 1280×800 — bovenste deel paneel |
| `04-panel-mid-assistant-1280x800.png` | 1280×800 — midden paneel |
| `05-panel-bottom-tools-1280x800.png` | 1280×800 — onderkant paneel |
| `06-context-menu-1280x800.png` | 1280×800 — als `assets/screenshot-contextmenu.png` bestaat |
| `panel-crop-from-screenshot.png` | ruwe crop van het paneel |
| `promo-marquee-1400x560.png` | 1400×560 — **standaard** = stijl 1 (classic) + echt paneel rechts |
| `promo-marquee-style-01-1400x560.png` … `style-10-1400x560.png` | Zelfde copy, **10 verschillende layouts** (niet alleen kleur): 01 editorial+rail, 02 bento-grid, 03 faux browser, 04 gecentreerde hero, 05 receipt/monospace, 06 Swiss poster, 07 stickers, 08 split+masthead, 09 tilted card, 10 typographic watermark |
| `extension-cover-1480x560.png` | **Banner-cover** 1480×560: strakke header, raster, capability-blok, trust-regel; paneel rechts (+ icoon in kader als `src/icons/icon128.png` bestaat) |
| `promo-tile-440x280.png` | 440×280 |
| `thumbnail-600x600.png` | 600×600 |

**Paneel-crop finetunen** (als het rechter paneel te smal/breed is): in **`scripts/build-promos-from-screenshot.js`** — `PANEL_WIDTH_RATIO`, `MIN_PANEL_PX`, `MAX_PANEL_PX`.

### Handmatig (alternatief)

Als je geen script gebruikt, maak zelf 1280×800 screenshots en bewaar ze bijvoorbeeld onder **`assets/`**.

| # | Scherm | Wat laten zien |
|---|--------|----------------|
| 1️⃣ | **Explain Element** | Sidepanel + “Try it!” / klik op element → AI-uitleg zichtbaar. |
| 2️⃣ | **Error Explainer** | Error geplakt of “Get Errors” → “Explain error” → AI-antwoord. |
| 3️⃣ | **Dev Assistant** | Vraag in het tekstveld + “Ask AI” → antwoord in het panel. |
| 4️⃣ | **API Tester** | API Tester slide-over: URL, CALL, response (en optioneel Gen Code / Explain). |
| 5️⃣ | **AI Mod Generator** | Beschrijving van wijziging + “Generate mod” → resultaat / toegepaste mod. |

Upload de PNG’s in het Developer Dashboard bij je item.

---

## 5️⃣ Korte demo video (optioneel maar sterk)

Een **~30 seconden** screen recording verhoogt de install rate aanzienlijk.

**Idee voor de opname:**

- Klik op een element op een pagina → AI legt het element uit.
- Plak een console error → AI legt de error uit.
- Stel een dev-vraag in het panel → AI antwoordt.

Upload de video op de store (waar mogelijk) of op je landing page / YouTube en link ernaar in de beschrijving of support-URL.

---

## Wat je nog nodig hebt voor publicatie

De store vraagt ook:

| Item | Vereiste |
|------|----------|
| **Icon** | 128×128 PNG (manifest verwijst naar `icons/icon128.png`) |
| **Screenshots & promo’s** | 3–5× **1280×800** + optioneel marquee/tile/thumbnail; zie §4; bestanden in **`assets/store-mockups/`**. |
| **Short description** | Max 132 tekens — zie STORE-LISTING.md |
| **Detailed description** | Zie STORE-LISTING.md |

---

## Before you submit

- Extension works locally (Load unpacked from **dist/** of **src/**, server running, AI features tested).
- Version in `src/manifest.json` is set; daarna **`npm run release`** uitgevoerd.
- Screenshots en promo’s klaar (`npm run store-promos:from-screenshot` of handmatig; zie §4).
- Short description (max 132 characters) and detailed description written — see **STORE-LISTING.md**.

---

## 1. Create the package

- Run **`npm run release`** (in the project root). Dit bouwt vanuit **src/** naar **dist/** (obfuscated) en maakt **`release/devlens-extension.zip`**.
- Upload **`release/devlens-extension.zip`** in de Chrome Web Store.

Zie **PROJECT-STRUCTURE.md** in de projectroot: alleen **release/devlens-extension.zip** is voor de store.

---

## 2. Chrome Web Store

1. Ga naar [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).
2. Betaal eenmalig **$5** developer fee indien nog niet gedaan.
3. Klik **“New item”** en upload **`release/devlens-extension.zip`**.
4. Fill in:
  - **Short description** — copy from STORE-LISTING.md (≤132 chars).
  - **Detailed description** — copy from STORE-LISTING.md.
  - **Category** — e.g. **Developer Tools** or **Productivity**.
  - **Screenshots** — 3–5 stuks (1280×800); zie sectie “4️⃣ Store screenshots” hierboven.
  - **Support URL** — e.g. your GitHub repo or landing page.
5. **Privacy** — If you do not collect any user data (extension + local server only), state that clearly in the privacy section and in the listing.
6. Submit for review.

---

## 3. Landing page (optional)

- Use **GitHub Pages**, **Carrd**, or **Notion**.
- Include: name, one-line tagline, link to store, optional 30-second demo video.
- Link from store “Website” or “Support” if you have one.

---

## 4. After publish

- Share on **Reddit** (r/webdev, r/SideProject), **Hacker News** (Show HN), or **X/Twitter** with a short demo or screenshot.
- Keep **STORE-LISTING.md** and **README.md** in sync with new features for future updates.
- Keep alleen ideeën voor na launch in **`POST-LAUNCH-FEATURES/`** (zie `README.md` daar; o.a. `ROADMAP-NL.md`, `FEATURES-BACKLOG.md`, `MONETIZATION-IDEAS-NL.md`).

---

## Reference


| Document             | Use                                                                              |
| -------------------- | -------------------------------------------------------------------------------- |
| **STORE-LISTING.md** | Copy-paste text for store short/detailed description, category, screenshot tips. |
| **README.md**        | User-facing setup and features; link from repo or support URL.                   |
| **SUMMARY.md**       | Feature overview; useful for landing page or store “What you get”.               |


