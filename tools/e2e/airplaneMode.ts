/**
 * Airplane-mode check for the web app (WP-3.1, NFR-6). Serves the exported web build, runs the real
 * data service on a second port, opens the app in Chrome, then cuts the network and confirms that the
 * ledger still opens and the data screen falls back to its last saved answer.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/airplaneMode.ts
 */
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import { FixedClock } from '../../packages/core/src/index';
import {
  SeriesStore,
  SnapshotStore,
  StatusHistory,
  createHandler,
  startServer,
} from '../../packages/data-service/src/index';

const dist = resolve('packages/app/dist');
const GOLDEN = 'e0b425cce01d3276c53909e3af23d198a90d49d14f140fafca9a8a2be9b4b3a8';
const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

function serveStatic(): Promise<Server> {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = join(dist, path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolveListen) => server.listen(0, '127.0.0.1', () => resolveListen(server)));
}

const checks: Array<{ name: string; ok: boolean; detail?: string }> = [];
const check = (name: string, ok: boolean, detail?: string): void => {
  checks.push(detail === undefined ? { name, ok } : { name, ok, detail });
};

async function main(): Promise<void> {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('export the web build first');
  const web = await serveStatic();
  const appOrigin = `http://127.0.0.1:${(web.address() as AddressInfo).port}`;
  const handler = createHandler({
    series: new SeriesStore(),
    snapshots: new SnapshotStore(),
    clock: new FixedClock(1_760_000_000_000),
    identities: [],
    lifecycles: [],
    providerHealth: () => [{ provider: 'nse-bhavcopy', lastFetchAt: 1, lastStatus: 200, ok: true }],
    statusHistory: new StatusHistory(),
  });
  const service = await startServer(handler, { port: 0, allowedOrigin: appOrigin });
  const serviceUrl = `http://127.0.0.1:${(service.address() as AddressInfo).port}`;

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  const errors: string[] = [];
  const consoleLines: string[] = [];
  page.on('console', (m) => consoleLines.push(`${m.type()}: ${m.text()}`));
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(`${appOrigin}/?service=${encodeURIComponent(serviceUrl)}`);
    await page.getByText('Own trades (Ledger A), demo scenario').waitFor({ timeout: 30_000 });
    const body = await page.locator('body').innerText();
    check('ledger shows the golden report hash', body.includes(GOLDEN));
    check('ledger shows rupee figures', /₹[\d,]+\.\d\d/.test(body));
    check('badge says Online', body.includes('Online'));

    await page.getByRole('tab', { name: 'Data' }).click();
    await page
      .getByText('Connected')
      .waitFor({ timeout: 15_000 })
      .catch(async (e: unknown) => {
        console.error(await page.locator('body').innerText(), errors, consoleLines);
        throw e;
      });
    check('data screen connects to the data service', true);

    await context.setOffline(true);
    await service.close();
    await page.getByText('Offline', { exact: true }).waitFor({ timeout: 10_000 });
    check('badge switches to Offline', true);
    await page.getByRole('button', { name: 'Check again' }).click();
    await page.getByText('Offline, showing last saved').waitFor({ timeout: 15_000 });
    check('data screen falls back to the last saved answer', true);

    await page.getByRole('tab', { name: 'Ledger' }).click();
    await page.getByText('Own trades (Ledger A), demo scenario').waitFor({ timeout: 10_000 });
    const offlineBody = await page.locator('body').innerText();
    check('ledger still opens offline with the same hash', offlineBody.includes(GOLDEN));

    const saved = await page.evaluate(
      () =>
        new Promise<string[]>((res, rej) => {
          const req = indexedDB.open('trading-app', 1);
          req.onsuccess = () => {
            const r = req.result.transaction('kv').objectStore('kv').getAllKeys();
            r.onsuccess = () => res(r.result.map(String));
            r.onerror = () => rej(r.error);
          };
          req.onerror = () => rej(req.error);
        }),
    );
    check(
      'the ledger view and the data answer are saved on the device',
      saved.length >= 2,
      saved.join(', '),
    );
    check('no page errors', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
    web.close();
    service.close();
  }
  console.log(JSON.stringify({ checks }, null, 1));
  if (checks.some((c) => !c.ok)) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
