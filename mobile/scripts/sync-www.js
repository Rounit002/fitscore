#!/usr/bin/env node
/**
 * Copies the compiled Vite SPA (Frontend/dist) into mobile/www so Cordova can
 * bundle it. Cross-platform replacement for `rimraf` + `cpr`.
 *
 * `www/` is a build artifact and is git-ignored — never edit it by hand.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.resolve(root, '..', 'Frontend', 'dist');
const target = path.join(root, 'www');

if (!fs.existsSync(path.join(source, 'index.html'))) {
  console.error(
    `[sync-www] No build found at ${source}\n` +
      `           Run "npm run build:web" first (or use "npm run build:android").`,
  );
  process.exit(1);
}

fs.rmSync(target, { recursive: true, force: true });
fs.cpSync(source, target, { recursive: true });

let files = 0;
const count = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) count(path.join(dir, entry.name));
    else files += 1;
  }
};
count(target);

console.log(`[sync-www] Copied ${files} file(s) from Frontend/dist -> mobile/www`);
