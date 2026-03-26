/**
 * Copy LICENSE_JWT_PRIVATE_KEY from feed-server/.env → root .env (same line as gen script writes).
 * Use when root .env is out of sync or you can't open gitignored feed-server/.env in the editor.
 */
const fs = require('fs');
const path = require('path');

const repoRoot = path.join(__dirname, '..');
const feedPath = path.join(repoRoot, 'feed-server', '.env');
const rootPath = path.join(repoRoot, '.env');

if (!fs.existsSync(feedPath)) {
  console.error('Missing feed-server/.env');
  process.exit(1);
}
if (!fs.existsSync(rootPath)) {
  console.error('Missing root .env — create from .env.example or copy feed-server/.env manually.');
  process.exit(1);
}

const feed = fs.readFileSync(feedPath, 'utf8');
const m = feed.match(/^\s*LICENSE_JWT_PRIVATE_KEY=(.*)$/m);
if (!m) {
  console.error('No LICENSE_JWT_PRIVATE_KEY in feed-server/.env — run npm run gen:license-jwt-keys first.');
  process.exit(1);
}
const line = `LICENSE_JWT_PRIVATE_KEY=${m[1].trim()}`;

let rootEnv = fs.readFileSync(rootPath, 'utf8');
rootEnv = rootEnv.replace(/^\s*LICENSE_JWT_PRIVATE_KEY=.*\r?\n?/gm, '');
rootEnv = rootEnv.replace(/\r\n/g, '\n').replace(/\n+$/, '');
rootEnv +=
  '\n\n# Mirrors feed-server/.env — same value for Vercel (LICENSE_JWT_PRIVATE_KEY). Do not commit.\n' +
  line +
  '\n';
fs.writeFileSync(rootPath, rootEnv);
console.log('OK: root .env LICENSE_JWT_PRIVATE_KEY synced from feed-server/.env');
