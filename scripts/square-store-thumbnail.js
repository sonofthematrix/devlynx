/**
 * Force exact square PNG (Chrome Web Store / promos).
 * AI exports are often not pixel-perfect 1:1.
 *
 * Usage:
 *   node scripts/square-store-thumbnail.js [inputPath] [edgePx]
 * Default: assets/store-mockups/thumbnail-600x600.png → 600×600 (overwrites file, backs up once)
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const defaultInput = path.join(root, 'assets', 'store-mockups', 'thumbnail-600x600.png');
const input = path.resolve(process.argv[2] || defaultInput);
const size = Math.max(64, Math.min(4096, parseInt(process.argv[3] || '600', 10) || 600));
const backupPath = input.replace(/\.png$/i, '-original.png');

async function main() {
  if (!fs.existsSync(input)) {
    console.error('Input not found:', input);
    process.exit(1);
  }
  const meta = await sharp(input).metadata();
  console.log('Input:', input, `→ ${meta.width}×${meta.height}`);

  if (meta.width === size && meta.height === size) {
    console.log('Already exact', size, '×', size, '— nothing to do.');
    return;
  }

  if (!fs.existsSync(backupPath)) {
    fs.copyFileSync(input, backupPath);
    console.log('Backup saved:', backupPath);
  }

  const tmp = input + '.tmp.png';
  await sharp(input)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .png({ compressionLevel: 9 })
    .toFile(tmp);

  fs.renameSync(tmp, input);

  const outMeta = await sharp(input).metadata();
  console.log('Output:', input, `→ ${outMeta.width}×${outMeta.height} (exact square — OK for store upload)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
