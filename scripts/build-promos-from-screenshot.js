/**
 * Build Chrome Web Store promos from REAL screenshots (same pixels as your capture).
 *
 * Produces numbered 1280×800 store images + thumbnails + marquee variants + extension cover (1480×560).
 *
 * Marquee left variants follow common store/SaaS promo patterns (split layout, centered hero,
 * faux browser chrome, bento grids, editorial type, ticket/receipt, Swiss grid, tilted card, etc.)
 * — not just palette swaps. See developer.chrome.com/docs/webstore/images.
 *
 * Default sidepanel: assets/screenshot-sidepanel.png
 * Optional: assets/screenshot-contextmenu.png → 06-*
 *
 * Usage:
 *   npm run store-promos:from-screenshot
 *   node scripts/build-promos-from-screenshot.js [sidepanel.png]
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const DEFAULT_INPUT = path.join(root, 'assets', 'screenshot-sidepanel.png');
const CONTEXT_INPUT = path.join(root, 'assets', 'screenshot-contextmenu.png');
const ICON_PATH = path.join(root, 'src', 'icons', 'icon128.png');
const OUT_DIR = path.join(root, 'assets', 'store-mockups');

/** Right strip = extension panel width (tweak if crop misaligned). */
const PANEL_WIDTH_RATIO = 0.32;
const MIN_PANEL_PX = 340;
const MAX_PANEL_PX = 520;

const BG = '#0a0a0f';

/** Same details on every marquee / cover (XML-escaped for SVG). */
const COPY = {
  title: 'DevLynx AI',
  line1: 'Inspect, debug &amp; modify any',
  line2: 'website with AI',
  feat1: 'Explain Element · Error Explainer · API Tester',
  feat2: 'AI Mod Generator · Dev Assistant',
  foot: 'Runs locally — your OpenAI key · localhost',
};

const MARQUEE_LEFT_W = 700;
const MARQUEE_LEFT_H = 560;
const MARQUEE_TOTAL_W = 1400;
/** Extension cover: wide banner, same height as store marquee (560px). */
const COVER_TOTAL_W = 1480;
const COVER_TOTAL_H = 560;
const COVER_LEFT_W = 720;
const COVER_PANEL_W = COVER_TOTAL_W - COVER_LEFT_W;

function extractPanelPipeline(inputPath, meta) {
  const w = meta.width;
  const h = meta.height;
  let panelW = Math.round(w * PANEL_WIDTH_RATIO);
  panelW = Math.min(MAX_PANEL_PX, Math.max(MIN_PANEL_PX, panelW));
  const left = Math.max(0, w - panelW);
  return sharp(inputPath).extract({ left, top: 0, width: Math.min(panelW, w - left), height: h });
}

/**
 * Left half of marquee (700×560) — style 1…10: same copy, different *layout system* (not just hue).
 * @param {number} style 1–10
 */
function marqueeLeftSvg(style) {
  const W = MARQUEE_LEFT_W;
  const H = MARQUEE_LEFT_H;
  const { title, line1, line2, feat1, feat2, foot } = COPY;
  const id = `m${style}`;

  switch (style) {
    case 1: {
      // Editorial + rail (SaaS hero: accent rail, headline, rule) — default store marquee
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="${id}bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#14141f"/><stop offset="100%" stop-color="#06060a"/>
    </linearGradient>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="#fde047"/><stop offset="1" stop-color="#ca8a04"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${id}bg)"/>
  <rect x="0" y="0" width="6" height="${H}" fill="url(#${id}g)"/>
  <rect x="44" y="68" width="140" height="4" rx="2" fill="#fbbf24"/>
  <text x="44" y="128" fill="#facc15" font-size="38" font-family="Arial,Helvetica,sans-serif" font-weight="700">${title}</text>
  <text x="44" y="178" fill="#e2e8f0" font-size="20" font-family="Arial,Helvetica,sans-serif">${line1}</text>
  <text x="44" y="206" fill="#e2e8f0" font-size="20" font-family="Arial,Helvetica,sans-serif">${line2}</text>
  <rect x="44" y="232" width="520" height="1" fill="#475569" opacity="0.5"/>
  <text x="44" y="268" fill="#94a3b8" font-size="14" font-family="Arial,Helvetica,sans-serif">${feat1}</text>
  <text x="44" y="292" fill="#94a3b8" font-size="14" font-family="Arial,Helvetica,sans-serif">${feat2}</text>
  <text x="44" y="348" fill="#64748b" font-size="13" font-family="Arial,Helvetica,sans-serif">${foot}</text>
</svg>`;
    }
    case 2: {
      // Bento / dashboard grid (Notion-style feature blocks)
      const g = 14;
      const x0 = 22;
      const bw = W - 44;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#0c0c12"/>
  <rect x="${x0}" y="22" width="${bw}" height="86" rx="10" fill="#16161f" stroke="#2d2d3a" stroke-width="1"/>
  <rect x="${x0 + bw - 118}" y="36" width="104" height="28" rx="14" fill="#27272f" stroke="#facc15" stroke-width="1"/>
  <text x="${x0 + bw - 82}" y="55" text-anchor="middle" fill="#facc15" font-size="11" font-family="Arial,Helvetica,sans-serif" font-weight="700">LIVE</text>
  <text x="38" y="78" fill="#fafafa" font-size="30" font-family="Arial,Helvetica,sans-serif" font-weight="700">${title}</text>
  <rect x="${x0}" y="${22 + 86 + g}" width="${bw}" height="56" rx="10" fill="#12121a" stroke="#2d2d3a" stroke-width="1"/>
  <text x="38" y="${22 + 86 + g + 36}" fill="#cbd5e1" font-size="17" font-family="Arial,Helvetica,sans-serif">${line1}</text>
  <rect x="${x0}" y="${22 + 86 + g + 56 + g}" width="${bw}" height="56" rx="10" fill="#12121a" stroke="#2d2d3a" stroke-width="1"/>
  <text x="38" y="${22 + 86 + g + 56 + g + 36}" fill="#cbd5e1" font-size="17" font-family="Arial,Helvetica,sans-serif">${line2}</text>
  <rect x="${x0}" y="${22 + 86 + g + 56 + g + 56 + g}" width="${Math.floor(bw / 2) - g / 2}" height="100" rx="10" fill="#14141c" stroke="#2d2d3a" stroke-width="1"/>
  <text x="32" y="${22 + 86 + g + 56 + g + 56 + g + 38}" fill="#94a3b8" font-size="11" font-family="Arial,Helvetica,sans-serif">${feat1}</text>
  <rect x="${x0 + Math.floor(bw / 2) + g / 2}" y="${22 + 86 + g + 56 + g + 56 + g}" width="${Math.floor(bw / 2) - g / 2}" height="100" rx="10" fill="#14141c" stroke="#2d2d3a" stroke-width="1"/>
  <text x="${x0 + Math.floor(bw / 2) + g / 2 + 10}" y="${22 + 86 + g + 56 + g + 56 + g + 38}" fill="#94a3b8" font-size="11" font-family="Arial,Helvetica,sans-serif">${feat2}</text>
  <rect x="${x0}" y="${H - 54}" width="${bw}" height="36" rx="8" fill="#0f0f16" stroke="#334155" stroke-width="1"/>
  <text x="34" y="${H - 30}" fill="#64748b" font-size="11" font-family="Arial,Helvetica,sans-serif">${foot}</text>
</svg>`;
    }
    case 3: {
      // Faux browser window (extension-in-context — store “show the product” pattern)
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#1a1a1e"/>
  <rect x="20" y="24" width="${W - 40}" height="${H - 48}" rx="10" fill="#2b2b30" stroke="#404048" stroke-width="1"/>
  <rect x="20" y="24" width="${W - 40}" height="40" rx="10" fill="#36363e"/>
  <rect x="20" y="54" width="${W - 40}" height="10" fill="#36363e"/>
  <circle cx="40" cy="44" r="5" fill="#ff5f57"/><circle cx="58" cy="44" r="5" fill="#febc2e"/><circle cx="76" cy="44" r="5" fill="#28c840"/>
  <rect x="96" y="34" width="220" height="22" rx="6" fill="#1e1e24"/>
  <text x="108" y="49" fill="#a1a1aa" font-size="11" font-family="Arial,Helvetica,sans-serif">${title}</text>
  <rect x="32" y="78" width="${W - 64}" height="${H - 110}" rx="6" fill="#fafafa"/>
  <text x="48" y="118" fill="#18181b" font-size="32" font-family="Arial,Helvetica,sans-serif" font-weight="700">${title}</text>
  <text x="48" y="158" fill="#3f3f46" font-size="17" font-family="Arial,Helvetica,sans-serif">${line1}</text>
  <text x="48" y="182" fill="#3f3f46" font-size="17" font-family="Arial,Helvetica,sans-serif">${line2}</text>
  <line x1="48" y1="202" x2="${W - 48}" y2="202" stroke="#e4e4e7" stroke-width="1"/>
  <text x="48" y="232" fill="#52525b" font-size="13" font-family="Arial,Helvetica,sans-serif">${feat1}</text>
  <text x="48" y="254" fill="#52525b" font-size="13" font-family="Arial,Helvetica,sans-serif">${feat2}</text>
  <text x="48" y="310" fill="#71717a" font-size="12" font-family="Arial,Helvetica,sans-serif">${foot}</text>
</svg>`;
    }
    case 4: {
      // Centered hero + vignette (App Store / “single focal” promos)
      const cx = W / 2;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <radialGradient id="${id}v" cx="50%" cy="42%" r="65%">
      <stop offset="0%" stop-color="#1e1b4b"/><stop offset="55%" stop-color="#0f0f18"/><stop offset="100%" stop-color="#020204"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${id}v)"/>
  <text x="${cx}" y="112" text-anchor="middle" fill="#e0e7ff" font-size="36" font-family="Arial,Helvetica,sans-serif" font-weight="700">${title}</text>
  <text x="${cx}" y="158" text-anchor="middle" fill="#c7d2fe" font-size="18" font-family="Arial,Helvetica,sans-serif">${line1}</text>
  <text x="${cx}" y="184" text-anchor="middle" fill="#c7d2fe" font-size="18" font-family="Arial,Helvetica,sans-serif">${line2}</text>
  <line x1="${cx - 120}" y1="210" x2="${cx + 120}" y2="210" stroke="#6366f1" stroke-width="2" opacity="0.7"/>
  <text x="${cx}" y="246" text-anchor="middle" fill="#a5b4fc" font-size="13" font-family="Arial,Helvetica,sans-serif">${feat1}</text>
  <text x="${cx}" y="268" text-anchor="middle" fill="#a5b4fc" font-size="13" font-family="Arial,Helvetica,sans-serif">${feat2}</text>
  <text x="${cx}" y="330" text-anchor="middle" fill="#64748b" font-size="12" font-family="Arial,Helvetica,sans-serif">${foot}</text>
</svg>`;
    }
    case 5: {
      // Receipt / ticket (monospace, perforated — distinct from sans layouts)
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#52525b"/>
  <rect x="36" y="28" width="${W - 72}" height="${H - 56}" fill="#fafaf9" stroke="#d4d4d8" stroke-width="1"/>
  <line x1="36" y1="52" x2="${W - 36}" y2="52" stroke="#18181b" stroke-width="2" stroke-dasharray="4 3"/>
  <text x="${W / 2}" y="48" text-anchor="middle" fill="#18181b" font-size="10" font-family="Consolas,Courier New,monospace" letter-spacing="3">DEVLYNX RECEIPT</text>
  <text x="52" y="92" fill="#18181b" font-size="26" font-family="Consolas,Courier New,monospace" font-weight="700">${title}</text>
  <text x="52" y="128" fill="#3f3f46" font-size="14" font-family="Consolas,Courier New,monospace">${line1}</text>
  <text x="52" y="150" fill="#3f3f46" font-size="14" font-family="Consolas,Courier New,monospace">${line2}</text>
  <text x="52" y="188" fill="#52525b" font-size="11" font-family="Consolas,Courier New,monospace">--------------------------------</text>
  <text x="52" y="218" fill="#52525b" font-size="11" font-family="Consolas,Courier New,monospace">${feat1}</text>
  <text x="52" y="238" fill="#52525b" font-size="11" font-family="Consolas,Courier New,monospace">${feat2}</text>
  <text x="52" y="288" fill="#71717a" font-size="10" font-family="Consolas,Courier New,monospace">${foot}</text>
  <circle cx="48" cy="${H - 40}" r="3" fill="#a1a1aa"/><circle cx="68" cy="${H - 40}" r="3" fill="#a1a1aa"/><circle cx="88" cy="${H - 40}" r="3" fill="#a1a1aa"/>
</svg>`;
    }
    case 6: {
      // Swiss / international typographic (thick rules, poster margin)
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#fafafa"/>
  <rect x="0" y="0" width="${W}" height="14" fill="#dc2626"/>
  <text x="${W - 24}" y="96" text-anchor="end" fill="#e5e5e5" font-size="120" font-family="Arial Black,Arial,sans-serif" font-weight="900">AI</text>
  <line x1="32" y1="120" x2="420" y2="120" stroke="#18181b" stroke-width="10"/>
  <text x="32" y="168" fill="#18181b" font-size="34" font-family="Arial Black,Arial,sans-serif" font-weight="900">${title}</text>
  <text x="32" y="210" fill="#27272a" font-size="17" font-family="Arial,Helvetica,sans-serif">${line1}</text>
  <text x="32" y="234" fill="#27272a" font-size="17" font-family="Arial,Helvetica,sans-serif">${line2}</text>
  <rect x="32" y="252" width="8" height="100" fill="#dc2626"/>
  <text x="52" y="278" fill="#3f3f46" font-size="13" font-family="Arial,Helvetica,sans-serif">${feat1}</text>
  <text x="52" y="300" fill="#3f3f46" font-size="13" font-family="Arial,Helvetica,sans-serif">${feat2}</text>
  <text x="32" y="360" fill="#71717a" font-size="12" font-family="Arial,Helvetica,sans-serif">${foot}</text>
</svg>`;
    }
    case 7: {
      // Playful stickers / shapes (consumer apps, Duolingo-class energy)
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#0f172a"/>
  <ellipse cx="160" cy="100" rx="130" ry="55" fill="#facc15" opacity="0.95" transform="rotate(-8 160 100)"/>
  <rect x="320" y="36" width="140" height="56" rx="12" fill="#f472b6" opacity="0.9" transform="rotate(6 390 64)"/>
  <circle cx="580" cy="200" r="70" fill="#22d3ee" opacity="0.25"/>
  <text x="380" y="74" fill="#0f172a" font-size="14" font-family="Arial Black,Arial,sans-serif" font-weight="900" transform="rotate(6 380 74)">BETA</text>
  <text x="48" y="118" fill="#0f172a" font-size="28" font-family="Arial Black,Arial,sans-serif" font-weight="900" transform="rotate(-8 48 118)">${title}</text>
  <text x="44" y="200" fill="#e2e8f0" font-size="18" font-family="Arial,Helvetica,sans-serif">${line1}</text>
  <text x="44" y="226" fill="#e2e8f0" font-size="18" font-family="Arial,Helvetica,sans-serif">${line2}</text>
  <text x="44" y="278" fill="#94a3b8" font-size="14" font-family="Arial,Helvetica,sans-serif">${feat1}</text>
  <text x="44" y="302" fill="#94a3b8" font-size="14" font-family="Arial,Helvetica,sans-serif">${feat2}</text>
  <text x="44" y="360" fill="#64748b" font-size="12" font-family="Arial,Helvetica,sans-serif">${foot}</text>
</svg>`;
    }
    case 8: {
      // Split layout: vertical masthead strip + content column (store “split” pattern)
      const strip = 76;
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#09090b"/>
  <rect x="0" y="0" width="${strip}" height="${H}" fill="#27272a"/>
  <text x="${strip / 2}" y="${H / 2 + 120}" text-anchor="middle" fill="#fafafa" font-size="11" font-family="Arial,Helvetica,sans-serif" letter-spacing="2" transform="rotate(-90 ${strip / 2} ${H / 2})">CHROME EXTENSION</text>
  <line x1="${strip}" y1="0" x2="${strip}" y2="${H}" stroke="#facc15" stroke-width="3"/>
  <text x="${strip + 24}" y="108" fill="#facc15" font-size="34" font-family="Arial,Helvetica,sans-serif" font-weight="700">${title}</text>
  <text x="${strip + 24}" y="162" fill="#e4e4e7" font-size="19" font-family="Arial,Helvetica,sans-serif">${line1}</text>
  <text x="${strip + 24}" y="190" fill="#e4e4e7" font-size="19" font-family="Arial,Helvetica,sans-serif">${line2}</text>
  <rect x="${strip + 24}" y="214" width="520" height="2" fill="#3f3f46"/>
  <text x="${strip + 24}" y="252" fill="#a1a1aa" font-size="14" font-family="Arial,Helvetica,sans-serif">${feat1}</text>
  <text x="${strip + 24}" y="276" fill="#a1a1aa" font-size="14" font-family="Arial,Helvetica,sans-serif">${feat2}</text>
  <text x="${strip + 24}" y="340" fill="#71717a" font-size="12" font-family="Arial,Helvetica,sans-serif">${foot}</text>
</svg>`;
    }
    case 9: {
      // Tilted floating card + shadow (Chrome “tilted” promo style)
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="${id}bg" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="#312e81"/><stop offset="1" stop-color="#0f172a"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#${id}bg)"/>
  <g transform="translate(350 275) rotate(-4) translate(-310 -230)">
    <rect x="58" y="58" width="504" height="384" rx="14" fill="#020617" opacity="0.45"/>
    <rect x="40" y="40" width="504" height="384" rx="14" fill="#f8fafc" stroke="#e2e8f0" stroke-width="2"/>
    <text x="64" y="96" fill="#0f172a" font-size="30" font-family="Arial,Helvetica,sans-serif" font-weight="700">${title}</text>
    <text x="64" y="138" fill="#334155" font-size="17" font-family="Arial,Helvetica,sans-serif">${line1}</text>
    <text x="64" y="162" fill="#334155" font-size="17" font-family="Arial,Helvetica,sans-serif">${line2}</text>
    <line x1="64" y1="182" x2="520" y2="182" stroke="#cbd5e1" stroke-width="1"/>
    <text x="64" y="218" fill="#475569" font-size="13" font-family="Arial,Helvetica,sans-serif">${feat1}</text>
    <text x="64" y="240" fill="#475569" font-size="13" font-family="Arial,Helvetica,sans-serif">${feat2}</text>
    <text x="64" y="300" fill="#64748b" font-size="11" font-family="Arial,Helvetica,sans-serif">${foot}</text>
  </g>
</svg>`;
    }
    case 10: {
      // Typographic poster: giant watermark + layered headline (billboard-style)
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="#030712"/>
  <text x="20" y="200" fill="#1e293b" font-size="96" font-family="Arial Black,Arial,sans-serif" font-weight="900" transform="rotate(-11 350 200)">INSPECT</text>
  <text x="44" y="108" fill="#f8fafc" font-size="11" font-family="Arial,Helvetica,sans-serif" letter-spacing="4">WEB DEV / AI</text>
  <text x="44" y="152" fill="#facc15" font-size="40" font-family="Arial Black,Arial,sans-serif" font-weight="900">${title}</text>
  <text x="44" y="198" fill="#e2e8f0" font-size="19" font-family="Arial,Helvetica,sans-serif">${line1}</text>
  <text x="44" y="224" fill="#e2e8f0" font-size="19" font-family="Arial,Helvetica,sans-serif">${line2}</text>
  <text x="44" y="276" fill="#94a3b8" font-size="14" font-family="Arial,Helvetica,sans-serif">${feat1}</text>
  <text x="44" y="300" fill="#94a3b8" font-size="14" font-family="Arial,Helvetica,sans-serif">${feat2}</text>
  <rect x="44" y="318" width="180" height="3" fill="#facc15"/>
  <text x="44" y="360" fill="#64748b" font-size="12" font-family="Arial,Helvetica,sans-serif">${foot}</text>
</svg>`;
    }
    default:
      return marqueeLeftSvg(1);
  }
}

/**
 * Left strip for extension cover — dense, structured (header, rails, feature rows, trust line).
 * Icon is composited in the framed slot (see main()).
 */
function extensionCoverLeftSvg() {
  const W = COVER_LEFT_W;
  const H = COVER_TOTAL_H;
  const { title, line1, line2, feat1, feat2, foot } = COPY;
  const pad = 22;
  const innerW = W - pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="cvbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f1117"/>
      <stop offset="45%" stop-color="#0a0c12"/>
      <stop offset="100%" stop-color="#06070d"/>
    </linearGradient>
    <linearGradient id="cvgold" x1="0" y1="0" x2="0" y2="1">
      <stop stop-color="#fde047"/><stop offset="1" stop-color="#a16207"/>
    </linearGradient>
    <pattern id="cvgrid" width="24" height="24" patternUnits="userSpaceOnUse">
      <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#ffffff" stroke-opacity="0.04" stroke-width="1"/>
    </pattern>
    <linearGradient id="cvshine" x1="0" y1="0" x2="1" y2="0">
      <stop stop-color="#ffffff" stop-opacity="0.06"/><stop offset="0.35" stop-opacity="0"/><stop offset="1" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#cvbg)"/>
  <rect width="${W}" height="${H}" fill="url(#cvgrid)"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#cvshine)"/>
  <rect x="0" y="0" width="5" height="${H}" fill="url(#cvgold)"/>
  <rect x="0" y="0" width="${W}" height="40" fill="#ffffff" fill-opacity="0.04"/>
  <line x1="0" y1="40" x2="${W}" y2="40" stroke="#ffffff" stroke-opacity="0.08" stroke-width="1"/>
  <text x="${pad}" y="26" fill="#64748b" font-size="9" font-family="Arial,Helvetica,sans-serif" letter-spacing="2.5" font-weight="600">CHROME EXTENSION</text>
  <text x="${W - pad}" y="26" text-anchor="end" fill="#475569" font-size="9" font-family="Arial,Helvetica,sans-serif" letter-spacing="1">STORE LISTING ASSET</text>
  <!-- Icon frame (64×64 icon composited at ${pad},52) -->
  <rect x="${pad}" y="52" width="68" height="68" rx="14" fill="#12141c" stroke="#2d3348" stroke-width="1"/>
  <text x="${pad + 104}" y="84" fill="#facc15" font-size="30" font-family="Arial,Helvetica,sans-serif" font-weight="700">${title}</text>
  <text x="${pad + 104}" y="106" fill="#64748b" font-size="11" font-family="Arial,Helvetica,sans-serif">Inspect · Debug · Modify · AI-assisted</text>
  <line x1="${pad}" y1="118" x2="${W - pad}" y2="118" stroke="#334155" stroke-opacity="0.7" stroke-width="1"/>
  <text x="${pad}" y="142" fill="#e2e8f0" font-size="15" font-family="Arial,Helvetica,sans-serif" font-weight="600">${line1}</text>
  <text x="${pad}" y="162" fill="#e2e8f0" font-size="15" font-family="Arial,Helvetica,sans-serif" font-weight="600">${line2}</text>
  <rect x="${pad}" y="174" width="${innerW}" height="86" rx="8" fill="#ffffff" fill-opacity="0.035" stroke="#3f4556" stroke-width="1"/>
  <text x="${pad + 12}" y="192" fill="#64748b" font-size="8" font-family="Arial,Helvetica,sans-serif" letter-spacing="1.8" font-weight="600">CAPABILITIES</text>
  <text x="${pad + 12}" y="212" fill="#cbd5e1" font-size="11" font-family="Arial,Helvetica,sans-serif">${feat1}</text>
  <line x1="${pad + 12}" y1="222" x2="${W - pad - 12}" y2="222" stroke="#ffffff" stroke-opacity="0.06" stroke-width="1"/>
  <text x="${pad + 12}" y="240" fill="#cbd5e1" font-size="11" font-family="Arial,Helvetica,sans-serif">${feat2}</text>
  <rect x="${pad}" y="268" width="${innerW}" height="50" rx="8" fill="#07080d" stroke="#272e3f" stroke-width="1"/>
  <text x="${pad + 12}" y="290" fill="#64748b" font-size="9" font-family="Arial,Helvetica,sans-serif">${foot}</text>
  <text x="${pad + 12}" y="306" fill="#475569" font-size="8" font-family="Arial,Helvetica,sans-serif">Privacy-first · Local execution · Your keys stay on-device</text>
  <rect x="${pad}" y="${H - 8}" width="${innerW}" height="3" rx="1" fill="#ca8a04" fill-opacity="0.9"/>
</svg>`;
}

async function svgToPng(svgString) {
  return sharp(Buffer.from(svgString, 'utf8')).png().toBuffer();
}

async function padToSize(imgSharp, targetW, targetH) {
  const buf = await imgSharp.png().toBuffer();
  const m = await sharp(buf).metadata();
  const scale = Math.min(targetW / m.width, targetH / m.height);
  const rw = Math.round(m.width * scale);
  const rh = Math.round(m.height * scale);
  const resized = await sharp(buf).resize(rw, rh, { fit: 'inside' }).png().toBuffer();
  const left = Math.floor((targetW - rw) / 2);
  const top = Math.floor((targetH - rh) / 2);
  return sharp({
    create: {
      width: targetW,
      height: targetH,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: resized, left, top }])
    .png({ compressionLevel: 9 });
}

/** Vertical slice of panel (ratios 0–1), then letterbox to 1280×800 — real UI, larger detail. */
async function writePanelSlice(panelBuf, topRatio, heightRatio, filename) {
  const m = await sharp(panelBuf).metadata();
  const top = Math.max(0, Math.floor(m.height * topRatio));
  const h = Math.max(1, Math.floor(m.height * heightRatio));
  const safeH = Math.min(h, m.height - top);
  const slice = await sharp(panelBuf)
    .extract({ left: 0, top, width: m.width, height: safeH })
    .png()
    .toBuffer();
  const out = await padToSize(sharp(slice), 1280, 800);
  await out.toFile(path.join(OUT_DIR, filename));
  console.log('Wrote', filename, `(panel rows ${top}–${top + safeH} of ${m.height})`);
}

async function compositeMarquee(leftPng, rightPanelPng, filename) {
  await sharp({
    create: { width: MARQUEE_TOTAL_W, height: MARQUEE_LEFT_H, channels: 3, background: BG },
  })
    .composite([
      { input: leftPng, left: 0, top: 0 },
      { input: rightPanelPng, left: MARQUEE_LEFT_W, top: 0 },
    ])
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, filename));
  console.log('Wrote', filename);
}

async function main() {
  const inputPath = path.resolve(process.argv[2] || DEFAULT_INPUT);
  if (!fs.existsSync(inputPath)) {
    console.error('Screenshot not found:', inputPath);
    process.exit(1);
  }
  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const meta = await sharp(inputPath).metadata();
  console.log('Source sidepanel:', inputPath, `${meta.width}×${meta.height}`);

  // —— 01: volledige browser + pagina + paneel (exact jouw screenshot) ——
  const fullHero = await padToSize(sharp(inputPath), 1280, 800);
  await fullHero.toFile(path.join(OUT_DIR, '01-full-browser-1280x800.png'));
  console.log('Wrote 01-full-browser-1280x800.png (complete capture)');

  // —— Panel strip ——
  const panel = extractPanelPipeline(inputPath, meta);
  const panelBuf = await panel.png().toBuffer();
  await fs.promises.writeFile(path.join(OUT_DIR, 'panel-crop-from-screenshot.png'), panelBuf);

  // —— 02: heel paneel op 1280×800 ——
  const panelHeroBuf = await (await padToSize(sharp(panelBuf), 1280, 800)).png().toBuffer();
  await sharp(panelHeroBuf).toFile(path.join(OUT_DIR, '02-panel-full-1280x800.png'));
  await sharp(panelHeroBuf).toFile(path.join(OUT_DIR, 'store-screenshot-1280x800.png'));
  console.log('Wrote 02-panel-full-1280x800.png + store-screenshot-1280x800.png (same)');

  // —— 03–05: detail crops van hetzelfde paneel (zelfde pixels, ingezoomd) ——
  await writePanelSlice(panelBuf, 0, 0.42, '03-panel-top-explain-1280x800.png');
  await writePanelSlice(panelBuf, 0.28, 0.48, '04-panel-mid-assistant-1280x800.png');
  await writePanelSlice(panelBuf, 0.52, 0.48, '05-panel-bottom-tools-1280x800.png');

  // —— Thumbnail + tile ——
  const thumb600 = await padToSize(sharp(panelBuf), 600, 600);
  await thumb600.toFile(path.join(OUT_DIR, 'thumbnail-600x600.png'));
  console.log('Wrote thumbnail-600x600.png');

  await sharp(panelBuf)
    .resize(440, 280, { fit: 'cover', position: 'top' })
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'promo-tile-440x280.png'));
  console.log('Wrote promo-tile-440x280.png');

  const rightImg = await sharp(panelBuf)
    .resize(MARQUEE_LEFT_W, MARQUEE_LEFT_H, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  // —— 10 marquee stijlen + default bestand = stijl 1 (rijke classic) ——
  for (let s = 1; s <= 10; s++) {
    const leftPng = await svgToPng(marqueeLeftSvg(s));
    const name = `promo-marquee-style-${String(s).padStart(2, '0')}-1400x560.png`;
    await compositeMarquee(leftPng, rightImg, name);
  }
  const defaultLeft = await svgToPng(marqueeLeftSvg(1));
  await compositeMarquee(defaultLeft, rightImg, 'promo-marquee-1400x560.png');

  // —— Extension cover 1280×800: branding +zelfde details + echt paneel ——
  const coverLeft = await svgToPng(extensionCoverLeftSvg());
  const coverPanel = await sharp(panelBuf)
    .resize(COVER_PANEL_W, COVER_TOTAL_H, { fit: 'cover', position: 'top' })
    .png()
    .toBuffer();

  const coverLayers = [
    { input: coverLeft, left: 0, top: 0 },
    { input: coverPanel, left: COVER_LEFT_W, top: 0 },
  ];

  if (fs.existsSync(ICON_PATH)) {
    const iconSize = 56;
    const iconLeft = 22 + Math.floor((68 - iconSize) / 2);
    const iconTop = 52 + Math.floor((68 - iconSize) / 2);
    const iconBuf = await sharp(ICON_PATH)
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    coverLayers.push({ input: iconBuf, left: iconLeft, top: iconTop });
  }

  await sharp({
    create: { width: COVER_TOTAL_W, height: COVER_TOTAL_H, channels: 3, background: BG },
  })
    .composite(coverLayers)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT_DIR, 'extension-cover-1480x560.png'));
  console.log('Wrote extension-cover-1480x560.png');

  // —— 06: contextmenu-screenshot ——
  if (fs.existsSync(CONTEXT_INPUT)) {
    const cm = await sharp(CONTEXT_INPUT).metadata();
    console.log('Source context menu:', CONTEXT_INPUT, `${cm.width}×${cm.height}`);
    const ctxHero = await padToSize(sharp(CONTEXT_INPUT), 1280, 800);
    await ctxHero.toFile(path.join(OUT_DIR, '06-context-menu-1280x800.png'));
    console.log('Wrote 06-context-menu-1280x800.png');
  } else {
    console.log('Skip 06 (optional):', CONTEXT_INPUT, 'not found');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
