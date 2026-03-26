/**
 * Generate RS256 key pair for LICENSE_JWT_PRIVATE_KEY (server) + DEVLYNX_LICENSE_JWT_PUBLIC_PEM (extension).
 * Run from repo root: node scripts/gen-license-jwt-keys.js
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const repoRoot = path.join(__dirname, '..');
const envPath = path.join(repoRoot, 'feed-server', '.env');
const pubJsPath = path.join(repoRoot, 'src', 'license-jwt-public.js');

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

if (!fs.existsSync(envPath)) {
  console.error('Missing feed-server/.env — copy feed-server/.env.example first.');
  process.exit(1);
}

let env = fs.readFileSync(envPath, 'utf8');
env = env.replace(/^\s*LICENSE_JWT_PRIVATE_KEY=.*\r?\n?/gm, '');
env = env.replace(/\r\n/g, '\n').replace(/\n+$/, '');
const oneLine = privateKey.trim().replace(/\n/g, '\\n');
env +=
  '\n\n# RS256 trial/license JWT (/trial-token, /trial-consume) — do not commit\n' +
  `LICENSE_JWT_PRIVATE_KEY="${oneLine}"\n`;
fs.writeFileSync(envPath, env);

// Mirror private key to repo root `.env` so you can copy to Vercel without opening gitignored feed-server/.env.
const rootEnvPath = path.join(repoRoot, '.env');
if (fs.existsSync(rootEnvPath)) {
  let rootEnv = fs.readFileSync(rootEnvPath, 'utf8');
  rootEnv = rootEnv.replace(/^\s*LICENSE_JWT_PRIVATE_KEY=.*\r?\n?/gm, '');
  rootEnv = rootEnv.replace(/\r\n/g, '\n').replace(/\n+$/, '');
  rootEnv +=
    '\n\n# Mirrors feed-server/.env — same value for Vercel (LICENSE_JWT_PRIVATE_KEY). Do not commit.\n' +
    `LICENSE_JWT_PRIVATE_KEY="${oneLine}"\n`;
  fs.writeFileSync(rootEnvPath, rootEnv);
  console.log('OK: root .env updated with same LICENSE_JWT_PRIVATE_KEY (for easy copy to Vercel).');
}

let pubJs = fs.readFileSync(pubJsPath, 'utf8');
const pubBlock = `global.DEVLYNX_LICENSE_JWT_PUBLIC_PEM = \`${publicKey.trim()}\`;`;
if (!/global\.DEVLYNX_LICENSE_JWT_PUBLIC_PEM = /.test(pubJs)) {
  console.error('Unexpected license-jwt-public.js format.');
  process.exit(1);
}
pubJs = pubJs.replace(/global\.DEVLYNX_LICENSE_JWT_PUBLIC_PEM = '[^']*';/, pubBlock);
pubJs = pubJs.replace(/global\.DEVLYNX_LICENSE_JWT_PUBLIC_PEM = `[^`]*`;/, pubBlock);
fs.writeFileSync(pubJsPath, pubJs);

console.log('OK: feed-server/.env has LICENSE_JWT_PRIVATE_KEY; src/license-jwt-public.js has public PEM.');
console.log('Next: copy LICENSE_JWT_PRIVATE_KEY from root .env (or feed-server/.env) to Vercel; npm run build:prod (or release).');
