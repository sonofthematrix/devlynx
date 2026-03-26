# Cursor Memory — plakken (ZenStack + dit project)

Kopieer het blok hieronder naar **Cursor → Memory** (of “Save to memory”) zodat het in alle chats terugkomt.

---

**Memory-tekst (Engels aanbevolen voor Cursor):**

> **devlens-saas:** Chrome extension in `src/`/`dist/`; feed API in `feed-server/` (Vercel). License signing uses `scripts/gen-license-jwt-keys.js`, `src/license-jwt-public.js`, and env `LICENSE_JWT_PRIVATE_KEY` — not ZenStack. If adding **ZenStack v3**, use a **separate package folder** (e.g. `packages/data/`), run `zenstack`/`zenstack@next` **init only there**, never inside `src/`. See `.cursor/rules/zenstack-v3-init.mdc` and `developer/ZENSTACK-V3.md`.

---

**Nederlandse variant:**

> **devlens-saas:** Extensie `src/`/`dist/`, feed `feed-server/`. JWT voor Pro/trial = `gen-license-jwt-keys` + `license-jwt-public.js`, los van ZenStack. ZenStack v3 alleen in een **eigen submap** met eigen `package.json`, init niet in `src/`. Zie `.cursor/rules/zenstack-v3-init.mdc`.
