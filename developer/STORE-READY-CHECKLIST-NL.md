# Chrome Web Store — release checklist (NL)

Vink af vóór elke upload. Zie ook [STORE-LISTING.md](STORE-LISTING.md), [PUBLISHING.md](PUBLISHING.md) en [RELEASE-PRODUCTION.md](RELEASE-PRODUCTION.md).

**§3 (mockups, teksten, privacy, permissies):** jij pakt dit op — alles staat in [STORE-SECTION-3-BRIEFING-NL.md](STORE-SECTION-3-BRIEFING-NL.md).

---

## 1. Build & ZIP

- [x] Vanaf **projectroot**: `npm install` (indien dependencies gewijzigd). *— o.a. gedaan bij v1.1.3*
- [x] **`src/manifest.json`**: `version` **1.1.3** (bump vóór elke nieuwe store-upload).
- [x] Productie-build: **`npm run release`** → **`release/devlens-extension.zip`** (`manifest.json` in de **root** van de zip).
- [ ] *Optioneel:* **`npm run store-ready`** → **`release/devlynx-ai-chrome-store.zip`** + **`store-ready/`** (dubbele zip voor eigen controle — nog niet verplicht).

---

## 2. Techniek & backend

- [x] **Hosted feed** bereikbaar: `GET https://devlynx-black.vercel.app/health` → `"ok": true` *(gecontroleerd; trial JWT + blob aan)*.
- [x] **Zelfde productie-URL** in **`scripts/build.js`** (`HOSTED_FEED_API` default) **én** in **`src/manifest.json`** → `host_permissions`: `https://devlynx-black.vercel.app/*` *(na wijziging: opnieuw `npm run release`)*.
- [x] **Geen secrets in git:** `.env` / `.env.local` staan in **`.gitignore`** (root + `feed-server/`); commit nooit keys.
- [x] **Trial JWT:** Publieke PEM in **`src/license-jwt-public.js`**; server heeft signing actief (`trialJwt: true` op `/health`). Private key alleen op Vercel — zie [LICENSE-JWT-KEYS.md](LICENSE-JWT-KEYS.md). *(Als je keypairs roteert: PEM hier updaten + opnieuw build + release.)*

---

## 3. Chrome Web Store — formulier *(jij)*

**Briefing:** [STORE-SECTION-3-BRIEFING-NL.md](STORE-SECTION-3-BRIEFING-NL.md)

- [ ] **Screenshots** (bijv. 1280×800): 3–5 stuks; optioneel `npm run store-promos:from-screenshot` → `assets/store-mockups/`.
- [ ] **Korte + lange beschrijving** (Engels); o.a. [STORE-LISTING.md](STORE-LISTING.md).
- [ ] **Privacy policy URL** (publiek HTTPS).
- [ ] **Permission justification** (Engels — staat in de briefing).
- [ ] **Support / website URL**.

---

## 4. Snelle handtest *(deels jij in de browser)*

- [x] **`npm run build:prod`** slaagt; **`dist/`** is actueel *(gecontroleerd in repo)*.
- [ ] **Load unpacked** op **`dist/`** in een schoon profiel → panel **Connected**; geen harde console-errors.
- [ ] *Optioneel:* Pro-pad + **Verify with server** (zie [STORE-LISTING.md](STORE-LISTING.md) § launch checklist); rate-banner na 10 AI-successen.

---

## 5. Na goedkeuring / eerste live versie

- [ ] In **`src/sidepanel/panel.js`**: **`CHROME_WEB_STORE_EXTENSION_ID`** = echt Chrome Web Store ID (niet `REPLACE_WITH_EXTENSION_ID`).
- [ ] Daarna **`npm run release`** en **update** uploaden.

---

## Scripts


| Commando | Resultaat |
|----------|-----------|
| `npm run release` | `build:prod` + **`release/devlens-extension.zip`** |
| `npm run store-ready` | `build:prod` + **`store-ready/`** + **`release/devlynx-ai-chrome-store.zip`** |
| `npm run build:prod` | Alleen **`dist/`** (geen zip) |

---

*Laatst bijgewerkt: checklist §1–§2–§4 tech-check (DevLynx AI). §3 bewust open voor jouw store-formulier-werk.*
