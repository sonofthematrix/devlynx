/**
 * One-off: validate LICENSE_JWT_PRIVATE_KEY in feed-server/.env and root .env parse as PEM.
 * Run: node scripts/check-env-pem.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repo = path.join(__dirname, '..');
for (const rel of ['feed-server/.env', '.env']) {
  const full = path.join(repo, rel);
  if (!fs.existsSync(full)) {
    console.log(rel + ': missing');
    continue;
  }
  const t = fs.readFileSync(full, 'utf8');
  const m = t.match(/LICENSE_JWT_PRIVATE_KEY="([\s\S]*?)"/);
  if (!m) {
    console.log(rel + ': no LICENSE_JWT_PRIVATE_KEY');
    continue;
  }
  const pem = m[1].replace(/\\n/g, '\n');
  try {
    crypto.createPrivateKey(pem);
    console.log(rel + ': LICENSE_JWT_PRIVATE_KEY PEM OK');
  } catch (e) {
    console.log(rel + ': PEM INVALID —', e.message);
  }
}
