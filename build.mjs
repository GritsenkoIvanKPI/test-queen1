// Generates every page of the site from data/*.json using the shared templates in lib/render.mjs.
// Usage: node build.mjs
// The admin panel (/admin) publishes the same output through api/publish.js.
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync, readdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createSite, GENERATED_DIRS } from './lib/render.mjs';

const read = (f) => JSON.parse(readFileSync(`data/${f}.json`, 'utf8'));
export const loadData = () => ({
  brands: read('brands'), models: read('models'), collections: read('collections'), posts: read('posts'), site: read('site'),
});

const pages = createSite(loadData()).pages();
const files = new Set(pages.map((p) => p.file));

for (const p of pages) {
  mkdirSync(dirname(p.file), { recursive: true });
  writeFileSync(p.file, p.html);
}

// Remove pages that are no longer generated (deleted products, brands or posts)
let removed = 0;
for (const dir of GENERATED_DIRS) {
  if (!existsSync(dir)) continue;
  for (const sub of readdirSync(dir, { withFileTypes: true })) {
    if (sub.isDirectory() && !files.has(`${dir}${sub.name}/index.html`)) { rmSync(`${dir}${sub.name}`, { recursive: true }); removed++; }
  }
}

console.log(`Built ${pages.length} pages${removed ? `, removed ${removed} old` : ''}.`);
