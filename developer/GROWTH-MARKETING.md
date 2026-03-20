# DevLynx AI – Growth & marketing (Product Hunt, GitHub, Reddit)

## Chrome Web Store SEO
- Zie `CHROME-WEB-STORE-DESCRIPTION.md` voor titel + lange beschrijving met keywords (**inspect element**, **web debugging**, **developer tools**, **modify website**, **AI dev assistant**, **frontend debugging**, **DOM inspector**).
- Manifest `name` / `description` in `src/manifest.json` zijn afgestemd op korte SEO.

## Product Hunt
- Post **DevLynx AI** op [Product Hunt](https://www.producthunt.com/).
- **Voorbeeldtitel:** DevLynx AI – Debug and modify any website with AI  
- **Categorieën:** Developer Tools, AI Tools  
- Link naar Chrome Web Store + korte demo (GIF/video) verhoogt conversie.

## GitHub (`devlynx-ai` repo)
Maak een publieke repo met o.a.:
- **README** – wat het is, screenshots, install (extensie + feed-server), features  
- **screenshots/** – store + GitHub social preview  
- **feed-server** – of link naar monorepo  

Daarna (respectvol, geen spam) delen in:
- r/webdev  
- r/programming (check subreddit rules)  
- r/Frontend  
- r/chrome  

Veel extensies halen eerste gebruikers via **Reddit + GitHub**.

## Reviews in de extensie
Na **10 succesvolle AI-gebruiken** toont de sidepanel een prompt **“Rate DevLynx AI on Chrome Web Store”**.  
Meer reviews → betere ranking in de store.

**Na publicatie:** zet in `src/sidepanel/panel.js` de constante `CHROME_WEB_STORE_REVIEW_URL` op je echte review-URL, bv.  
`https://chromewebstore.google.com/detail/<slug>/<EXTENSION_ID>/reviews`  
Zolang de placeholder `REPLACE_WITH_EXTENSION_ID` staat, opent de knop de store-zoekpagina voor “DevLynx AI”.
