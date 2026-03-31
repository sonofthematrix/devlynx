# DevLynx — Roadmap & Marketing Strategy

Source of truth for website copy, Gumroad listings, and product direction.

---

## Positioning

**One line:** DevLynx builds browser extensions that make your dev workflow faster — AI debugging, SEO audits, product filling, and store submissions from your sidebar.

**Why buy now:** Early adopter pricing. One-time payment, lifetime updates. Price goes up as features ship.

**Core differentiators:**
- Real page context — not generic AI chat
- Persistent side panel — stays open while you browse
- BYOK OpenAI — your key, your billing, stays local
- Built for dev workflows, not content/marketing use cases

---

## Products & Pricing

| Product | Status | Price | Gumroad slug |
|---------|--------|-------|--------------|
| DevLynx AI | **Live** | $19 one-time | `devlynx-ai` |
| DevLynx SEO | Coming soon | $19 one-time | `devlynx-seo` |
| DevLynx Fill | Coming soon | $29 one-time | `devlynx-fill` |
| DevLynx Ship | Coming soon | $19 one-time | `devlynx-ship` |
| DevLynx Bundle | When all 4 live | $59 (save $27) | `devlynx-bundle` |

All sold via `store.devlynx.dev` (CNAME → Gumroad).

---

## DevLynx AI — Gumroad copy

**Title:** DevLynx AI: Explain, Debug & Modify Websites

**Tagline:** AI developer toolkit in your browser sidebar. Explain elements, debug errors, modify pages, test APIs — on any website.

**Short description (Gumroad summary):**
DevLynx AI lives in your browser's side panel. Click any element for an AI explanation, paste a stack trace for fix hints, generate CSS/JS mods, or run an HTTP API tester — all without leaving the tab.

Free includes core tools + 20 AI trial uses. Pro ($19 one-time) unlocks unlimited AI for Explain Element, Error Explainer, and Mod Generator. Lifetime updates. BYOK OpenAI.

**What's included:**
- AI Explain Element — click any element, get a clear explanation
- Error Explainer — paste errors, get AI fix hints
- AI Dev Assistant — ask anything about JS, CSS, browser APIs
- AI Mod Generator — describe a change, get CSS/JS for the page
- API Tester (CORS-free) — GET/POST/PUT/DELETE from the panel
- Screenshot capture from the panel
- Context menu shortcuts on any page

**Pricing block:**
- Free: core tools + 20 shared AI trial uses
- Pro — $19 one-time: unlimited AI features, lifetime updates, early adopter price

**FAQ:**
- *Do I need an API key?* Yes — add your OpenAI key in the panel (BYOK). Your key stays local in your browser.
- *Does the price go up?* Yes. $19 is the early adopter price. It will increase as Phase 2 features ship.
- *What counts as "unlimited"?* No per-use cap on Pro AI features. Standard OpenAI rate limits and your own usage costs still apply (BYOK).

---

## Roadmap

### Now (Live)
- DevLynx AI — Explain Element, Error Explainer, Dev Assistant, Mod Generator, API Tester, Screenshot

### Q2 2026 — Coming Soon
- DevLynx SEO — instant SEO audit, score, meta/heading/alt-text analysis
- DevLynx Fill — AI product filler for e-commerce (titles, descriptions, meta)
- DevLynx Ship — Chrome/Edge/Opera store submission autopilot

### Phase 2 — DevLynx AI (3–6 months post-launch)
- Performance audit — Core Web Vitals + AI explanation
- Security scanner — detect API keys/tokens in console/network, CSP hints
- Code generation with page context — extract CSS tokens from DOM for smarter mods
- Saved prompts / custom AI workflows
- Export debug sessions to Markdown

### Phase 3 — DevLynx AI (6–12 months)
- Visual regression / screenshot baseline per site
- Multi-page workflow analysis
- Team sessions (needs backend + auth)

### Bundle
- All 4 extensions, one license — $59 (save $27 vs buying separately)
- Available when all 4 are live

---

## Website sections (devlynx.dev)

### Hero tagline
Browser extensions that make your dev workflow faster.

### Sub-tagline
AI debugging, SEO audits, product filling, and store submissions — all from your browser sidebar. One-time payment. Lifetime updates.

### Social proof hook (below hero)
"Early adopter pricing — price goes up as features ship."

### Roadmap section heading
What's coming

### CTA copy
- Primary: "Get Pro — $19" (DevLynx AI)
- Secondary: "Notify me" (coming soon products)
- Bundle: "Save $27 with the bundle — coming soon"

---

## Notes for Gumroad setup
- Store domain: `store.devlynx.dev` (CNAME → domains.gumroad.com, Cloudflare proxy OFF)
- All products: one-time payment, no subscription
- Enable license keys for all Pro products (used for JWT validation in extension)
- Set license key limit: 3 devices per key (90-day rolling window)
- Support email: support@devlynx.dev
