/**
 * DevLens extension build script.
 * Reads from src/, obfuscates all .js files, copies other assets to dist/.
 * Keeps Manifest V3 compatible (no eval-based obfuscation in service worker).
 */

const fs = require('fs');
const path = require('path');
const JavaScriptObfuscator = require('javascript-obfuscator');

const SRC_DIR = path.join(__dirname, '..', 'src');
const DIST_DIR = path.join(__dirname, '..', 'dist');
const SKIP_OBFUSCATE = process.env.SKIP_OBFUSCATE === '1' || process.argv.includes('--no-obfuscate');
const IS_PRODUCTION_BUILD = process.argv.includes('--production');
const DEVLYNX_API_BASE_REPLACE = IS_PRODUCTION_BUILD ? 'https://api.devlynx.ai' : 'http://localhost:2847';

// In dev build (no obfuscation), set DEBUG_MODE = true so [DevLens][*] logs appear in Console
function injectDebugModeIfDev(code) {
  if (SKIP_OBFUSCATE && typeof code === 'string') {
    return code.replace(/\bconst DEBUG_MODE = false\b/g, 'const DEBUG_MODE = true');
  }
  return code;
}

// Obfuscator options: MV3-safe (no eval, no self-defending in SW)
// sourceMap: false so original source cannot be reconstructed from dist
const OBFUSCATOR_OPTIONS = {
  compact: true,
  controlFlowFlattening: false,
  deadCodeInjection: false,
  debugProtection: false,
  disableConsoleOutput: false,
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: false,
  renameGlobals: false,
  selfDefending: false,
  simplify: true,
  sourceMap: false,
  sourceMapBase64: false,
  splitStrings: false,
  stringArray: true,
  stringArrayCallsTransform: false,
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 0,
  stringArrayWrappersChainedCalls: false,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'variable',
  stringArrayThreshold: 1,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  target: 'browser',
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function getAllFiles(dir, base = '') {
  const results = [];
  const fullDir = path.join(dir, base);
  if (!fs.existsSync(fullDir)) return results;
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  for (const ent of entries) {
    const rel = base ? path.join(base, ent.name) : ent.name;
    if (ent.isDirectory()) {
      results.push(...getAllFiles(dir, rel));
    } else {
      results.push(rel);
    }
  }
  return results;
}

function build() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error('Source folder "src" not found. Create it and put extension files there.');
    process.exit(1);
  }

  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  ensureDir(DIST_DIR);

  const files = getAllFiles(SRC_DIR);
  for (const rel of files) {
    const srcPath = path.join(SRC_DIR, rel);
    const distPath = path.join(DIST_DIR, rel);
    const ext = path.extname(rel).toLowerCase();

    if (ext === '.js') {
      ensureDir(path.dirname(distPath));
      let code = fs.readFileSync(srcPath, 'utf8');
      if (rel === 'license-jwt-public.js' && IS_PRODUCTION_BUILD) {
        code = code.replace(
          /g\.DEVLYNX_LICENSE_JWT_DEV_SECRET\s*=\s*[^;]+;/,
          "g.DEVLYNX_LICENSE_JWT_DEV_SECRET = '';"
        );
      }
      if (code.indexOf('__DEVLYNX_API_BASE__') !== -1) {
        code = code.split('__DEVLYNX_API_BASE__').join(DEVLYNX_API_BASE_REPLACE);
      }
      if (SKIP_OBFUSCATE) {
        code = injectDebugModeIfDev(code);
        fs.writeFileSync(distPath, code, 'utf8');
        console.log('Copied (no obfuscation, DEBUG_MODE=true):', rel);
      } else {
        try {
          const obfuscated = JavaScriptObfuscator.obfuscate(code, OBFUSCATOR_OPTIONS).getObfuscatedCode();
          fs.writeFileSync(distPath, obfuscated, 'utf8');
          console.log('Obfuscated:', rel);
        } catch (err) {
          console.error('Obfuscation failed for', rel, err.message);
          process.exit(1);
        }
      }
    } else {
      ensureDir(path.dirname(distPath));
      fs.copyFileSync(srcPath, distPath);
      console.log('Copied:', rel);
    }
  }

  const requiredRelPaths = [
    'manifest.json',
    'background.js',
    'devtools/devtools.html',
    'devtools/devtools.js',
    'devtools/panel.html',
    'sidepanel/panel.html',
    'options/options.html',
    'content/content.js',
  ];
  for (const rel of requiredRelPaths) {
    const checkPath = path.join(DIST_DIR, rel);
    if (!fs.existsSync(checkPath)) {
      console.error(`Build verification failed: missing ${rel} (ensure src/ contains full extension tree).`);
      process.exit(1);
    }
  }
  const iconsDir = path.join(DIST_DIR, 'icons');
  if (!fs.existsSync(iconsDir)) {
    console.error('Build verification failed: dist/icons missing (manifest references icons/).');
    process.exit(1);
  }
  console.log('Verified: dist/ includes devtools/, sidepanel/, options/, content/, icons/, manifest.');

  console.log('\nBuild complete. Output in dist/');
}

build();
