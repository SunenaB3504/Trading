// Usage: node persist.mjs <dist-dir>
// Saves a bundle, closes the browser tab, opens a new page in the SAME profile and checks the bundle is still there.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdtempSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { chromium } from 'playwright-core';
const root = resolve(process.argv[2]);
const types = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  let f = join(root, p);
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const url = `http://127.0.0.1:${server.address().port}/`;
const profile = mkdtempSync(join(tmpdir(), 'spike-'));
const open = async () => {
  const ctx = await chromium.launchPersistentContext(profile, { channel: 'chrome', headless: true });
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction('window.__spike && window.__spike.ready', null, { timeout: 60000 });
  return { ctx, page };
};
let a = await open();
await a.page.evaluate(() => window.__spike.run());
await a.ctx.close();
const b = await open();
const after = await b.page.evaluate(() => window.__spike.loadOnly());
await b.ctx.close();
server.close();
console.log(JSON.stringify({ dist: process.argv[2], afterRestart: after }));
