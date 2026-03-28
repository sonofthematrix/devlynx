/**
 * build-brand-assets.js
 * Generates: new icon SVG + PNGs, premium promo cover 1480×560, tile 440×280
 * Puts everything in assets/store-mockups/ and src/icons/
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ICONS_OUT = path.join(ROOT, 'src', 'icons');
const MOCKUPS = path.join(ROOT, 'assets', 'store-mockups');
const ICONS_COPY = path.join(ROOT, 'assets', 'icons');

[ICONS_OUT, MOCKUPS, ICONS_COPY].forEach(d => fs.mkdirSync(d, { recursive: true }));

// ─── ICON SVG ────────────────────────────────────────────────────────────────
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <defs>
    <radialGradient id="bg" cx="42%" cy="38%" r="65%">
      <stop offset="0%" stop-color="#1a1050"/>
      <stop offset="60%" stop-color="#0d0b28"/>
      <stop offset="100%" stop-color="#06060f"/>
    </radialGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe566"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="gold2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="100%" stop-color="#facc15"/>
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="glow2">
      <feGaussianBlur stdDeviation="6" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Background -->
  <rect width="128" height="128" rx="22" fill="url(#bg)"/>

  <!-- Very subtle gold border -->
  <rect width="128" height="128" rx="22" fill="none" stroke="#facc15" stroke-width="2" opacity="0.25"/>

  <!-- Outer triangle (bold stroke, filled gold) -->
  <path d="M64 16 L112 106 L16 106 Z"
        fill="none" stroke="url(#gold)" stroke-width="7"
        stroke-linejoin="round" stroke-linecap="round"
        filter="url(#glow)" opacity="0.95"/>

  <!-- Eye almond - horizontal slit on dark bg -->
  <path d="M36 70 Q64 50 92 70 Q64 90 36 70 Z"
        fill="#07070f" opacity="0.95"/>

  <!-- Eye outline (gold) -->
  <path d="M36 70 Q64 50 92 70 Q64 90 36 70 Z"
        fill="none" stroke="url(#gold2)" stroke-width="2.5" opacity="0.8"/>

  <!-- Iris glow -->
  <circle cx="64" cy="70" r="14" fill="url(#gold)" filter="url(#glow2)" opacity="0.4"/>

  <!-- Iris solid -->
  <circle cx="64" cy="70" r="12" fill="url(#gold)"/>

  <!-- Vertical cat-slit pupil (lynx!) -->
  <ellipse cx="64" cy="70" rx="3.5" ry="10" fill="#05050d"/>

  <!-- Pupil glint -->
  <ellipse cx="68" cy="65" rx="2.5" ry="3.5" fill="#fef9c3" opacity="0.75"/>
</svg>`;

fs.writeFileSync(path.join(ICONS_OUT, 'icon.svg'), iconSvg);
console.log('✓ icon.svg written');

// ─── ICON PNGs ───────────────────────────────────────────────────────────────
async function makeIconPng(size) {
  const buf = await sharp(Buffer.from(iconSvg))
    .resize(size, size)
    .png()
    .toBuffer();
  const name = `icon${size}.png`;
  fs.writeFileSync(path.join(ICONS_OUT, name), buf);
  fs.writeFileSync(path.join(ICONS_COPY, name), buf);
  console.log(`✓ icon${size}.png`);
}

// ─── PROMO COVER 1480×560 ────────────────────────────────────────────────────
async function makePromoCover() {
  const W = 1480, H = 560;

  // Left panel: dark background with gold text
  const leftSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bggrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0a0820"/>
      <stop offset="50%" stop-color="#07070f"/>
      <stop offset="100%" stop-color="#050510"/>
    </linearGradient>
    <linearGradient id="goldtxt" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffe566"/>
      <stop offset="100%" stop-color="#facc15"/>
    </linearGradient>
    <radialGradient id="glow1" cx="20%" cy="50%" r="40%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="80%" cy="50%" r="40%">
      <stop offset="0%" stop-color="#d97706" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#d97706" stop-opacity="0"/>
    </radialGradient>
    <filter id="soft">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    <filter id="iconfx">
      <feGaussianBlur stdDeviation="8" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- BG -->
  <rect width="${W}" height="${H}" fill="url(#bggrad)"/>
  <rect width="${W}" height="${H}" fill="url(#glow1)"/>
  <rect width="${W}" height="${H}" fill="url(#glow2)"/>

  <!-- Subtle grid lines -->
  <g stroke="#facc15" stroke-width="0.5" opacity="0.04">
    ${Array.from({length: 20}, (_, i) => `<line x1="${i*80}" y1="0" x2="${i*80}" y2="${H}"/>`).join('')}
    ${Array.from({length: 10}, (_, i) => `<line x1="0" y1="${i*70}" x2="${W}" y2="${i*70}"/>`).join('')}
  </g>

  <!-- Gold accent bar top -->
  <rect x="80" y="88" width="52" height="3" rx="2" fill="#facc15" opacity="0.9"/>

  <!-- DEVLYNX AI wordmark -->
  <text x="80" y="210" font-family="'Segoe UI', Arial, sans-serif" font-size="82" font-weight="800"
        letter-spacing="-2" fill="white">DevLynx</text>
  <text x="80" y="300" font-family="'Segoe UI', Arial, sans-serif" font-size="82" font-weight="800"
        letter-spacing="-2" fill="url(#goldtxt)">AI</text>

  <!-- Tagline -->
  <text x="80" y="368" font-family="'Segoe UI', Arial, sans-serif" font-size="26" font-weight="400"
        fill="#94a3b8" letter-spacing="0.5">
    Inspect · Debug · Modify any website
  </text>

  <!-- Feature pills -->
  <rect x="80" y="410" width="180" height="36" rx="18" fill="#facc15" fill-opacity="0.12" stroke="#facc15" stroke-width="1" stroke-opacity="0.4"/>
  <text x="170" y="433" font-family="'Segoe UI', Arial, sans-serif" font-size="15" font-weight="600"
        fill="#facc15" text-anchor="middle">AI Explain Element</text>

  <rect x="274" y="410" width="176" height="36" rx="18" fill="#facc15" fill-opacity="0.12" stroke="#facc15" stroke-width="1" stroke-opacity="0.4"/>
  <text x="362" y="433" font-family="'Segoe UI', Arial, sans-serif" font-size="15" font-weight="600"
        fill="#facc15" text-anchor="middle">Error Explainer</text>

  <rect x="464" y="410" width="152" height="36" rx="18" fill="#facc15" fill-opacity="0.12" stroke="#facc15" stroke-width="1" stroke-opacity="0.4"/>
  <text x="540" y="433" font-family="'Segoe UI', Arial, sans-serif" font-size="15" font-weight="600"
        fill="#facc15" text-anchor="middle">AI Mod Generator</text>

  <!-- One-time purchase badge -->
  <rect x="80" y="478" width="226" height="38" rx="8" fill="#facc15" fill-opacity="0.08" stroke="#facc15" stroke-width="1" stroke-opacity="0.3"/>
  <text x="193" y="502" font-family="'Segoe UI', Arial, sans-serif" font-size="14" font-weight="500"
        fill="#facc15" text-anchor="middle" opacity="0.85">One-time purchase · Lifetime updates</text>

  <!-- Right side: giant stylized eye / logo -->
  <g transform="translate(960, 90)" opacity="0.85">
    <!-- Outer glow triangle -->
    <path d="M200 30 L380 340 L20 340 Z"
          fill="none" stroke="#facc15" stroke-width="4"
          stroke-linejoin="round" opacity="0.25" filter="url(#soft)"/>
    <!-- Triangle -->
    <path d="M200 30 L380 340 L20 340 Z"
          fill="none" stroke="#facc15" stroke-width="3.5"
          stroke-linejoin="round" opacity="0.8"/>

    <!-- Eye -->
    <path d="M90 225 Q200 165 310 225 Q200 285 90 225 Z"
          fill="#08080f"/>
    <path d="M90 225 Q200 165 310 225 Q200 285 90 225 Z"
          fill="none" stroke="#facc15" stroke-width="2" opacity="0.7"/>

    <!-- Iris glow -->
    <circle cx="200" cy="225" r="48" fill="#facc15" opacity="0.12" filter="url(#soft)"/>
    <!-- Iris -->
    <circle cx="200" cy="225" r="40" fill="#facc15"/>
    <!-- Cat-slit pupil -->
    <ellipse cx="200" cy="225" rx="11" ry="36" fill="#06060f"/>
    <!-- Glint -->
    <ellipse cx="213" cy="210" rx="8" ry="11" fill="white" opacity="0.45"/>
  </g>

  <!-- Divider line right side -->
  <line x1="920" y1="60" x2="920" y2="${H-60}" stroke="#facc15" stroke-width="1" opacity="0.08"/>

  <!-- Bottom gold line -->
  <rect x="0" y="${H-3}" width="${W}" height="3" fill="#facc15" opacity="0.6"/>
</svg>`;

  const coverBuf = await sharp(Buffer.from(leftSvg)).png().toBuffer();
  fs.writeFileSync(path.join(MOCKUPS, 'promo-cover-1480x560.png'), coverBuf);
  console.log('✓ promo-cover-1480x560.png');
}

// ─── TILE 440×280 ────────────────────────────────────────────────────────────
async function makeTile() {
  const W = 440, H = 280;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0e0c24"/>
      <stop offset="100%" stop-color="#06060e"/>
    </linearGradient>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe566"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="gl"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <rect width="${W}" height="${H}" rx="8" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" rx="8" fill="none" stroke="#facc15" stroke-width="1.5" opacity="0.2"/>

  <!-- Glow orb -->
  <circle cx="330" cy="140" r="100" fill="#7c3aed" opacity="0.12" filter="url(#gl)"/>
  <circle cx="330" cy="140" r="80"  fill="#d97706" opacity="0.10" filter="url(#gl)"/>

  <!-- Triangle icon small -->
  <path d="M330 60 L400 185 L260 185 Z"
        fill="none" stroke="url(#g)" stroke-width="2.5"
        stroke-linejoin="round" opacity="0.7"/>
  <!-- Eye -->
  <path d="M286 142 Q330 118 374 142 Q330 166 286 142 Z"
        fill="#07070e"/>
  <circle cx="330" cy="142" r="16" fill="url(#g)"/>
  <ellipse cx="330" cy="142" rx="4.5" ry="14" fill="#06060e"/>
  <ellipse cx="336" cy="135" rx="3" ry="4.5" fill="white" opacity="0.4"/>

  <!-- Text -->
  <text x="32" y="110" font-family="'Segoe UI',Arial,sans-serif" font-size="36" font-weight="800"
        fill="white">DevLynx</text>
  <text x="32" y="154" font-family="'Segoe UI',Arial,sans-serif" font-size="36" font-weight="800"
        fill="#facc15">AI</text>
  <text x="32" y="192" font-family="'Segoe UI',Arial,sans-serif" font-size="14" font-weight="400"
        fill="#94a3b8">Inspect · Debug · Modify</text>
  <rect x="32" y="215" width="40" height="2.5" rx="1.5" fill="#facc15" opacity="0.8"/>
  <text x="32" y="250" font-family="'Segoe UI',Arial,sans-serif" font-size="12" font-weight="500"
        fill="#facc15" opacity="0.7">Chrome Extension · One-time Pro</text>

  <!-- Gold bottom strip -->
  <rect x="0" y="${H-3}" width="${W}" height="3" rx="0" fill="#facc15" opacity="0.55"/>
</svg>`;

  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(path.join(MOCKUPS, 'promo-tile-440x280.png'), buf);
  console.log('✓ promo-tile-440x280.png');
}

// ─── THUMBNAIL 600×600 ───────────────────────────────────────────────────────
async function makeThumbnail() {
  const S = 600;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <defs>
    <radialGradient id="bg" cx="45%" cy="42%" r="65%">
      <stop offset="0%" stop-color="#1e1260"/>
      <stop offset="60%" stop-color="#0d0b28"/>
      <stop offset="100%" stop-color="#060610"/>
    </radialGradient>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffe566"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <linearGradient id="g2" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fef3c7"/>
      <stop offset="100%" stop-color="#facc15"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="14" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="sofglow"><feGaussianBlur stdDeviation="28"/></filter>
  </defs>

  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <rect width="${S}" height="${S}" fill="none" stroke="#facc15" stroke-width="2" opacity="0.2"/>

  <!-- Background glow -->
  <circle cx="300" cy="280" r="200" fill="#7c3aed" opacity="0.1" filter="url(#sofglow)"/>
  <circle cx="300" cy="280" r="150" fill="#d97706"  opacity="0.08" filter="url(#sofglow)"/>

  <!-- Big triangle -->
  <path d="M300 80 L510 460 L90 460 Z"
        fill="none" stroke="url(#g)" stroke-width="10"
        stroke-linejoin="round" stroke-linecap="round"
        filter="url(#glow)" opacity="0.9"/>

  <!-- Eye -->
  <path d="M140 310 Q300 230 460 310 Q300 390 140 310 Z"
        fill="#08080f"/>
  <path d="M140 310 Q300 230 460 310 Q300 390 140 310 Z"
        fill="none" stroke="url(#g2)" stroke-width="3.5" opacity="0.75"/>

  <!-- Iris glow halo -->
  <circle cx="300" cy="310" r="72" fill="#facc15" opacity="0.12" filter="url(#sofglow)"/>
  <!-- Iris -->
  <circle cx="300" cy="310" r="58" fill="url(#g)"/>
  <!-- Cat-slit pupil -->
  <ellipse cx="300" cy="310" rx="16" ry="52" fill="#06060e"/>
  <!-- Glint -->
  <ellipse cx="317" cy="292" rx="11" ry="16" fill="white" opacity="0.5"/>

  <!-- DevLynx AI text -->
  <text x="300" y="518" font-family="'Segoe UI',Arial,sans-serif" font-size="48" font-weight="800"
        fill="white" text-anchor="middle" letter-spacing="-1">DevLynx <tspan fill="#facc15">AI</tspan></text>
</svg>`;

  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  fs.writeFileSync(path.join(MOCKUPS, 'thumbnail-600x600.png'), buf);
  console.log('✓ thumbnail-600x600.png');
}

// ─── CONSOLIDATE: copy icons to assets/icons/ ────────────────────────────────
function consolidate() {
  // Move loose screenshots from assets/ root into store-mockups
  const loose = ['screenshot-contextmenu.png', 'screenshot-sidepanel.png'];
  const assetsRoot = path.join(ROOT, 'assets');
  loose.forEach(f => {
    const src = path.join(assetsRoot, f);
    if (fs.existsSync(src)) {
      fs.renameSync(src, path.join(MOCKUPS, f));
      console.log(`✓ moved ${f} → store-mockups/`);
    }
  });
}

// ─── RUN ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    await Promise.all([16, 32, 48, 128].map(makeIconPng));
    await makePromoCover();
    await makeTile();
    await makeThumbnail();
    consolidate();

    console.log('\n✅ Done. Files:');
    console.log('  src/icons/         → icon.svg + icon16/32/48/128.png (for extension)');
    console.log('  assets/icons/      → copies of all icon PNGs (one-stop reference)');
    console.log('  assets/store-mockups/ → promo-cover-1480x560.png, promo-tile-440x280.png,');
    console.log('                          thumbnail-600x600.png + all existing mockups');
    console.log('\nGumroad store copy: developer/GUMROAD-PAGE-COPY.md');
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
