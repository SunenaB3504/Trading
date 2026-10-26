/**
 * Lots popup check for the web app (WP-3.12). Opens the Ledger tab of the exported build in Chrome, reads each
 * holding's average and lots link, opens the popup, checks the lots against the demo scenario, that they add up
 * to the position, that the popup closes with the Close button, with Esc and by a tap outside it, and that it
 * fits a phone.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm e2e:lots
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();

async function openLedger(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await openTab(page, 'Ledger');
  await page.getByTestId('ledger-screen').waitFor({ timeout: 30_000 });
}

async function holdings(page: Page): Promise<void> {
  const text = await page.getByTestId('ledger-screen').innerText();
  check(
    'AAA shows 47 shares at an average of ₹1,108.05 with its basis',
    /47 shares, average ₹1,108\.05, basis ₹52,078\.25/.test(text),
  );
  check(
    'BBB and CCC show their averages',
    /20 shares, average ₹510\.75/.test(text) && /200 shares, average ₹191\.80/.test(text),
  );
  check(
    'the links read 3 lots, then 1 lot twice (never "1 lots")',
    (await page.getByTestId('lots-AAA').innerText()) === '3 lots' &&
      (await page.getByTestId('lots-BBB').innerText()) === '1 lot' &&
      (await page.getByTestId('lots-CCC').innerText()) === '1 lot' &&
      !/\b1 lots\b/.test(text),
  );
}

async function popup(page: Page): Promise<void> {
  await page.getByTestId('lots-AAA').click();
  const box = page.getByTestId('lots-popup');
  await box.waitFor({ timeout: 10_000 });
  const text = await box.innerText();
  check('the popup is titled with the instrument and the lot count', /AAA: 3 open lots/.test(text));
  check(
    'it says the oldest lot is used first, with its date, size and price',
    /A sale takes the oldest lot first: 30 shares bought 2026-01-13 at ₹1,096\.15\./.test(text),
  );
  const order = ['2026-01-13', '2026-02-11', '2026-06-15'].map((d) => text.indexOf(d));
  check(
    'the three lots are listed oldest first, in month groups',
    order.every((i) => i >= 0) &&
      order[0]! < order[1]! &&
      order[1]! < order[2]! &&
      /2026-01/.test(text) &&
      /2026-02/.test(text) &&
      /2026-06/.test(text),
  );
  check(
    'each lot shows shares, price and basis',
    /30 shares at ₹1,096\.15, basis ₹32,884\.50/.test(text) &&
      /7 shares at ₹1,139\.25, basis ₹7,974\.75/.test(text) &&
      /10 shares at ₹1,121\.90, basis ₹11,219\.00/.test(text),
  );
  const lots = [...text.matchAll(/(\d+) shares at ₹[\d,.]+, basis ₹([\d,]+)\.(\d\d)/g)].filter(
    (m) => !/proceeds/.test(m[0]),
  );
  const shares = lots.reduce((n, m) => n + Number(m[1]), 0);
  const paise = lots.reduce(
    (n, m) => n + Number((m[2] ?? '').replace(/,/g, '')) * 100 + Number(m[3]),
    0,
  );
  check(
    'the lots add up to the position: 47 shares and ₹52,078.25',
    lots.length === 3 && shares === 47 && paise === 5_207_825,
    `${String(lots.length)} lots, ${String(shares)} shares, ${String(paise)} paise`,
  );
  check(
    'the sold piece is listed',
    /2026-05-05: 50 shares, proceeds ₹57,822\.50, net ₹2,874\.59/.test(text),
  );
  check(
    'the popup holds no control but Close (read-only)',
    (await box.getByRole('button').count()) === 1,
  );
}

async function closes(page: Page): Promise<void> {
  const box = page.getByTestId('lots-popup');
  await page.getByTestId('lots-close').click();
  await box.waitFor({ state: 'detached', timeout: 5_000 });
  check('the Close button closes it', true);
  await page.getByTestId('lots-AAA').click();
  await box.waitFor({ timeout: 5_000 });
  await page.keyboard.press('Escape');
  await box.waitFor({ state: 'detached', timeout: 5_000 });
  check('Esc closes it', true);
  await page.getByTestId('lots-AAA').click();
  await box.waitFor({ timeout: 5_000 });
  await page.mouse.click(4, 4);
  await box.waitFor({ state: 'detached', timeout: 5_000 });
  check('a tap outside closes it', true);
  check(
    'the Ledger is still there afterwards',
    await page.getByTestId('ledger-screen').isVisible(),
  );
}

async function fitsPhone(page: Page): Promise<void> {
  await page.getByTestId('lots-AAA').click();
  const box = page.getByTestId('lots-popup');
  await box.waitFor({ timeout: 5_000 });
  const r = await box.boundingBox();
  const viewport = page.viewportSize();
  check(
    'at 390 px wide the popup fits with a margin',
    r !== null && viewport !== null && r.x >= 8 && r.x + r.width <= viewport.width - 8,
    JSON.stringify(r),
  );
  const sideways = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  check('the page does not scroll sideways', !sideways);
  await page.keyboard.press('Escape');
}

async function main(): Promise<void> {
  const web = await serveStatic();
  const url = `http://127.0.0.1:${(web.address() as AddressInfo).port}/`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (
    await browser.newContext({ viewport: { width: 390, height: 900 } })
  ).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await openLedger(page, url);
    await holdings(page);
    await popup(page);
    await closes(page);
    await fitsPhone(page);
    check('no page errors', errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
    web.close();
  }
  console.log(JSON.stringify({ checks }, null, 1));
  if (checks.some((c) => !c.ok)) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
