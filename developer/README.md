# Developer / publisher only

This folder is **not for end users**. Use it for publishing and internal docs.

| File | Purpose |
|------|---------|
| **STORE-LISTING.md** | Store submission text (Chrome Web Store / Edge). |
| **BROWSERS.md** | Supported browsers (Chrome, Edge, Opera, Brave, Vivaldi) and how to load unpacked in each. |
| **WAAR-STAAT-WAT.md** | Project structure overview. |
| **GEBRUIKSAANWIJZING.md** | Full user guide (Dutch). |
| **PUBLISHING.md** | How to publish (incl. store screenshots & promo-PNG’s, §4 — output in `assets/store-mockups/`). |
| **SECURITY.md**, **SUMMARY.md**, **EXAMPLES.md**, **OPERA-ICON.md** | Additional docs. |

Do not include the **developer** folder in the end-user ZIP or store package.

**Store upload:** Upload alleen **release/devlens-extension.zip** (maak aan met `npm run release`). De manifest verwacht **icons/icon128.png** (128×128); staat in `src/icons/` en komt in de build. Zie **PROJECT-STRUCTURE.md** en **PUBLISHING.md**.
