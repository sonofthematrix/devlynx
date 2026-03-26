/**
 * Zet LICENSE_JWT_PRIVATE_KEY (als echte PEM met newlines) op het klembord — voor plakken in Vercel.
 * Windows: volledig geautomatiseerd. Anders: schrijf naar stdout.
 *
 * npm run jwt:copy-for-vercel
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const envPath = path.join(__dirname, '..', 'feed-server', '.env');
if (!fs.existsSync(envPath)) {
  console.error('Geen feed-server/.env — kopieer eerst .env.example naar feed-server/.env');
  process.exit(1);
}
const t = fs.readFileSync(envPath, 'utf8');
const m = t.match(/^\s*LICENSE_JWT_PRIVATE_KEY=(.+)$/m);
if (!m) {
  console.error('Geen LICENSE_JWT_PRIVATE_KEY in feed-server/.env. Run: npm run gen:license-jwt-keys');
  process.exit(1);
}
let v = m[1].trim();
if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
  v = v.slice(1, -1);
}
v = v.replace(/\\n/g, '\n');

if (process.platform === 'win32') {
  const tmp = path.join(os.tmpdir(), `devlynx-jwt-${Date.now()}.txt`);
  try {
    fs.writeFileSync(tmp, v, 'utf8');
    const safe = tmp.replace(/'/g, "''");
    execSync(
      `powershell -NoProfile -Command "Get-Content -Raw -Encoding UTF8 '${safe}' | Set-Clipboard"`,
      { stdio: 'inherit' }
    );
    console.log('');
    console.log('OK — private key staat op je klembord.');
    console.log('Vercel → Project → Settings → Environment Variables → LICENSE_JWT_PRIVATE_KEY → plak → Save → Redeploy.');
    console.log('');
  } finally {
    try {
      fs.unlinkSync(tmp);
    } catch (_) {}
  }
} else {
  console.log('(Klembord: op macOS kun je zelf `pbcopy` gebruiken; hier de PEM:)\n');
  console.log(v);
}
