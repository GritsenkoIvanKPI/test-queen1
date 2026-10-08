// Usage: node screenshot.mjs http://localhost:3000 [label]
// Env:   WIDTH=1440 HEIGHT=900 (viewport), FULL=0 to capture only the first viewport
// Saves to ./temporary screenshots/screenshot-N[-label].png (auto-incremented).
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)));
const OUT = join(ROOT, 'temporary screenshots');
const url = process.argv[2] || 'http://localhost:3000';
const label = process.argv[3] ? `-${process.argv[3]}` : '';
const width = Number(process.env.WIDTH) || 1440;
const height = Number(process.env.HEIGHT) || 900;
const fullPage = process.env.FULL !== '0';

const CHROME = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
].find((p) => p && existsSync(p));

if (!CHROME) {
  console.error('Chrome not found. Set CHROME_PATH to a Chrome/Chromium binary.');
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const next =
  readdirSync(OUT)
    .map((f) => Number(/^screenshot-(\d+)/.exec(f)?.[1]))
    .filter(Number.isFinite)
    .reduce((a, b) => Math.max(a, b), 0) + 1;
const file = join(OUT, `screenshot-${next}${label}.png`);

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for the preloader to finish, then scroll through so scroll-reveals fire
  await page
    .waitForFunction(() => document.documentElement.classList.contains('is-loaded'), { timeout: 15000 })
    .catch(() => {});
  await new Promise((r) => setTimeout(r, 1800));

  if (fullPage) {
    await page.evaluate(async () => {
      document.documentElement.classList.add('no-smooth');
      const step = Math.round(window.innerHeight * 0.6);
      for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 160));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 900));
    });
  }

  await page.screenshot({ path: file, fullPage });
  console.log(file);
} finally {
  await browser.close();
}
