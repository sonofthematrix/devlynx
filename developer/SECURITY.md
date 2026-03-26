# Security – DevLynx AI (Chrome Store project)

Overzicht van wat er aan security aanwezig is.

---

## 1. Extensie (src/ → dist/ → release zip)

| Onderdeel | Status |
|-----------|--------|
| **Content Security Policy (CSP)** | Aanwezig in `manifest.json`: `script-src 'self'; object-src 'self';` – alleen eigen scripts, geen externe/inline scripts. |
| **API key** | Nooit in de extensie. Alleen op de lokale server in `feed-server/.env`. |
| **Communicatie** | Extensie praat alleen met `http://127.0.0.1:2847` (lokaal). Geen andere servers. |
| **Permissions** | Minimale set: tabs, activeTab, storage, downloads, contextMenus, scripting; host_permissions voor `<all_urls>` (nodig voor content script op willekeurige pagina’s). |

---

## 2. Feed-server (lokaal)

| Onderdeel | Status |
|-----------|--------|
| **API key** | Alleen in `feed-server/.env`. Bestand staat in `.gitignore`; komt niet in de store-zip (die bevat alleen de gebouwde extensie uit `dist/`). |
| **Binding** | Server luistert op `127.0.0.1` (localhost). Geen luisteren op het netwerk. |
| **OpenAI** | Verzoeken naar OpenAI gaan via HTTPS (api.openai.com); key alleen in servergeheugen, niet in extensie of logs. |
| **Input** | Screenshot-bestandsnaam wordt gesaneerd (`[^a-zA-Z0.9._-]` → `_`). JSON-body wordt geparsed met try/catch. |
| **CORS** | `Access-Control-Allow-Origin: *` voor lokale ontwikkeling. Server is alleen op localhost bereikbaar. |

---

## 3. Build & release

| Onderdeel | Status |
|-----------|--------|
| **Store-zip** | `npm run release` maakt **release/devlens-extension.zip** uit **dist/** (alleen de extensie). Geen feed-server, geen `.env`, geen secrets. |
| **.gitignore** | In `feed-server/`: `.env`, `node_modules/`, `screenshots/`. |

---

## 4. Aanbevelingen voor gebruikers

- **.env** nooit committen of delen; lokaal houden.
- Server alleen lokaal gebruiken (standaard: 127.0.0.1).
- OpenAI key alleen in `feed-server/.env` zetten; nergens anders.

---

**Samenvatting:** API keys en gevoelige data zitten alleen lokaal op de server; de extensie heeft een expliciete CSP en praat alleen met localhost. Geen telemetrie; data gaan niet naar DevLynx.
