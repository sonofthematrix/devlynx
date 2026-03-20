/**
 * Copies dist/ to store-ready/ (extension only — no extra files).
 * Builds release/devlynx-ai-chrome-store.zip and release/STORE-UPLOAD-README.txt (upload instructions).
 */
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const root = path.join(__dirname, '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'store-ready');
const releaseDir = path.join(root, 'release');
const zipPath = path.join(releaseDir, 'devlynx-ai-chrome-store.zip');

if (!fs.existsSync(dist)) {
  console.error('dist/ not found. Run: npm run build');
  process.exit(1);
}

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function addExtensionFilesToArchive(archive, dir, rel = '') {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const entryName = rel ? `${rel}/${name}`.replace(/\\/g, '/') : name;
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      addExtensionFilesToArchive(archive, full, entryName);
    } else {
      archive.file(full, { name: entryName });
    }
  }
}

rmrf(out);
fs.mkdirSync(out, { recursive: true });
for (const name of fs.readdirSync(dist)) {
  copyRecursive(path.join(dist, name), path.join(out, name));
}

const devtoolsCheck = path.join(out, 'devtools', 'devtools.html');
if (!fs.existsSync(devtoolsCheck)) {
  console.error('store-ready failed: devtools/devtools.html missing in store-ready/.');
  console.error('Run: npm run build   (dist/ must include src/devtools/)');
  process.exit(1);
}

if (!fs.existsSync(releaseDir)) {
  fs.mkdirSync(releaseDir, { recursive: true });
}

const readme = `DevLynx AI – Chrome Web Store upload
=====================================

Ready-made ZIP (upload this file):
  release/devlynx-ai-chrome-store.zip

The store-ready/ folder contains only extension files (same as dist/).
To zip manually: zip the CONTENTS of store-ready/ (select everything inside that folder).

Do NOT put in the store ZIP: node_modules, src, feed-server, .env
Version: see manifest.json in store-ready/
`;
fs.writeFileSync(path.join(releaseDir, 'STORE-UPLOAD-README.txt'), readme, 'utf8');

console.log('store-ready/ updated from dist/ (extension files only)');
console.log('Upload instructions:', path.join(releaseDir, 'STORE-UPLOAD-README.txt'));

const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', () => {
  console.log('Chrome Web Store ZIP:', zipPath);
  console.log('Size:', (archive.pointer() / 1024).toFixed(1), 'KB');
});

archive.on('error', (err) => {
  console.error('Archive error:', err);
  process.exit(1);
});

archive.pipe(output);
addExtensionFilesToArchive(archive, out);
archive.finalize();
