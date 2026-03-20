/**
 * Ensures ./public exists so Vercel projects with Output Directory = "public" can finish the build.
 * API routes still handle / and /health via vercel.json rewrites.
 */
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '..', 'public');
const htmlPath = path.join(dir, 'index.html');
fs.mkdirSync(dir, { recursive: true });
if (!fs.existsSync(htmlPath)) {
  fs.writeFileSync(
    htmlPath,
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>DevLynx API</title></head><body><p>Try <a href="/health">/health</a>.</p></body></html>\n',
    'utf8'
  );
}
console.log('vercel-build: public/ ready');
