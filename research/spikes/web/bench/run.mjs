// Usage: node run.mjs <dist-dir> <label> [cpuThrottle=1] [rounds=3]
// Serves a built spike, opens it in the installed Chrome (headless) and reads window.__spike:
// store timings (IndexedDB, SQLite-WASM) and a 4-second scroll benchmark of the 5,000-row table.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { chromium } from 'playwright-core';

const [dist, label, throttle = '1', rounds = '3'] = process.argv.slice(2);
const root = resolve(dist);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ico': 'image/x-icon', '.ttf': 'font/ttf' };

const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let file = join(root, path);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;

const results = [];
for (let i = 0; i < Number(rounds); i += 1) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(throttle) });
  const t0 = Date.now();
  await page.goto(url);
  await page.waitForFunction('window.__spike && window.__spike.ready', null, { timeout: 60000 });
  const loadMs = Date.now() - t0;
  const timings = await page.evaluate(() => window.__spike.run());
  const bench = await page.evaluate(() => window.__spike.bench());
  results.push({ round: i + 1, loadMs, timings, bench, errors: errors.slice(0, 3) });
  await browser.close();
}
server.close();
console.log(JSON.stringify({ label, cpuThrottle: Number(throttle), results }, null, 1));
