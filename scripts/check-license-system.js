/**
 * Snelle health van lokale license-config (geen netwerk naar jouw Vercel).
 * - PEM parse
 * - Gumroad product_id probe tegen api.gumroad.com
 *
 * npm run check:license-system
 */
const { spawnSync } = require('child_process');
const path = require('path');

const node = process.execPath;
const root = path.join(__dirname, '..');

function run(script) {
  const r = spawnSync(node, [path.join(__dirname, script)], {
    cwd: root,
    stdio: 'inherit'
  });
  return r.status === 0;
}

console.log('=== 1/2 LICENSE_JWT_PRIVATE_KEY (PEM in .env) ===\n');
const pemOk = run('check-env-pem.js');
console.log('\n=== 2/2 GUMROAD_PRODUCT_ID (Gumroad API) ===\n');
const gumOk = run('check-gumroad-product.js');

if (!pemOk || !gumOk) {
  process.exit(1);
}
console.log('\n=== Klaar: lokale checks geslaagd. Vercel + dist/build nog apart verifiëren. ===\n');
