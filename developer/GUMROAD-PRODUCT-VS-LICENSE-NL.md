# Gumroad: product-ID vs license key

| | **GUMROAD_PRODUCT_ID** (server `.env` + Vercel) | **License key** (koper / extensie) |
|---|-----------------------------------------------|-------------------------------------|
| **Wat** | ID van het **product** in Gumroad | Unieke key per **aankoop** |
| **Vorm** | Vaak UUID, bv. `9a8e8852-…` | Vaak korter, soms met `=` (base64-achtig) |
| **Waar vandaan** | Gumroad → product → delen / API / productpagina-instellingen | E-mail / downloadpagina na aankoop |
| **Waar invullen** | `feed-server/.env`, **Vercel env** | Veld **Verify License** in de extensie |

**Fout die vaak gebeurt:** de **license key** per ongeluk in `GUMROAD_PRODUCT_ID` zetten — dat werkt niet.

## Automatische check

Vanaf projectroot (internet nodig):

```bash
npm run check:gumroad-product
```

Met optioneel je echte key (alleen lokaal in terminal):

```bash
npm run check:gumroad-product -- "jouw-license-key"
```

Alles + JWT-PEM:

```bash
npm run check:license-system
```

Zie ook `developer/VERIFY-LICENSE-TROUBLESHOOTING-NL.md`.
