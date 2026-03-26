# Verify License werkt niet — checklist

## 1. Juiste extensie-build
- **Load unpacked** → map **`dist/`** na `npm run build:prod` (niet `src/`).
- Na JWT-rotatie: opnieuw builden; public key in `src/license-jwt-public.js` moet bij de private op Vercel horen.

## 2. Vercel-omgeving
- **`GUMROAD_PRODUCT_ID`** = exact het **product-ID** uit Gumroad (productpagina / API), voor **hetzelfde** product als waar de key gekocht is. **Niet** de license key uit de mail — zie **`developer/GUMROAD-PRODUCT-VS-LICENSE-NL.md`**.
- Lokaal testen: `npm run check:gumroad-product` (en optioneel met echte key als argument).
- **`LICENSE_JWT_PRIVATE_KEY`** gezet op **Production** + **Redeploy** na wijziging.
- Fout van Gumroad (in de UI): meestal *“license does not exist for the provided product”* → verkeerd **product_id** op Vercel of key van ander product.

## 3. Servercode
- Deploy moet **`POST /verify-license`** bevatten die een **`license_token`** teruggeeft na geldige Gumroad-check (zie `feed-server/server-with-ai.js`).

## 4. Timeout
- Verify gebruikt nu **45s** timeout (Vercel cold start + Gumroad). Oude builds hadden 5s en konden “niet bereikbaar” tonen terwijl de server traag was.

## 5. Debug in Chrome
- Sidepanel open → **F12** → **Console** → zoek `[devlynx-debug] verify` na op Verify te klikken.
- **Network**-tab: request naar `.../verify-license` → response body (`ok`, `valid`, `error`, `license_token`).

## 6. Handmatige test (server)
```bash
curl -sS -X POST "https://JOUW-FEED/verify-license" \
  -H "Content-Type: application/json" \
  -d "{\"license_key\":\"JOUW_KEY\",\"device_id\":\"test-device\",\"extension_id\":\"test-ext\"}"
```
Verwacht bij succes: `"valid":true` en `"license_token":"eyJ..."`.
