# DevLynx – Security & code check-up

Volledige controle op fouten, zwaktes en security. Laatste update: maart 2025.

---

## 1. Security-zwaktes

### 1.1 **.env niet in .gitignore (hoog)**

- **Probleem:** `.gitignore` bevat geen `.env`. API-keys (OPENAI_API_KEY), Gumroad product ID en **DEV_CODES** kunnen per ongeluk gecommit worden.
- **Aanbeveling:** Voeg toe aan `.gitignore`:
  ```
  .env
  feed-server/.env
  ```
- **Controle:** `git check-ignore -v feed-server/.env` moet een match geven.

---

### 1.2 **Options-pagina: “Save” zet Pro zonder verificatie (hoog)**

- **Locatie:** `src/options/options.js` – knop “Save” (save-btn).
- **Probleem:** Bij “Save” worden `devlens_plan = 'pro'` en de ingevoerde key opgeslagen **zonder** server-verificatie. Iemand kan een willekeurige key invullen, op Save klikken en lokaal Pro krijgen.
- **Mitigatie:** De **server** weigert AI-requests bij ongeldige license (Gumroad/dev check), dus misbruik is beperkt tot de UI (Pro-badges, trial niet getoond). Geen onbeperkte AI zonder geldige key.
- **Aanbeveling:**  
  - Optie A: Verwijder de “Save”-knop; alleen “Verify with server” mag plan op Pro zetten.  
  - Optie B: “Save” alleen de key opslaan (niet `plan = 'pro'`); Pro alleen na succesvolle “Verify”.

---

### 1.3 **Feed-server luistert op 0.0.0.0 (medium)**

- **Locatie:** `feed-server/server-with-ai.js`: `server.listen(PORT, '0.0.0.0')`.
- **Probleem:** Server is bereikbaar vanaf het hele netwerk (bijv. LAN). Developer-bypass blijft correct (alleen `remoteAddress === 127.0.0.1` / `::1`), maar poort en endpoints zijn van buitenaf te raken.
- **Risico:** Andere machines op het netwerk kunnen `/health`, `/verify-license` (met key) of POST `/` (AI) aanroepen als ze het poortnummer weten.
- **Aanbeveling:** Voor strikt lokaal gebruik: luister op `127.0.0.1` in plaats van `0.0.0.0`, of documenteer dat 0.0.0.0 alleen voor dev is en dat firewall/poort afgeschermd moeten worden.

---

### 1.4 **Geen body size limit op feed-server (medium)**

- **Locatie:** `feed-server/server-with-ai.js` – `parseBody(req)` leest de body zonder limiet.
- **Probleem:** Een zeer grote JSON-body kan veel geheugen gebruiken (DoS).
- **Aanbeveling:** Limiteer de body-size (bijv. max 1–2 MB) en weiger grotere requests (413 of 400).

---

### 1.5 **Screenshot filename: lege `base` (laag)**

- **Locatie:** `feed-server/server-with-ai.js` – case `screenshot`.
- **Code:** `const base = filename.replace(/[^a-zA-Z0-9._-]/g, '_');` → `path.join(SCREENSHOTS_DIR, base)`.
- **Probleem:** Als `filename` alleen tekens bevat die weggefilterd worden (bijv. "   "), wordt `base` leeg en schrijft de server mogelijk naar een onbedoeld pad.
- **Aanbeveling:** Als `!base || base.length === 0`, reageren met 400 en geen bestand schrijven.

---

### 1.6 **X-Forwarded-For niet gecontroleerd (laag)**

- **Locatie:** Developer-bypass gebruikt `req.socket.remoteAddress`.
- **Probleem:** Als de server achter een proxy staat die `X-Forwarded-For` zet, kan een aanvaller die header spoofen en zich als localhost voordoen (als je later op die header zou vertrouwen).
- **Aanbeveling:** Nu correct: alleen `remoteAddress` gebruiken. Als je ooit een proxy gebruikt, **niet** blindelings `X-Forwarded-For` voor de localhost-check gebruiken tenzij de proxy vertrouwd is en je de reële client-IP correct afleidt.

---

### 1.7 **Trial alleen in de extensie (bewust ontwerp)**

- **Feit:** Trial state (`trialUsesRemaining`) staat alleen in `chrome.storage.local`; de server kent geen trial.
- **Gevolg:** Gebruiker kan door storage te wissen of een nieuw profiel te gebruiken opnieuw 20 proefgebruiken krijgen.
- **Aanbeveling:** Geen security-fix nodig; bewust zo ontworpen. Voor striktere limieten zou je server-side tracking (bijv. anonieme id) nodig hebben, met privacy-afwegingen.

---

## 2. Codekwaliteit & fouten

### 2.1 **Typo / verouderde comment in options.js**

- **Locatie:** `src/options/options.js` – comment bij save-btn: “Replace with your own validation (e.g. API call) later.”
- **Feit:** Verificatie bestaat al via “Verify” en de server. De comment is misleidend; “Save” doet geen verificatie.
- **Aanbeveling:** Comment aanpassen of verwijderen, en gedrag van Save/Verify documenteren (zie 1.2).

---

### 2.2 **PRICING_URL / Gumroad-URL dubbel**

- **Locatie:** `src/sidepanel/panel.js`: `const PRICING_URL = 'https://your-username.github.io/...'`; elders wordt hardcoded `https://jcdreamz.gumroad.com/l/devlynx-ai` gebruikt (goProBtn, upgrade modal).
- **Probleem:** PRICING_URL wordt waarschijnlijk nergens gebruikt of wijkt af van de echte checkout-URL.
- **Aanbeveling:** Eén centrale constante voor de “Go Pro”-URL gebruiken (bijv. PRICING_URL of GUMROAD_CHECKOUT_URL) en overal die gebruiken.

---

### 2.3 **API_REQUEST in background: geen URL-restrictie**

- **Locatie:** `src/background.js` – message type `API_REQUEST`.
- **Feit:** Elke URL uit de payload wordt gefetcht (met host_permissions `<all_urls>`). Bedoeld voor o.a. API-tester; geen bug, maar wel bewustzijn.
- **Risico:** Alleen extension-context (panel/options/background) kan dit aanroepen; webpagina’s kunnen geen `chrome.runtime.sendMessage` naar de extensie sturen. Geen directe exploit vanaf een site.

---

### 2.4 **INJECT_MOD: AI gegenereerde CSS/JS**

- **Feit:** De server (OpenAI) levert CSS/JS; de extensie injecteert dat in de tab.
- **Risico:** Als de model-output kwaadaardige code bevat (of de server gecompromitteerd is), wordt die in de pagina uitgevoerd.
- **Aanbeveling:** Acceptabel als bewuste keuze “AI code uitvoeren”. Optioneel: alleen injectie op door de gebruiker geïnitieerde actie en duidelijke waarschuwing in de UI.

---

## 3. Wat goed zit

- **License-check:** Alleen de server beslist over geldigheid (Gumroad + DEV_CODES + developer-bypass). Dev codes zitten niet in de extensie.
- **Developer-bypass:** Alleen bij `remoteAddress === 127.0.0.1` (of ::1 / ::ffff:127.0.0.1) en geen key; geen spoofing via headers.
- **XSS in panel:** `escapeHtml()` wordt gebruikt; `markdownToHtml()` escapest eerst de hele string, daarna worden alleen code/strong/br toegevoegd. AI-antwoorden gaan veilig naar de DOM.
- **Content script toast:** `text` voor Explain Element wordt geëscaped met `replace(/</g, '&lt;')` etc. voordat het in innerHTML gaat.
- **Screenshot path:** `filename` wordt gesanitized met `[^a-zA-Z0-9._-]` → `_`; path traversal (../) wordt daarmee geblokkeerd.
- **Trial:** Duidelijke flow: licenseValid → toegang; anders trial > 0 → toegang + decrement; anders blokkeren met duidelijke melding. Developer/dev types krijgen geen trial-beperking (plan = pro).

---

## 4. Korte actielijst (prioriteit)

| Prioriteit | Actie |
|-----------|--------|
| Hoog      | `.env` en `feed-server/.env` in `.gitignore` zetten. |
| Hoog      | Options: “Save” geen Pro meer zetten zonder verificatie; alleen “Verify” mag Pro activeren, of Save alleen key opslaan. |
| Medium    | Feed-server: body size limit (bijv. 1–2 MB) in `parseBody` of voor de request handler. |
| Medium    | Overweeg server alleen op `127.0.0.1` te laten luisteren, of dit documenteren. |
| Laag      | Screenshot: 400 retourneren als `base` na sanitization leeg is. |
| Laag      | Eén centrale “Go Pro”-URL constant; PRICING_URL opruimen of gebruiken. |

---

## 5. Geen actie nodig (bewust ontwerp)

- Trial alleen in de extensie (geen server-side trial).
- Host permissions `<all_urls>` voor API-tester en feed-server.
- Server CORS `*` voor lokaal gebruik (alleen localhost in de praktijk).
- Obfuscatie van `dist/`: geen vervanging voor security; keys/secrets horen niet in de extensie.

Dit document kun je bij elke release of security-review opnieuw langs lopen en bijwerken.
