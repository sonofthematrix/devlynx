# Features backlog (post-launch)

Status legenda:

| Status | Betekenis |
|--------|-----------|
| `idea` | Concept / nog geen ontwerp |
| `research` | Haalbaarheid of scope nog open |
| `planned` | Bewust gekozen volgende stap |
| `live` | Beschikbaar in product — alleen dan in store copy |

---

## Master tabel

| Feature | Status | Waarom | Opmerking |
|---------|--------|--------|-----------|
| Performance audit automation | planned | Hoge vraag bij frontend devs | Start klein: CWV + uitleg; geen Lighthouse-claim tenzij echt geïntegreerd |
| Security scanner (extension context) | research | Differentiator | Heuristiek + educatie; geen “100% secure” |
| Visualregressie / screenshot baseline | idea | Sterk voor UI teams | Baseline-opslag + privacy |
| Multi-page workflow analysis | idea | Agencies / grotere sites | Start met handmatige URL-lijst |
| Code generation met page context | planned | Verbetert modus/code-gen kwaliteit | CSS vars / design tokens uit DOM waar mogelijk |
| Auto-documentation (JSDoc / README snippets) | idea | Tijdsbesparing | Bouwt voort op bestaande AI-output |
| Dependency insights | research | Vaak geen directe toegang tot `node_modules` in extensie | Eventueel “plak package.json / build stats” flow |
| Shareable reports | planned | Team / virality | Export eerst Markdown; juridiek privacy |
| AI tutorials bij errors | idea | Learning + retentie | Later; contentkwaliteit kritisch |
| Custom AI workflows / saved prompts | planned | Power users | Goede fit met huidige panel |
| Team collaboration / shared sessions | idea | Enterprise-pad | Backend + auth nodig |

---

## Phase-mapping (quick reference)

- **Phase 2 candidates:** performance MVP, security heuristiek MVP, custom workflows, code-gen context, shareable reports (licht).
- **Phase 3 candidates:** visual regression, multi-page crawl v2, collaboration, zware enterprise.

Zie [ROADMAP-NL.md](ROADMAP-NL.md) voor volledige beschrijving.
