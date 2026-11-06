/**
 * Charts, Strategy Lab and Robo account checks for the web app (MIP v4.1 Stage 7), on the real prices shipped inside
 * the app. A chart shows candles, the two averages, volume and RSI for a chosen share; the Strategy Lab runs the
 * breakout rules over a past period and refuses settings that cannot run; the five Robo accounts are brought up to
 * date when their screen opens and are the same after a reload.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm e2e:strategy
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();
const text = (page: Page, id: string): Promise<string> => page.getByTestId(id).innerText();

async function charts(page: Page): Promise<void> {
  await openTab(page, 'Charts');
  await page.getByTestId('chart-screen').waitFor({ timeout: 60_000 });
  await page.getByTestId('stock-search-open').click();
  await page.getByTestId('stock-search').fill('reliance');
  await page.getByTestId('pick-instrument').getByText('RELIANCE', { exact: true }).click();
  await page.getByTestId('chart-candles').waitFor({ timeout: 30_000 });
  const r = await text(page, 'chart-readout');
  check('the chart shows close, both averages, RSI and volume', /Close/.test(r) && /20-day average/.test(r) && /50-day average/.test(r) && /RSI \(14 days\)/.test(r) && /Volume/.test(r), r);
  check('the chart has price, volume and RSI panels', (await page.getByTestId('chart-volume').count()) === 1 && (await page.getByTestId('chart-rsi').count()) === 1);
  const dots = await page.getByTestId('chart-candles').locator('div').count();
  check('candles are drawn (more than a hundred shapes in the price panel)', dots > 100, String(dots));
  await page.getByTestId('chart-range').getByText('1 year', { exact: true }).click();
  const r2 = await text(page, 'chart-readout');
  check('changing the history keeps the readout', /Close/.test(r2));
}

async function lab(page: Page): Promise<void> {
  await openTab(page, 'Strategy Lab');
  await page.getByTestId('lab-screen').waitFor({ timeout: 60_000 });
  await page.getByTestId('lab-run').click();
  await page.getByTestId('lab-result').waitFor({ timeout: 90_000 });
  const r = await text(page, 'lab-result');
  check('the lab shows return, worst fall, Sharpe, trades, charges and the Nifty ETF', /Total return/.test(r) && /Worst fall/.test(r) && /Sharpe/.test(r) && /Trades closed/.test(r) && /Charges paid/.test(r) && /Rules minus the Nifty ETF/.test(r), r.slice(0, 400));
  check('the lab draws the account curve', (await page.getByTestId('lab-curve').count()) === 1);
  await page.getByTestId('lab-stop').fill('0.1');
  await page.getByTestId('lab-run').click();
  await page.getByTestId('lab-error').waitFor({ timeout: 10_000 });
  check('a stop that is too small is refused in words', /Stop/.test(await text(page, 'lab-error')), await text(page, 'lab-error'));
  await page.getByTestId('lab-stop').fill('7');
  await page.getByTestId('lab-save').click();
  await page.getByTestId('lab-saved').waitFor({ timeout: 10_000 });
  check('settings can be saved for the Sandbox account', /Saved/.test(await text(page, 'lab-saved')));
}

async function robo(page: Page): Promise<string> {
  await openTab(page, 'Robo');
  await page.getByTestId('robo-index').waitFor({ timeout: 120_000 });
  for (const id of ['index', 'sunil', 'neil', 'shine', 'sandbox']) {
    check(`the ${id} account is shown`, (await page.getByTestId(`robo-${id}`).count()) === 1);
  }
  const index = await text(page, 'robo-index');
  check('the index account holds the Nifty 50 ETF', /NIFTYBEES since/.test(index), index);
  const sunil = await text(page, 'robo-sunil');
  check('a rules account shows its value, return and the comparison with the index', /Value/.test(sunil) && /Return since it started/.test(sunil) && /Compared with the Index Benchmark/.test(sunil), sunil);
  return await text(page, 'robo-sunil');
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
    await charts(page);
    await lab(page);
    const before = await robo(page);
    await page.reload();
    await appReady(page);
    const again = await robo(page);
    check('after a reload the accounts are the same', before === again);
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
