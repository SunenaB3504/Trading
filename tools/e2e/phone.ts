/// <reference lib="dom" />
/**
 * Phone-layout and accessibility check for the web app (WP-3.7, NFR-9). Opens every screen at 360 px and 320 px wide
 * and measures: no horizontal page scroll, every control at least 44 px square, every field named for a
 * screen reader, a 16 px side gutter, tab roles in place, and no text below 12 px.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/phone.ts
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();
/** Every screen: the main sections, then the screens inside Practise and Settings. */
const TABS = ['Home', 'Learn', 'Measure', 'Tutor', 'Trade', 'Ledger', 'Universe', 'Compare', 'Report', 'General', 'Profiles', 'Backup', 'Data'];

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

async function checkTab(page: Page, name: string, width: number, label = name): Promise<void> {
  await openTab(page, name);
  await page.waitForTimeout(400);
  const m = await page.evaluate(measure);
  check(
    `${width}px ${label}: no horizontal page scroll`,
    m.pageOverflow <= 1,
    `overflow ${m.pageOverflow}px`,
  );
  check(
    `${label}: every control is at least 44 px`,
    m.small.length === 0,
    m.small.slice(0, 6).join('; '),
  );
  check(
    `${width}px ${label}: every field has a name`,
    m.unnamed.length === 0,
    m.unnamed.join(', '),
  );
  check(
    `${label}: no text under 11.5 px`,
    m.tinyText.length === 0,
    m.tinyText.slice(0, 4).join('; '),
  );
  check(`${width}px ${label}: the tab strip is fully visible`, m.tabStrip >= 40, `${m.tabStrip}px`);
  check(`${width}px ${label}: side gutter of at least 16 px`, m.gutter >= 16, `${m.gutter}px`);
}

/** The main tab row must hint that more sections are hidden, and selecting a far one must slide it into view (UAT H1). */
async function tabCue(page: Page, width: number): Promise<void> {
  await openTab(page, 'Home');
  await page.waitForTimeout(500);
  check(
    `${width}px: an edge marker shows that more sections are hidden`,
    await page.getByTestId('tabs-more').first().isVisible(),
  );
  await openTab(page, 'Settings');
  await page.waitForTimeout(900);
  const box = await page.getByRole('tab', { name: 'Settings', exact: true }).first().boundingBox();
  check(
    `${width}px: selecting the last section slides it fully into view`,
    box !== null && box.x >= 0 && box.x + box.width <= width + 1,
    JSON.stringify(box),
  );
  const strip = await page.getByRole('tablist').first().boundingBox();
  const markers = await page.getByTestId('tabs-more').evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().top),
  );
  check(
    `${width}px: the marker on the main row goes away at its end`,
    strip !== null && markers.every((top) => top >= strip.y + strip.height - 1),
    JSON.stringify({ strip, markers }),
  );
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
    await appReady(page);
    const roles = await page.getByRole('tab').count();
    check(`${width}px: tabs are exposed with the tab role`, roles >= 6, `${roles} tabs`);
    for (const t of TABS) await checkTab(page, t, width);
    await tabCue(page, width);
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
