# GUMROAD-PAGE-COPY — Internal reference

> **Internal use only.** This file is the source of truth for what goes on the Gumroad product page.
> Dashboard URL: https://sonofthematrix.gumroad.com/l/devlynx-ai
>
> **Part 1** (below) = internal notes, checklist, pricing strategy — NOT for Gumroad.
> **Part 2** = copy-paste ready content — paste directly into Gumroad, nothing else needed.

---

## Part 1 — Internal notes

### Dashboard checklist

1. **Product name** → **DevLynx AI Pro** (consistent everywhere — listing, receipts, license emails)
2. **License keys** → turn ON so buyers receive a key after purchase
3. **Product ID** → copy from Gumroad into `feed-server/.env` as `GUMROAD_PRODUCT_ID=...`
4. **URL** → `https://sonofthematrix.gumroad.com/l/devlynx-ai` — matches the `GUMROAD_URL` in `src/sidepanel/panel.js`
5. **Price** → $19 USD (one-time, early adopter) — raise to $35–49 after first 100 sales or set a deadline
6. **Cover image** → use `assets/store-mockups/thumbnail-600x600.png`

### Pricing strategy — Early Adopter Versioning

Current price ($19) is the early adopter rate:

- "You're locking in the lowest price" — creates urgency without lying
- Set a threshold in Gumroad: price goes up after 100 sales (or set a hard date)
- When Phase 2 ships (performance audit, shareable reports, custom workflows): raise to $35–49
- When Phase 3 / Pro+ tier launches: existing lifetime Pro buyers keep current features; new tier is priced separately
- Existing buyers are never cut off — they keep everything they bought, forever

---

## Part 2 — Copy-paste ready (Gumroad)

---

### Product name

DevLynx AI Pro

---

### Tagline

DevLynx AI – Pro: Inspect, debug & modify any website with AI. Early adopter price — lifetime updates included.

---

### Description

**DevLynx AI** is an AI-powered Chrome extension that lets you inspect, debug, and modify any website — directly from your browser, without switching tools.

---

### ✅ Free features (no license required)

• **AI Dev Assistant** – Ask any dev question (code, extensions, debugging). Answers appear right in the panel.
• **AI Mod Generator** – Describe what you want to change → AI generates CSS/JS and injects it live on the page. Mods are saved per site.
• **Custom CSS** – Write and apply your own CSS to any page instantly.
• **Click-to-Edit** – Click any element on the page to edit its text, color, or hide it — no DevTools needed.
• **API Tester** – Send API requests directly from the extension context, designed to reduce CORS friction that blocks normal browser tabs. Works on any origin you're debugging.
• **Context Menu** – Right-click selected text → Ask AI or Generate code. Result appears in the panel.

---

### ⭐ Pro features (requires license)

• **AI Explain Element** – Click any element on a webpage and get a full AI explanation: what it is, why it's there, its CSS, DOM structure, and actionable tips.
• **Error Explainer** – One click to capture console errors from the page (including fetch/XHR failures logged to console). AI gives a short explanation and a concrete fix suggestion. Note: raw DevTools Network tab entries are not auto-captured — paste those manually if needed.

---

### 🔒 Privacy first

Your OpenAI API key stays in the extension on your device — it is never sent to DevLynx servers. The extension contacts our API only for license verification and trial enforcement. No browsing data collected, no telemetry.

---

**Early adopter pricing — $19.** You're locking in the lowest price this product will ever be. The price goes up as features ship. One-time purchase — no subscription, lifetime updates for all current Pro features.

---

### 🗺️ What's coming — public roadmap

We're building DevLynx AI in the open. Here's what's planned for early adopters:

**Now (v1 — what you're buying today)**
✓ AI Explain Element
✓ Error Explainer (console errors; incl. fetch/XHR when logged to console)
✓ AI Mod Generator
✓ Dev Assistant
✓ API Tester
✓ Click-to-Edit
✓ Custom CSS
✓ Context Menu

**Phase 2 — planned next**
⚡ Performance audit — Core Web Vitals analysis with AI explanation right in the panel
⚡ Security hints — detect exposed tokens, risky patterns in console/network traffic
⚡ Shareable debug reports — export your session as Markdown or PDF, share with your team
⚡ Code generation with real page context — AI pulls your site's actual CSS tokens and design vars, not generic output
⚡ Custom AI workflows — save your own prompts and flows for repeated tasks

**Phase 3 — bigger builds**
🔭 Visual regression — screenshot baseline per site, AI-assisted diff to catch UI changes
🔭 Multi-page analysis — compare headers, styling, meta across multiple URLs at once
🔭 Team workspace — shared debug sessions and reports (requires backend, later)

*Roadmap is directional — timing and scope may change based on what users need most.*

**Early adopters lock in today's price AND get Pro features as they ship in Phase 2.**
The price will increase with each phase. There is no better time to get in than now.

---

### What you get

• Lifetime Pro license for DevLynx AI Chrome extension
• AI Explain Element — click any element for a full AI breakdown
• Error Explainer — capture console errors (incl. fetch/XHR failures), get AI fix
• All free features: Dev Assistant, AI Mod Generator, Custom CSS, Click-to-Edit, API Tester, Context Menu
• Phase 2 Pro features as they ship — performance audit, security hints, shareable reports, code-gen with page context
• Your OpenAI API key stays local — full privacy
• License key by email; enter in extension Options
• Early adopter price — goes up as features ship, never goes down for existing buyers
