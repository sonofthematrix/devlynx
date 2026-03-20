/**
 * Creates release/devlens-extension.zip from dist/ for Chrome Web Store upload.
 * Zip root = contents of dist/ (manifest.json at root).
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const DIST_DIR = path.join(__dirname, '..', 'dist');
const RELEASE_DIR = path.join(__dirname, '..', 'release');
const ZIP_PATH = path.join(RELEASE_DIR, 'devlens-extension.zip');

function packageExtension() {
  if (!fs.existsSync(DIST_DIR)) {
    console.error('dist/ not found. Run "npm run build" first.');
    process.exit(1);
  }

  if (!fs.existsSync(RELEASE_DIR)) {
    fs.mkdirSync(RELEASE_DIR, { recursive: true });
  }

  const output = fs.createWriteStream(ZIP_PATH);
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', () => {
    console.log('Package complete:', ZIP_PATH);
    console.log('Size:', (archive.pointer() / 1024).toFixed(1), 'KB');
  });

  archive.on('error', (err) => {
    console.error('Archive error:', err);
    process.exit(1);
  });

  archive.pipe(output);
  archive.directory(DIST_DIR, false);
  archive.finalize();
}

packageExtension();
