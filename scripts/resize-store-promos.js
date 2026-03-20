/**
 * Force exact pixel sizes for Chrome Web Store promo assets (after AI export).
 *
 * Usage:
 *   node scripts/resize-store-promos.js
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const dir = path.join(root, 'assets', 'store-mockups');

const jobs = [
  ['promo-marquee-1400x560.png', 1400, 560],
  ['promo-tile-440x280.png', 440, 280],
];

async function resizeOne(name, w, h) {
  const input = path.join(dir, name);
  if (!fs.existsSync(input)) {
    console.warn('Skip (missing):', input);
    return;
  }
  const meta = await sharp(input).metadata();
  const tmp = input + '.tmp.png';
  await sharp(input)
    .resize(w, h, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(tmp);
  fs.renameSync(tmp, input);
  const out = await sharp(input).metadata();
  console.log(name, `${meta.width}×${meta.height} → ${out.width}×${out.height}`);
}

async function main() {
  for (const [name, w, h] of jobs) {
    await resizeOne(name, w, h);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
