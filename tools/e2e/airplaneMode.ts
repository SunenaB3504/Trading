/// <reference lib="dom" />
/**
 * Airplane-mode check for the web app (WP-3.1, NFR-6). Serves the exported web build, runs the real
 * data service on a second port, opens the app in Chrome, then cuts the network and confirms that the
 * ledger still opens and the data screen falls back to its last saved answer.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/airplaneMode.ts
 */
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { BrowserContext, Page } from 'playwright-core';
import { checkLog, serveStatic } from './support';
import { FixedClock } from '../../packages/core/src/index';
import {
  SeriesStore,
  SnapshotStore,
  StatusHistory,
  createHandler,
  startServer,
} from '../../packages/data-service/src/index';

const GOLDEN = 'e0b425cce01d3276c53909e3af23d198a90d49d14f140fafca9a8a2be9b4b3a8';
const { checks, check } = checkLog();

const LEDGER_TITLE = 'Own trades (Ledger A), demo scenario';

async function startFixtures(): Promise<{
  web: Server;
  service: Server;
  appOrigin: string;
  serviceUrl: string;
}> {
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
  return { web, service, appOrigin, serviceUrl };
}

function savedKeys(page: Page): Promise<string[]> {
  return page.evaluate(
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
}

async function online(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await page.getByText(LEDGER_TITLE).waitFor({ timeout: 30_000 });
  const body = await page.locator('body').innerText();
  check('ledger shows the golden report hash', body.includes(GOLDEN));
  check('ledger shows rupee figures', /₹[\d,]+\.\d\d/.test(body));
  check('badge says Online', body.includes('Online'));
  await page.getByRole('tab', { name: 'Data' }).click();
  await page.getByText('Connected').waitFor({ timeout: 15_000 });
  check('data screen connects to the data service', true);
}

async function offline(page: Page, context: BrowserContext, service: Server): Promise<void> {
  await context.setOffline(true);
  await service.close();
  await page.getByText('Offline', { exact: true }).waitFor({ timeout: 10_000 });
  check('badge switches to Offline', true);
  await page.getByRole('button', { name: 'Check again' }).click();
  await page.getByText('Offline, showing last saved').waitFor({ timeout: 15_000 });
  check('data screen falls back to the last saved answer', true);
  await page.getByRole('tab', { name: 'Ledger' }).click();
  await page.getByText(LEDGER_TITLE).waitFor({ timeout: 10_000 });
  const body = await page.locator('body').innerText();
  check('ledger still opens offline with the same hash', body.includes(GOLDEN));
  const saved = await savedKeys(page);
  check(
    'the ledger view and the data answer are saved on the device',
    saved.length >= 2,
    saved.join(', '),
  );
}

async function main(): Promise<void> {
  const { web, service, appOrigin, serviceUrl } = await startFixtures();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 800 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await online(page, `${appOrigin}/?service=${encodeURIComponent(serviceUrl)}`);
    await offline(page, context, service);
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
