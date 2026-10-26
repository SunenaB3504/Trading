/**
 * Learn, journal and mistake checker check for the web app (MIP v4.1 Stage 4). A new profile reads all eight Level 1
 * lessons, marks them done, takes the self-check and sees the level complete, with no AI involved. It searches the
 * glossary, places one order with no exit plan and sees the mistake checker flag it, places another with a journal
 * note and exit plan and adds a review after it, and sees the coach hint on the Trade screen.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm e2e:learn
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { Page } from 'playwright-core';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();

async function readLevelOne(page: Page): Promise<void> {
  await openTab(page, 'Learn');
  await page.getByTestId('learn-next').waitFor({ timeout: 30_000 });
  check('the path offers the first lesson', /Continue: Why invest at all/.test(await page.getByTestId('learn-next').innerText()));
  for (let i = 0; i < 8; i += 1) {
    await page.getByTestId('learn-next').click();
    await page.getByTestId('lesson-view').waitFor({ timeout: 10_000 });
    if (i === 0) {
      const text = await page.getByTestId('lesson-view').innerText();
      check('a lesson shows its source, the date its facts were checked and its words', /Facts checked 2026-10-24/.test(text) && /Compounding/.test(text), text.slice(0, 300));
    }
    await page.getByTestId('lesson-done').click();
    await page.getByTestId('lesson-back').click();
    await page.getByTestId('learn-next').waitFor({ timeout: 10_000 });
  }
  check('after eight lessons the next step is the self-check', /Continue: the self-check/.test(await page.getByTestId('learn-next').innerText()));
  await page.getByTestId('learn-next').click();
  for (let q = 0; q < 8; q += 1) {
    await page.getByTestId('quiz-question').waitFor({ timeout: 10_000 });
    await page.getByTestId('quiz-show').click();
    check(`question ${String(q + 1)} shows its answer`, (await page.getByTestId('quiz-answer').innerText()).length > 3);
    await page.getByTestId(q % 2 === 0 ? 'quiz-right' : 'quiz-wrong').click();
  }
  await page.getByText(/8 of 8 lessons done\. Level complete\./).waitFor({ timeout: 10_000 });
  check('Level 1 is complete', true);
  check('the self-check shows the score', /4 of 8/.test(await page.getByTestId('quiz-level-1').innerText()));
}

async function glossary(page: Page): Promise<void> {
  await openTab(page, 'Glossary');
  await page.getByTestId('glossary-search').fill('slippage');
  await page.getByText('Slippage', { exact: true }).waitFor({ timeout: 10_000 });
  check('the glossary finds a word', /gap between expected and actual price/i.test(await page.getByTestId('glossary-view').innerText()));
}

async function placeBuy(page: Page, note: boolean): Promise<void> {
  await openTab(page, 'Trade');
  await page.getByText('New order (virtual money)').waitFor({ timeout: 30_000 });
  if (note) {
    await page.getByTestId('journal-why').fill('Steady results');
    await page.getByTestId('journal-exit').fill('Sell if it closes below 900');
    await page.getByTestId('journal-confidence').getByText('4', { exact: true }).click();
  }
  await page.getByTestId('place-order').click();
  await page.getByText(/Order h-000\d placed/).waitFor({ timeout: 10_000 });
}

async function mistakes(page: Page): Promise<void> {
  await placeBuy(page, false);
  check('the Trade screen shows the coach hint', (await page.getByTestId('coach-trade').count()) === 1);
  await openTab(page, 'Measure');
  await page.getByTestId('flag-no_exit_plan').waitFor({ timeout: 10_000 });
  check('a buy with no exit plan is flagged, with its lesson', /order h-0001/.test(await page.getByTestId('flag-no_exit_plan').innerText()) && /Lesson: /.test(await page.getByTestId('flag-no_exit_plan').innerText()));
  await placeBuy(page, true);
  await openTab(page, 'Measure');
  await page.getByTestId('flag-no_exit_plan').waitFor({ timeout: 10_000 });
  check('a buy with a written exit plan is not flagged', (await page.getByTestId('flag-no_exit_plan').count()) === 1);
}

async function journal(page: Page): Promise<void> {
  await openTab(page, 'Journal');
  await page.getByTestId('journal-h-0002').waitFor({ timeout: 10_000 });
  check('the journal keeps what was written before the order', /Steady results/.test(await page.getByTestId('journal-h-0002').innerText()) && /4 of 5/.test(await page.getByTestId('journal-h-0002').innerText()));
  await page.getByTestId('review-open-h-0002').click();
  await page.getByTestId('review-what').fill('Held for a week');
  await page.getByTestId('review-learned').fill('The plan worked');
  await page.getByTestId('review-emotion').getByText('calm', { exact: true }).click();
  await page.getByTestId('review-save').click();
  await page.getByText('Held for a week').waitFor({ timeout: 10_000 });
  check('the review after the trade is saved', /The plan worked/.test(await page.getByTestId('journal-h-0002').innerText()));
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
    await readLevelOne(page);
    await glossary(page);
    await mistakes(page);
    await journal(page);
    await page.reload();
    await appReady(page);
    await openTab(page, 'Learn');
    await page.getByText(/8 of 8 lessons done\. Level complete\./).waitFor({ timeout: 10_000 });
    check('progress is still there after a reload', true);
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
