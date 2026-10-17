/**
 * Universe-screen check for the web app (WP-3.2). Opens the Universe tab in Chrome and confirms that the
 * seeded names show their flags, buckets and eligibility reasons, that the filter works, and that the
 * rules of one failing name can be opened.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm tsx tools/e2e/universe.ts
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import { checkLog, serveStatic } from './support';

const { checks, check } = checkLog();

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
    await page.goto(url);
    await page.getByRole('tab', { name: 'Universe' }).click();
    await page.getByTestId('universe-screen').waitFor({ timeout: 30_000 });
    const all = await page.getByTestId('universe-screen').innerText();
    check(
      'the screen says what is real and what is assumed',
      /Demo universe/.test(all) && /assumed/.test(all),
    );
    check('it lists 16 instruments', /16 instruments/.test(all));

    const reliance = await page.getByTestId('row-RELIANCE').innerText();
    check(
      'Reliance: eligible, no fixed band, sector bucket',
      /Eligible/.test(reliance) &&
        /no fixed price band/.test(reliance) &&
        /Bucket: mundane/.test(reliance),
    );
    const fel = await page.getByTestId('row-FEL').innerText();
    check(
      'Future Enterprises: GSM stage 0, trade-for-trade, narrow band, thin trading',
      /GSM stage 0/.test(fel) &&
        /trade-for-trade/.test(fel) &&
        /Bucket: speculative/.test(fel) &&
        /First failure E5/.test(fel),
    );

    await page.getByRole('tab', { name: 'Not eligible' }).click();
    await page.getByText('10 instruments').waitFor({ timeout: 10_000 });
    check('the Not eligible filter shows 10 names', true);
    await page.getByRole('tab', { name: 'Eligible', exact: true }).click();
    await page.getByText('6 instruments').waitFor({ timeout: 10_000 });
    check('the Eligible filter shows 6 names', true);

    await page.getByRole('tab', { name: 'Not eligible' }).click();
    await page.getByTestId('row-ACCENTMIC').getByText('Show the rules').click();
    await page
      .getByTestId('row-ACCENTMIC')
      .getByText('Hide the rules')
      .waitFor({ timeout: 10_000 });
    const rules = await page.getByTestId('row-ACCENTMIC').innerText();
    check(
      'opening the rules shows the failed series rule and the assumed ones',
      /Fail E1: series ST/.test(rules) && /\(assumed, not measured\)/.test(rules),
    );
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
