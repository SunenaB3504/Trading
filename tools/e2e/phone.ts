/// <reference lib="dom" />
/**
 * Phone-layout and accessibility check for the web app (WP-3.7, NFR-9). Opens every tab (and the Profile tab, switched on) at 360 px and 320 px wide
 * and measures: no horizontal page scroll, every control at least 44 px square, every field named for a
 * screen reader, a 16 px side gutter, tab roles in place, and no text below 12 px.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/phone.ts
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { checkLog, serveStatic } from './support';

const { checks, check } = checkLog();
const TABS = ['Ledger', 'Universe', 'Trade', 'Compare', 'Report', 'Backup', 'Data'];

interface Measured {
  pageOverflow: number;
  small: string[];
  unnamed: string[];
  tinyText: string[];
  gutter: number;
  /** Height of the tab strip itself: a long screen below must not squeeze it away. */
  tabStrip: number;
}

function measure(): Measured {
  const visible = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
  };
  const label = (el: Element): string =>
    (el.getAttribute('aria-label') ?? el.textContent ?? el.tagName).trim().slice(0, 40);
  const controls = Array.from(
    document.querySelectorAll('button, [role="button"], [role="tab"], input, textarea, a[href]'),
  ).filter(visible);
  const small = controls
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.height < 43.5 || r.width < 43.5;
    })
    .map(
      (el) =>
        `${label(el)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`,
    );
  const unnamed = controls
    .filter((el) => /^(INPUT|TEXTAREA)$/.test(el.tagName))
    .filter((el) => (el.getAttribute('aria-label') ?? '') === '' && el.id === '')
    .map((el) => el.getAttribute('data-testid') ?? el.tagName);
  const tinyText = Array.from(document.querySelectorAll('div, span'))
    .filter((el) => el.children.length === 0 && (el.textContent ?? '').trim() !== '' && visible(el))
    .filter((el) => parseFloat(getComputedStyle(el).fontSize) < 11.5)
    .map((el) => (el.textContent ?? '').trim().slice(0, 30));
  const screen = document.querySelector('[data-testid$="-screen"]');
  const inner = screen?.firstElementChild as HTMLElement | null;
  const gutter =
    inner === null || inner === undefined ? 0 : parseFloat(getComputedStyle(inner).paddingLeft);
  return {
    pageOverflow: document.documentElement.scrollWidth - window.innerWidth,
    small,
    unnamed,
    tinyText: Array.from(new Set(tinyText)),
    gutter,
    tabStrip: document.querySelector('[role="tablist"]')?.getBoundingClientRect().height ?? 0,
  };
}

async function checkTab(page: Page, name: string, width: number): Promise<void> {
  await page.getByRole('tab', { name, exact: true }).first().click();
  await page.waitForTimeout(400);
  const m = await page.evaluate(measure);
  check(
    `${width}px ${name}: no horizontal page scroll`,
    m.pageOverflow <= 1,
    `overflow ${m.pageOverflow}px`,
  );
  check(
    `${name}: every control is at least 44 px`,
    m.small.length === 0,
    m.small.slice(0, 6).join('; '),
  );
  check(`${width}px ${name}: every field has a name`, m.unnamed.length === 0, m.unnamed.join(', '));
  check(
    `${name}: no text under 11.5 px`,
    m.tinyText.length === 0,
    m.tinyText.slice(0, 4).join('; '),
  );
  check(`${width}px ${name}: the tab strip is fully visible`, m.tabStrip >= 40, `${m.tabStrip}px`);
  check(`${width}px ${name}: side gutter of at least 16 px`, m.gutter >= 16, `${m.gutter}px`);
}

/** The tab row must hint that more tabs are hidden, and selecting a far tab must slide it fully into view (UAT H1). */
async function tabCue(page: Page, width: number): Promise<void> {
  await page.getByRole('tab', { name: 'Ledger', exact: true }).first().click();
  await page.waitForTimeout(500);
  check(
    `${width}px: an edge marker shows that more tabs are hidden`,
    await page.getByTestId('tabs-more').isVisible(),
  );
  await page.getByRole('tab', { name: 'Data', exact: true }).first().click();
  await page.waitForTimeout(900);
  const box = await page.getByRole('tab', { name: 'Data', exact: true }).first().boundingBox();
  check(
    `${width}px: selecting the last tab slides it fully into view`,
    box !== null && box.x >= 0 && box.x + box.width <= width + 1,
    JSON.stringify(box),
  );
  check(
    `${width}px: the marker goes away at the end of the row`,
    (await page.getByTestId('tabs-more').count()) === 0,
  );
}

/** The optional Profile tab, switched on, must meet the same size and spacing rules as the others. */
async function profileTab(page: Page, url: string, width: number): Promise<void> {
  await page.goto(`${url}?layer=on`);
  await page.getByRole('tab', { name: 'Profile', exact: true }).waitFor({ timeout: 30_000 });
  await checkTab(page, 'Profile', width);
}

async function runWidth(url: string, width: number): Promise<string[]> {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width, height: 740 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  // tsx wraps named functions with a helper that does not exist in the page; give it a stand-in
  await page.addInitScript('window.__name = (f) => f;');
  try {
    await page.goto(url);
    await page.getByRole('tab', { name: 'Ledger' }).waitFor({ timeout: 30_000 });
    const roles = await page.getByRole('tab').count();
    check(`${width}px: tabs are exposed with the tab role`, roles >= TABS.length, `${roles} tabs`);
    for (const t of TABS) await checkTab(page, t, width);
    await tabCue(page, width);
    await profileTab(page, url, width);
    check(`${width}px: no page errors`, errors.length === 0, errors.join(' | '));
  } finally {
    await browser.close();
  }
  return errors;
}

async function main(): Promise<void> {
  const web = await serveStatic();
  const url = `http://127.0.0.1:${(web.address() as AddressInfo).port}/`;
  try {
    for (const width of [360, 320]) await runWidth(url, width);
  } finally {
    web.close();
  }
  console.log(
    JSON.stringify({ failed: checks.filter((c) => !c.ok), total: checks.length }, null, 1),
  );
  if (checks.some((c) => !c.ok)) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
