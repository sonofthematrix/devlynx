# Gebruiksaanwijzing DevLynx AI

## 1. Extensie laden

1. Open Chrome of Edge → `chrome://extensions` (of Opera → `opera://extensions`).
2. Zet **Ontwikkelaarsmodus** aan.
3. Klik **Uitgepakte extensie laden**.
4. Kies de map **dist** (na `npm run build`) of **src** (ontwikkelversie, leesbare code). Beide bevatten o.a. `manifest.json`.

## 2. Extensie in de werkbalk (pin)

Als je het icoon van DevLynx in de werkbalk wilt zien:

- Klik op het **puzzelstuk** (Chrome/Edge) of **kubus** (Opera) bij de adresbalk.
- Zoek **DevLynx AI**.
- Klik op het **pin-icoon** naast DevLynx AI zodat de extensie in de werkbalk blijft staan.

## 3. Server starten (nodig voor AI en “Connected”)

1. Ga in dit project naar de map **feed-server**.
2. Zorg dat er een bestand **.env** is met je OpenAI-key:  
   `OPENAI_API_KEY=sk-jouw-key`
3. Start de server: dubbelklik **start-server-with-ai.bat** (of in een terminal: `node server-with-ai.js`).
4. Laat het venster open. In het panel van de extensie zou nu **Connected** moeten staan.

## 4. Als het panel “Disconnected” toont of “127.0.0.1 refused to connect”

**Oorzaak:** De server draait niet, of het venster is dicht.

- Start **start-server-with-ai.bat** in de map **feed-server**.
- **Laat het zwarte venster open.** Als je het sluit, stopt de server en krijg je “refused to connect” in Opera.
- In dat venster moet je zien: `DevLynx AI feed server (with AI) http://127.0.0.1:2847`. Zie je dat niet, dan is de server niet gestart (bijv. poort al in gebruik).
- Vernieuw daarna de pagina of open het panel opnieuw; klik op de status om opnieuw te verbinden.

**Firewall/antivirus:** Als de server wél draait maar je toch “refused” ziet: sta Node.js of “Command Prompt” toe in je firewall. In Windows Firewall: “Allow an app” → zoek Node.js of cmd en vink het aan voor Particulier netwerk.
