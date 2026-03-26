/**
 * Controleer of Gumroad-verify klopt voor feed-server/.env.
 * Roept POST https://api.gumroad.com/v2/licenses/verify aan.
 *
 * Zelfde logica als feed-server/server-with-ai.js:
 * als GUMROAD_PRODUCT_PERMALINK gezet is → product_permalink; anders product_id.
 *
 * npm run check:gumroad-product
 * npm run check:gumroad-product -- "jouw-license-key"
 * npm run check:gumroad-product -- --permalink devlynx-ai "jouw-license-key"
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const repoRoot = path.join(__dirname, '..');
const envPath = path.join(repoRoot, 'feed-server', '.env');

function stripEnvValue(s) {
  if (!s || typeof s !== 'string') return '';
  s = s.trim().replace(/\r$/, '');
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1);
  }
  return s.trim();
}

function readEnvFile() {
  if (!fs.existsSync(envPath)) {
    console.error('Geen feed-server/.env');
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, 'utf8');
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function readEnvLine(content, name) {
  const m = content.match(new RegExp(`^\\s*${name}=(.*)$`, 'm'));
  return m ? stripEnvValue(m[1]) : '';
}

function parseCli() {
  const args = process.argv.slice(2);
  let cliPermalink = '';
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--permalink' && args[i + 1]) {
      cliPermalink = args[i + 1].trim();
      i++;
      continue;
    }
    if (a.startsWith('--permalink=')) {
      cliPermalink = a.slice('--permalink='.length).trim();
      continue;
    }
    rest.push(a);
  }
  return { cliPermalink, licenseKey: rest[0] || '' };
}

function postVerify({ productId, permalink, licenseKey }) {
  const form = new URLSearchParams();
  if (permalink) {
    form.append('product_permalink', permalink);
  } else {
    form.append('product_id', productId);
  }
  form.append('license_key', licenseKey);
  form.append('increment_uses_count', 'false');
  const body = form.toString();

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.gumroad.com',
        port: 443,
        path: '/v2/licenses/verify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => resolve({ status: res.statusCode, data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function explainLicenseNotFound(usedPermalink, usedProductId) {
  console.log(`
Wat Gumroad hier feitelijk zegt: deze license_key hoort niet bij dit product (product_id / product_permalink).

Checklist (in Gumroad, zelf verifiëren):
1. License key: exact uit de mail / download voor **dit** product (geen spaties, volledige string).
2. Product: de key is uitgegeven voor hetzelfde product als je URL/slug (bijv. …/l/devlynx-ai).
3. product_id in .env: exact wat Gumroad voor **dit** product toont (niet door elkaar halen met license key).
4. Alternatief: zet alleen GUMROAD_PRODUCT_PERMALINK=slug (stuk na /l/ in de product-URL), en laat GUMROAD_PRODUCT_ID leeg — zelfde keuze als op Vercel.

Huidige modus in dit script:`);
  if (usedPermalink) {
    console.log(`   product_permalink="${usedPermalink}"`);
  } else {
    console.log(`   product_id (eerste + laatste 4 tekens): ${maskId(usedProductId)}`);
  }
}

function maskId(id) {
  if (!id || id.length < 10) return '(te kort om te tonen)';
  return `${id.slice(0, 4)}…${id.slice(-4)} (${id.length} tekens)`;
}

async function main() {
  const content = readEnvFile();
  const envProductId = readEnvLine(content, 'GUMROAD_PRODUCT_ID');
  const envPermalink = readEnvLine(content, 'GUMROAD_PRODUCT_PERMALINK');
  const { cliPermalink, licenseKey } = parseCli();

  const permalink = (cliPermalink || envPermalink || '').trim();
  const productId = (envProductId || '').trim();

  if (!permalink && !productId) {
    console.error('Geen GUMROAD_PRODUCT_ID en geen GUMROAD_PRODUCT_PERMALINK in feed-server/.env (minstens één nodig).');
    process.exit(1);
  }

  const usePermalink = !!permalink;
  const modeLabel = usePermalink
    ? `product_permalink="${permalink}"`
    : `product_id=${productId.length} tekens (${maskId(productId)})`;
  console.log('Modus (zoals server):', modeLabel);
  if (cliPermalink) console.log('   (permalink via CLI overschrijft .env voor deze run)');

  const probeKey = '__devlynx_invalid_probe_key__';
  console.log('\n→ Gumroad verify met neplicentie (product-check)...\n');

  let json;
  try {
    const { status, data } = await postVerify({
      productId,
      permalink: usePermalink ? permalink : '',
      licenseKey: probeKey
    });
    console.log('HTTP', status);
    try {
      json = JSON.parse(data);
    } catch (_) {
      console.error('Geen JSON van Gumroad (eerste 400 tekens):');
      console.error(data.slice(0, 400));
      process.exit(1);
    }
  } catch (e) {
    console.error('Netwerkfout:', e.message);
    process.exit(1);
  }

  console.log(JSON.stringify(json, null, 2));

  const msg = (json.message || json.error || '').toString().toLowerCase();

  if (json.success === true) {
    console.log('\n✓ Onverwacht: Gumroad meldt success met neplicentie — controleer handmatig.');
    process.exit(0);
  }

  if (
    msg.includes('license') &&
    (msg.includes('does not exist') || msg.includes('invalid') || msg.includes('not found'))
  ) {
    console.log(
      '\n✓ Product wordt door Gumroad herkend: fout gaat over de neplicentie (verwacht).\n' +
        '  Zet dezelfde GUMROAD_PRODUCT_ID / GUMROAD_PRODUCT_PERMALINK op Vercel als lokaal.'
    );
  } else if (msg.includes('product') || msg.includes('permalink')) {
    console.log(
      '\n✗ Gumroad wijst op product/slug — controleer product_id of permalink in .env en in Gumroad-dashboard.'
    );
    process.exit(1);
  } else {
    console.log('\n? Lees de message hierboven. Bij twijfel: waarden in Gumroad vergelijken met .env en Vercel.');
  }

  if (licenseKey && licenseKey.trim()) {
    const k = licenseKey.trim();
    const prefix = k.length >= 8 ? k.slice(0, 8) : k;
    console.log('\n→ Verify met echte license key (alleen eerste 8 tekens in log):', prefix + '…\n');

    const { status, data } = await postVerify({
      productId,
      permalink: usePermalink ? permalink : '',
      licenseKey: k
    });
    console.log('HTTP', status);
    let j2;
    try {
      j2 = JSON.parse(data);
    } catch (_) {
      console.error(data.slice(0, 400));
      process.exit(1);
    }
    console.log(JSON.stringify({ success: j2.success, message: j2.message }, null, 2));
    if (j2.success === true) {
      console.log('\n✓ License key is geldig voor dit product (zelfde parameters als hierboven).');
    } else {
      explainLicenseNotFound(usePermalink ? permalink : '', usePermalink ? '' : productId);
      if (!usePermalink && !cliPermalink) {
        console.log(`
→ Probeer permalink (slug = stuk na /l/ in je Gumroad-product-URL):
   npm run check:gumroad-product -- --permalink JOUW-SLUG "PLAK_HIER_VOLLEDIGE_LICENSE_KEY"
   Of in feed-server/.env: GUMROAD_PRODUCT_PERMALINK=JOUW-SLUG (en eventueel GUMROAD_PRODUCT_ID leeg), zelfde op Vercel.`);
      }
      process.exit(1);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
