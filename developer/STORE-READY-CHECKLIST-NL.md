# Chrome Web Store — release checklist (NL)

Vink af vóór elke upload. Zie ook [STORE-LISTING.md](STORE-LISTING.md), [PUBLISHING.md](PUBLISHING.md) en [RELEASE-PRODUCTION.md](RELEASE-PRODUCTION.md).

---

## 1. Build & ZIP

- [ ] Vanaf **projectroot**: `npm install` (indien dependencies gewijzigd).
- [ ] **`src/manifest.json`**: `version` verhoogd ten opzichte van de vorige store-build.
- [ ] Productie-build: **`npm run release`**  
  → **`release/devlens-extension.zip`** (`manifest.json` in de **root** van de zip — niet in een `dist/`-map).
- [ ] *Optioneel:* **`npm run store-ready`**  
  → **`release/devlynx-ai-chrome-store.zip`** + map **`store-ready/`** (zelfde inhoud als `dist/`, dubbelcheck).

---

## 2. Techniek & backend

- [ ] **Hosted feed** bereikbaar: open in browser **`https://devlynx-black.vercel.app/health`** (of jouw `DEVLYNX_FEED_API`) → `"ok": true`.
- [ ] **Zelfde URL** staat in **`scripts/build.js`** (`HOSTED_FEED_API`) én in **`src/manifest.json`** onder **`host_permissions`** (anders opnieuw builden).
- [ ] **Geen secrets** in git (alleen `.env` / `.env.local` lokaal; `.gitignore` ok).
- [ ] Trial JWT: **`LICENSE_JWT_PRIVATE_KEY`** op Vercel + bijpassende **public PEM** in **`src/license-jwt-public.js`** → daarna opnieuw builden ([LICENSE-JWT-KEYS.md](LICENSE-JWT-KEYS.md)).

---

## 3. Chrome Web Store — formulier

- [ ] **Screenshots** (bijv. 1280×800): 3–5 stuks; bron: `assets/` + **`npm run store-promos:from-screenshot`** → `assets/store-mockups/`.
- [ ] **Korte + lange beschrijving** (Engels in dashboard); hooks in [STORE-LISTING.md](STORE-LISTING.md).
- [ ] **Privacy policy URL** ingevuld; sluit aan bij permissies (`<all_urls>`, hosted API, OpenAI BYOK — zie [CHROME-WEB-STORE-COMPLIANCE-AUDIT.md](CHROME-WEB-STORE-COMPLIANCE-AUDIT.md)).
- [ ] **Permission justification**: waarom `<all_urls>` (o.a. API-tester op willekeurige URL’s) — tekstfragment in [STORE-LISTING.md](STORE-LISTING.md).
- [ ] **Support / website URL** (GitHub, landing of contact).

---

## 4. Snelle handtest (aanbevolen)

- [ ] Schone Chrome-profiel of tijdelijke map: **Load unpacked** op **`dist/`** na `npm run build:prod`.
- [ ] Panel: server **Connected**; geen hardnekkige fouten in console.
- [ ] *Optioneel:* Pro-pad + **Verify with server** (zie [STORE-LISTING.md](STORE-LISTING.md) § launch checklist).

---

## 5. Na goedkeuring / eerste live versie

- [ ] In **`src/sidepanel/panel.js`**: **`CHROME_WEB_STORE_EXTENSION_ID`** vervangen door het echte store-ID (i.p.v. `REPLACE_WITH_EXTENSION_ID`).
- [ ] Opnieuw **`npm run release`** en een **update** uploaden (of meesturen in volgende versie).

---

## Scripts ter referentie

| Commando | Resultaat |
|----------|-----------|
| `npm run release` | `build:prod` + **`release/devlens-extension.zip`** |
| `npm run store-ready` | `build:prod` + **`store-ready/`** + **`release/devlynx-ai-chrome-store.zip`** |
| `npm run build:prod` | Alleen `dist/` (geen zip) |

---

*Laatst bijgewerkt: store checklist NL (DevLynx AI).*
