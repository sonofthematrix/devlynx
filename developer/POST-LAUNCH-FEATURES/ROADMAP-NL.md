# Post-launch roadmap (intern — niet in Chrome Web Store copy)

Dit document bevat planning **na** launch.
**Niet** copiëren naar store listing zolang features niet live en getest zijn.

---

## Pricing strategy — Option 2: Early Adopter Versioning

**Decision (2026-03-28):** Use early-adopter pricing framing. Never get stuck with a permanent low price.

| Phase | Price | What's included |
|-------|-------|-----------------|
| Launch now | $35.99 (early adopter) | All current Pro features — lifetime |
| Phase 2 ships | Raise to $59–69 | Phase 2 features for new buyers; existing lifetime holders keep what they bought |
| Pro+ tier (future) | New tier, new price | Phase 3 features; existing Pro buyers get discount on upgrade, never cut off |

**Rules:**
- Existing lifetime buyers keep their features forever — no broken promises
- "Lifetime" = lifetime of features they purchased, not infinite future features
- New major tiers are new products; early adopters get upgrade discounts
- Communicate on Gumroad: "Locking in early adopter price — goes up after X sales"
- Set a threshold in Gumroad (e.g. 100 sales) or a hard date to trigger price increase

---

## Fasen (samenvatting)

| Fase | Periode | Focus |
|------|---------|--------|
| **Phase 1 — Huidig** | nu | Explain Element, error capture + explain, API tester, mod generator / code gen, screenshot, Dev Assistant, BYOK |
| **Phase 2 — Quick wins** | ~3–6 mnd | Performance insights, security scanning, documentatie-helper, code-gen met page context |
| **Phase 3 — Enterprise / diepgang** | ~6–12 mnd | Visual regression, multi-page workflows, team collaboration (als businesscase klopt) |

---

## Hoog-impact toevoegingen (backlog-detail)

### 1. Visual regression detection

- Screenshot huidige staat → vergelijk met baseline (visueel/AI-assisted diff-concept).
- Flag verschillen (padding, kleuren, layout shift).
- Gebruikersvraag: “Waarom ziet dit er anders uit dan gisteren?”

**Risico/complexiteit:** baseline-opslag, privacy, storage-limieten — eerst klein MVP (handmatige baseline per site).

### 2. Performance audit automation

- One-click performance-analyse (niet alleen “run Lighthouse handmatig”).
- Core Web Vitals signalen + uitleg.
- Bundle size inzicht waar technisch haalbaar vanuit extensie context.
- Voorbeelduitkomst: “Deze wijziging lijkt LCP te vertragen met ~X ms” (als metingen dat ondersteunen).

### 3. Security scanner (extension-gericht)

- Mogelijke blootstelling van API keys in console / network hints (heuristisch).
- CSP / checklist-hints in **Chrome extension context** (MV3, geen valse garanties).
- Waarschuwingen bij riskante patterns (“token in log”, etc.) — altijd als **advies**, geen juridische claim.

### 4. Multi-page workflows

- Meerdere URLs analyseren (consistentie, meta, broken links op beperkte diepte).
- Voorbeeld: contact vs home styling/meta drift.

**Scope:** begin met “handmatige URL-lijst” i.p.v. full site crawl v1.

---

## Quick wins (laaghangend fruit)

### 5. Code generation met page context

- “Genereer component dat past bij **deze** pagina” — extract relevante CSS tokens/variabelen kleur/sizing waar mogelijk.
- Output compacter en bruikbaarder dan generieke ChatGPT-antwoorden.

### 6. Auto-documentation

- JSDoc-blok genereren op basis van selectie of AI-antwoord.
- README-snippet genereren voor kleine features/modules.

### 7. Dependency management (research)

- Bundle footprint / alternatieven — grotendeels **alleen** bruikbaar met extra context (build output, package.json op disk is vaak buiten extensie).
- Eventueel: “plak je package.json fragment” → AI analyse (geen live npm audit claims zonder echte integratie).

---

## Marketing- / growth-features

### 8. Shareable reports

- Export (Markdown/PDF/link) van performance/debug sessies.
- Team-deelbaar — pas als data privacy helder is.

### 9. AI-powered tutorials

- Bij errors: korte “waarom + link naar uitleg” / mini-lesson.
- Interactieve lessen zijn zwaarder — later.

---

## Technical differentiators (later)

### 10. Real-time collaboration

- Gedeelde debug-sessie, wie kijkt waarnaar.
- Vereist backend + auth + juridiek kader.

### 11. Custom AI workflows

- Opgeslagen prompts per flow (“altijd errors met MV3-context uitleggen”).
- Goede synergie met bestaand panel; relatief haalbaar als Phase 2-item.

---

## Post-launch prioriteit (aanbevolen volgorde)

1. **User feedback structureren** (wat missen mensen echt — 10 interviews / form).
2. **Performance audit MVP** — hoogste verwachte vraag bij webdev-publiek.
3. **Security scanner MVP** — klein, duidelijk differentiator **als** voorzichtig gecommuniceerd (geen “100% secure” taal).

---

## Launch checklist (aanvulling)

### Pre-launch (nu)

- Features testen op **10+** echte sites (SPA, static, third-party heavy errors).
- Bundle/performance panel (laadtijd, geen onnodige netwerkcalls).
- Error handling + duidelijke status (server, key, trial).
- Onboarding: eerste 60 seconden “wat moet ik doen” duidelijk.

### Post-launch (backlog)

- Lichtgewicht analytics (privacy-first) of feature-request kanaal.
- Regelmatige gebruikersinterviews na eerste 100 installs.

---

## Store-veiligheid (herhaling)

**Niet** beloven in de store tot live:

- Visual regression, multi-page crawl, team collaboration, enterprise SAML, “security scan guarantees”, dependency vulnerability scanning zonder echte data source.

---

## Productrichting (één zin)

**The AI pair programmer that lives in your browser** — met echte **page context** + **extension-native** uitleg, niet alleen chat.

Zie ook: [FEATURES-BACKLOG.md](FEATURES-BACKLOG.md), [MONETIZATION-IDEAS-NL.md](MONETIZATION-IDEAS-NL.md).
