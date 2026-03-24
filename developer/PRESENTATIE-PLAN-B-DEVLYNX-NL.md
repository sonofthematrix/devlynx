<!--
  DevLynx AI — presentatie Plan B (product + kosten)
  Gebruik: import in Google Slides / PowerPoint, of Marp (VS Code extension "Marp for VS Code")
  Slide-scheiding: --- tussen secties (Marp), of kopieer elke ##-sectie als nieuwe slide.
-->

# DevLynx AI

## Plan B — Product, prijs & lage kosten

**Voorstel in het kort**  
Doelgroep · prijs · techniek · Vercel · wat we wél / niet doen

---

## 1. Doelgroep

- **Studenten** — leren, prototypes, weinig budget
- **Freelancers** — snelheid, minder zoekwerk
- **Beginners** — uitleg, errors, API’s begrijpen

**Belofte:** één extensie voor inspect, debug, API-test en AI-hulp op elke site.

---

## 2. Het probleem dat we oplossen

- Te veel **losse tools** (DevTools, Postman, docs, ChatGPT… constant wisselen)
- **Errors en DOM** zijn intimiderend voor beginners
- **Freelancers** willen **minuten** winnen, geen nieuwe abonnements-jungle

**DevLynx** bundelt dat in **één zijpaneel** in de browser.

---

## 3. Hoe het nu werkt (technisch, kort)

| Onderdeel | Rol |
|-----------|-----|
| **Extensie** | UI + BYOK: grote AI-chat gaat met **jouw OpenAI-key** → **direct OpenAI** |
| **Feed (Vercel)** | Licenties, trial, health, **screenshots** (Blob) — **geen** chat-tokens namens jou |
| **Pro (Gumroad)** | Ontgrendelt **premium features** (o.a. Explain Element, Error Explainer, unlimited t.o.v. trial) |

→ **Jij** betaalt **geen OpenAI** per gratis gebruiker op die chat-flow.

---

## 4. Plan B — Productkeuzes

1. **Free blijft €0** — sterke intro, trial + eigen key
2. **Pro = eenmalige betaling** (geen verplicht maandbedrag voor “niet-Pro”)
3. **BYOK blijft** — schaalbaar zonder dat **wij** massaal tokens betalen
4. **Later optioneel:** apart product **“Cloud AI”** (dan pas server-key + maandprijs)

---

## 5. Prijs Pro (voorstel)

| Doelgroep | Realistische eenmalige prijs |
|-----------|------------------------------|
| Student / beginner / freelancer | **€29 – €35** |
| **Aanbevolen instapprijs** | **€32 of €35** |

**Waarom:** onder de “uurloon”-drempel voor freelancers; haalbaar voor studenten; geen race-to-the-bottom van €9.

**Gumroad:** launch-korting mogelijk; **“lifetime updates”** vermelden bij eenmalig.

---

## 6. Waarom geen maandgeld voor Free?

- Developer-gewoonte: **gratis tool + eigen API-key** is normaal
- **“Betalen om de basis te gebruiken”** zonder nieuwe waarde → slechte reviews
- **Pro** is de duidelijke upgrade; geen dubbel psychologisch obstakel

---

## 7. Kosten voor jou (exploitant)

| Post | Met BYOK + huidige architectuur |
|------|----------------------------------|
| **OpenAI (server)** | **~0** voor massa-chat — user betaalt eigen key |
| **Vercel** | Functions + (licht) Blob — **vooral traffic-patroon** bepalend |
| **Gumroad** | Alleen **% op verkochte Pro** |

**Conclusie:** variabele AI-kosten voor free users **niet** het risico — **onnodige API-requests** wél.

---

## 8. Vercel laag houden — drie pijlers

1. **Geen nutteloze polls**  
   Lang **Disconnected** → nu elke **5 s** retry → kan **exploderen**.  
   **Voorstel:** max pogingen + backoff; hervatten bij **klik** of **panel heropenen**.

2. **Licentie / trial**  
   Alleen wanneer nodig; **verify** blijft gecached (bijv. 6 uur).

3. **Blob**  
   Screenshots + trial-JSON beperkt; geen automatische bulk-uploads.

---

## 9. Wat we bewust niet doen (in Plan B)

- **Niet** alle chat naar de server verplaatsen **zonder** prijsmodel  
  → Dan betaal **jij** OpenAI per gebruiker

- **Niet** “free tier” maandelijks factureren alleen voor toegang

---

## 10. Roadmap (techniek — klein & snel)

| Stap | Inspanning | Effect |
|------|------------|--------|
| Polling-cap / backoff in panel | **Klein** (hoofdzakelijk `panel.js`) | Veel minder Vercel-calls bij outage |
| UI-copy: “AI = jouw key; Pro = features” | Klein | Minder verwarring, betere reviews |
| Store / privacy-tekst afgestemd op BYOK | Klein | Snellere review |

**Grote refactor** alleen als je bewust **Cloud AI** product lanceert.

---

## 11. Is het “het waard” voor de gebruiker?

- **€29–35 eenmalig** voor wie de tool **dagelijks** of **wekelijks** gebruikt: **ja**, als **Free** echt waarde levert (trial + tools).
- **Freelancer:** één bespaarde uur = al terugverdiend.
- **Jij als maker:** haalbaar **als** onboarding + support klopt — markt is druk, **positionering** is leidend.

---

## 12. Samenvatting

| Punt | Keuze |
|------|--------|
| **Free** | €0, trial + BYOK |
| **Pro** | **€29–35** eenmalig (richting **€32–35**) |
| **OpenAI-kosten jou** | **Geen** massa-chat op jouw key |
| **Vercel** | Laag door **minder polling** + sobere endpoints |
| **Later** | Optioneel **Cloud AI** tegen maandprijs |

---

## 13. Volgende stap

1. **Implementeren:** disconnect-polling begrenzen (`panel.js`)
2. **Gumroad:** prijs + copy “eenmalig / lifetime updates”
3. **Store listing:** BYOK + feed-URL + permissies uitleggen

---

*Interne presentatie — geen juridisch/financieel advies.*

**Bestand:** `developer/PRESENTATIE-PLAN-B-DEVLYNX-NL.md`
