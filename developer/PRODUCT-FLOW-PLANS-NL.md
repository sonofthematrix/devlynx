# Productflow: huidige situatie vs. kostenarme variant (NL)

Twee plannen: **zoals nu**, en **aangepast** — gericht op wat **makkelijk haalbaar** is **zonder** dat jij structureel **OpenAI- of hostingkosten** opbouwt (geen server-side chat voor iedereen).

---

## Plan A — Huidige flow (zoals in de code nu)

### Wat de gebruiker ziet

| Laag | Betaling | AI | Feed-server (Vercel) |
|------|-----------|-----|------------------------|
| **Free** | €0 | Trial + **eigen OpenAI-key** in extensie → direct `api.openai.com` | Licentie/trial (`/trial-token`, `/trial-consume`), `/verify-license`, `/health`, `/projects`, **screenshots** → Blob |
| **Pro** | Gumroad (eenmalig/abonnement — jouw keuze in Gumroad) | Zelfde BYOK; **unlimited** m.b.t. trial voor Pro-features | Zelfde + JWT Pro indien geconfigureerd |

### Geldstromen

- **Gebruiker → OpenAI:** voor alle grote chat-features (Ask AI, Explain, Mod, API-tester AI, contextmenu).  
- **Gebruiker → jou (Gumroad):** alleen bij **Pro**.  
- **Jij → Vercel/Blob:** alleen platform (functions, Blob); **geen** OpenAI-factuur per gratis chat zolang BYOK blijft.

### Sterke punten

- Gratis tier is **echt freemium**: tools + trial, geen verplichte maandprijs.  
- Jij **subsidieert geen** completion-tokens voor free users.

### Zwakke / risicopunten

- Panel **pollt elke 5 s** zolang de server “Disconnected” is → kan **veel** invocations bij misconfiguratie.  
- **Twee werelden** in de UX: “server Connected” maar “eigen OpenAI-key” — soms verwarrend.  
- Store/Privacy-copy moet **BYOK + hosted feed** duidelijk uitleggen.

---

## Plan B — Aangepaste flow (aanbevolen: **haalbaar + kostenarm**)

Doel: **geen** overstap naar “wij betalen OpenAI voor iedereen”, wél **minder risico en duidelijkere verkoop**.

### Kernkeuzes

1. **OpenAI blijft BYOK** voor (bijna) alle chat — jij maakt **geen** variabele OpenAI-kosten per user.  
2. **Vercel blijft** voor: licenties, trial-administratie, screenshots, health — **lichtgewicht**.  
3. **Pro blijft** feature-unlock + Gumroad; **geen** verplichte “free monthly fee”.  
4. **Optioneel later** (alleen als je wílt betalen voor groei): product **“Cloud AI”** apart — dan pas server-chat en maandprijs.

### Concrete wijzigingen (implementatie-orden: makkelijk → iets meer werk)

| # | Actie | Effekt | Inspanning |
|---|--------|--------|------------|
| 1 | **Disconnect-polling begrenzen**: max retries of exponentiële backoff; stop na N minuten tot gebruiker opnieuw het panel opent | Veel minder “lege” Vercel-calls | Klein (`panel.js`) |
| 2 | **Copy/UI**: één blok in het panel: “AI gebruikt **jouw** OpenAI-key; Pro ontgrendelt features X/Y” | Minder support, betere reviews | Docs + `panel.html` teksten |
| 3 | **Store listing**: permissies + privacy expliciet BYOK + feed-URL | Minder review-frictie | `STORE-LISTING.md` → dashboard |
| 4 | *(Optioneel)* **Trial minder server-afhankelijk** voor simpele flows — alleen als trial JWT toch problemen geeft | Minder `/trial-token` traffic | Al deels aanwezig als fallback |
| 5 | **Niet doen vóór je budget hebt:** alle chat naar `POST /` op de feed verplaatsen zonder prijswijziging | Zou **jouw** OpenAI-kosten geven | Bewust uitstellen |

### Verkoopflow Plan B (het verhaal naar buiten)

- **Free:** installeren → tools + beperkte trial → **eigen OpenAI-key plakken** → AI gebruiken. Jij vraagt **€0**.  
- **Pro:** upgrade voor **Explain Element / Error Explainer + unlimited** (zoals je product nu definieert). **Eenmalig** of jaar = vaak eenvoudiger dan “nog een basis-abonnement”.  
- **Geen** “maandgeld voor niet-Pro”: dat zou je concurrentiepositie tegen developer-gewoonte (“gratis extensie + eigen key”) inwrikken.

### Wanneer wél een maandproduct?

Alleen als je **bewust** infrastructure + OpenAI wilt dragen: bv. **“DevLynx Cloud”** — key niet nodig, alles via jouw API. Dat is **Plan C** (later), niet onderdeel van “zonder onkosten”.

---

## Samenvatting

| | Plan A (nu) | Plan B (aanbevolen kleine shift) |
|---|-------------|----------------------------------|
| BYOK | Ja | Ja (behouden) |
| Jouw OpenAI-kosten | ~0 voor chat | ~0 voor chat |
| Vercel-kosten | Laag; risico bij disconnect-storm | **Nog lager** na polling-cap |
| Pro-verkoop | Gumroad | Gelijk; copy scherper |
| Maandgeld free | Afgeraden | Afgeraden |
| Later groei | — | Optioneel “Cloud” product |

---

*Document: product-/techschets; geen juridisch of fiscaal advies.*
