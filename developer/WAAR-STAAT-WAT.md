# Waar staat wat – en voor wie

Zie ook **PROJECT-STRUCTURE.md** in de projectroot voor een overzicht van wat wel/niet voor de store is.

---

## 1. Structuur

```
devlens-saas/
├── src/                        Broncode extensie (hier ontwikkel je)
│   ├── manifest.json
│   ├── background.js
│   ├── sidepanel/              panel.html, panel.js, panel.css
│   ├── content/                content.js, content.css
│   ├── options/                options.html, options.js
│   └── icons/
│
├── dist/                       Build-output (obfuscated). Load unpacked = deze map.
├── release/
│   └── devlens-extension.zip   ← Dit upload je naar de Chrome Web Store
│
├── scripts/                    build.js, package.js (npm run build / release)
├── feed-server/                Lokale server (poort 2847), niet in de store
├── website/                    Pricing-pagina, host apart
├── developer/                  Docs (store-teksten, publishing, freemium)
├── assets/                     Screenshots voor docs/store-listing
├── package.json                npm run build / release
├── PROJECT-STRUCTURE.md        Overzicht: wat voor store, wat niet
└── README.md
```

---

## 2. Wat voor de store (free upload)

- Alleen **`release/devlens-extension.zip`** upload je naar de Chrome Web Store.
- Aanmaken: `npm run release` (bouwt vanuit `src/` → `dist/` → zip in `release/`).

---

## 3. Wat niet voor de store

- **src/**, **dist/**, **feed-server/**, **website/**, **developer/**, **assets/**, **scripts/**, **node_modules/** — allemaal lokaal of voor development/docs.

---

## 4. Ontwikkelen

- Wijzigingen in **`src/`**.
- Testen: “Uitgepakte extensie laden” op map **`dist/`** (na `npm run build`) of **`src/`** (zonder obfuscation).
- Server: `feed-server/start-server-with-ai.bat` met eigen `OPENAI_API_KEY` in `.env`.

---

## 5. Gebruiker (na installatie uit de store)

- Extensie uit de store installeren.
- Voor AI: feed-server ergens vandaan halen (bijv. repo of ZIP met alleen `feed-server/`), `.env` met eigen API-key, server starten.
