/**
 * Time Machine, scenarios and Portfolio Builder checks for the web app (MIP v4.1 Stage 6). A new install replays the
 * 2020 recovery on the real prices shipped inside the app: only the scenario's instruments can be chosen, an order
 * given on day one waits and fills at the next session's open when the date moves on, the checkpoints stop the
 * steps, finishing shows the goal and the debrief, and the session is still there after a reload. A fund scenario
 * is played with a SIP, and the Portfolio Builder runs a mix and refuses weights that do not add to 100.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm e2e:machine
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();
const text = (page: Page, id: string): Promise<string> => page.getByTestId(id).innerText();

async function openMachine(page: Page): Promise<void> {
  await openTab(page, 'Time Machine');
  await page.getByTestId('timemachine-screen').waitFor({ timeout: 60_000 });
  await page.getByTestId('start-recovery-2020').waitFor({ timeout: 60_000 });
}

async function dayOne(page: Page): Promise<void> {
  await page.getByTestId('start-recovery-2020').click();
  await page.getByTestId('tm-session').waitFor({ timeout: 30_000 });
  check('a scenario starts on its first day', /Date: 2020-04-01/.test(await text(page, 'tm-date')));
  await page.getByTestId('stock-search-open').click();
  await page.getByTestId('stock-search').fill('infy');
  check('only the scenario’s instruments can be chosen', (await page.getByTestId('pick-instrument').getByText('INFY', { exact: true }).count()) === 0);
  await page.getByTestId('stock-search').fill('nifty');
  await page.getByTestId('pick-instrument').getByText('NIFTYBEES (ETF)', { exact: true }).click();
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-0001 placed/).waitFor({ timeout: 30_000 });
  check('an order given on day one waits', /pending/.test(await text(page, 'trade-screen')));
  await page.getByTestId('tm-next-day').click();
  await page.getByText(/Date: 2020-04-03/).waitFor({ timeout: 30_000 });
  await page.getByText(/filled/).first().waitFor({ timeout: 30_000 });
  check('the next day skips the 2 April holiday and the order fills', /filled/.test(await text(page, 'trade-screen')));
}

async function playToEnd(page: Page): Promise<void> {
  const banners = new Set<string>();
  for (let i = 0; i < 40; i += 1) {
    await page.getByTestId('tm-next-week').click();
    await page.getByTestId('tm-date').waitFor();
    const b = (await page.getByTestId('tm-banner').count()) > 0 ? await text(page, 'tm-banner') : '';
    if (b !== '') banners.add(b);
    if (/last day of the session/.test(b)) break;
  }
  check('both checkpoints stopped the steps', [...banners].some((b) => /Two months in/.test(b)) && [...banners].some((b) => /Four months in/.test(b)), [...banners].join(' | '));
  check('it ends on the last day and not after', /Date: 2020-09-30/.test(await text(page, 'tm-date')), await text(page, 'tm-date'));
  await page.getByTestId('tm-finish').click();
  await page.getByTestId('tm-summary').waitFor({ timeout: 30_000 });
  const goal = await text(page, 'tm-goal');
  check('the summary judges the goal', /Goal (not )?met/.test(goal), goal);
  await page.getByTestId('tm-debrief').waitFor({ timeout: 30_000 });
  check('the debrief shows what followed', /Over the 20 sessions after/.test(await text(page, 'tm-followed')), await text(page, 'tm-followed'));
  await page.getByTestId('tm-debrief-ai').click();
  await page.getByTestId('tm-debrief-ai-answer').waitFor({ timeout: 15_000 });
  check('the AI debrief shows the Preview sample with no key', /Sample answer/.test(await text(page, 'tm-debrief-ai-answer')));
}

async function savedAndFunds(page: Page): Promise<void> {
  await page.reload();
  await appReady(page);
  await openMachine(page);
  check('the finished session is saved and can be opened again', (await page.getByTestId('open-s1').innerText()).includes('See summary'));
  await page.getByTestId('open-s1').click();
  await page.getByTestId('tm-summary').waitFor({ timeout: 30_000 });
  await page.getByTestId('tm-back').click();
  await page.getByTestId('start-sip-2022').click();
  await page.getByTestId('tm-session').waitFor({ timeout: 30_000 });
  await page.getByTestId('pick-fund-action').getByText('SIP', { exact: false }).first().click();
  await page.getByTestId('fund-amount').fill('10000');
  await page.getByTestId('fund-day').fill('5');
  await page.getByTestId('fund-instalments').fill('12');
  await page.getByTestId('fund-date').fill('2022-01-03');
  await page.getByTestId('place-fund-order').click();
  await page.getByTestId('fund-message').waitFor({ timeout: 30_000 });
  check('a SIP is placed in the fund scenario', /placed/.test(await text(page, 'fund-message')), await text(page, 'fund-message'));
}

async function finishFunds(page: Page): Promise<void> {
  for (let i = 0; i < 60; i += 1) {
    if ((await page.getByTestId('tm-next-week').count()) === 0) break;
    await page.getByTestId('tm-next-week').click();
    await page.getByTestId('tm-date').waitFor();
    if (/Date: 2022-12-3\d/.test(await text(page, 'tm-date'))) break;
  }
  await page.getByTestId('tm-finish').click();
  await page.getByTestId('tm-goal').waitFor({ timeout: 30_000 });
  const goal = await text(page, 'tm-goal');
  check('a SIP through 2022 meets the nine-months goal', /Goal met/.test(goal), goal);
}

async function builder(page: Page): Promise<void> {
  await openTab(page, 'Builder');
  await page.getByTestId('builder-screen').waitFor({ timeout: 30_000 });
  await page.getByTestId('preset-mixed').click();
  await page.getByTestId('builder-run').click();
  await page.getByTestId('builder-result').waitFor({ timeout: 30_000 });
  const r = await text(page, 'builder-result');
  check('the builder shows return, worst fall, recovery and the effect of rebalancing', /Total return/.test(r) && /Worst fall/.test(r) && /Time to get back/.test(r) && /Effect of rebalancing/.test(r), r.slice(0, 300));
  await page.getByTestId('weight-NIFTYBEES').fill('90');
  await page.getByTestId('builder-run').click();
  await page.getByTestId('builder-error').waitFor({ timeout: 10_000 });
  check('weights that do not add to 100 are refused', /add up to 100/.test(await text(page, 'builder-error')));
}

async function main(): Promise<void> {
  const web = await serveStatic();
  const url = `http://127.0.0.1:${(web.address() as AddressInfo).port}/`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 900 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(url);
    await appReady(page);
    await openMachine(page);
    await dayOne(page);
    await playToEnd(page);
    await savedAndFunds(page);
    await finishFunds(page);
    await builder(page);
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
