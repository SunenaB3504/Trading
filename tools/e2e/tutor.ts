/**
 * AI tutor checks for the web app (MIP v4.1 Stage 5). The Anthropic API is replaced by a local stand-in, so no key is
 * spent. Preview answers with the network cut off; a stock-tip request is declined; Off gives the built-in coach; On
 * with no key, a refused key and a spent limit each give the coach answer; a good key gives a checked live answer with
 * the facts under it; and the key is found nowhere in the page's storage.
 *
 * Usage:  pnpm --filter @trading/app export:web && pnpm e2e:tutor
 */
import type { AddressInfo } from 'node:net';
import { chromium } from 'playwright-core';
import type { BrowserContext, Page, Route } from 'playwright-core';
import { appReady, checkLog, openTab, serveStatic } from './support';

const { checks, check } = checkLog();
const KEY = 'sk-ant-e2e-0123456789abcdefghij';
const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' };

let status = 200;
let calls = 0;
const live = {
  id: 'm1', type: 'message', role: 'assistant', model: 'claude-haiku-5-5', stop_reason: 'end_turn', stop_sequence: null,
  content: [{ type: 'text', text: 'You have done {{fact:lessons_done}}. Read the lesson on order types next.' }],
  usage: { input_tokens: 600, output_tokens: 40 },
};

async function fakeApi(route: Route): Promise<void> {
  if (route.request().method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
  calls += 1;
  const body = status === 200 ? live : { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } };
  return route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
}

const section = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('tab', { name, exact: true }).first().click();
};

/** Opens Home afresh, so an answer from an earlier press is not mistaken for a new one. */
const freshHome = async (page: Page): Promise<void> => {
  await section(page, 'Learn');
  await section(page, 'Home');
};

async function ask(page: Page, id: string): Promise<string> {
  await page.getByTestId(id).click();
  const answer = page.getByTestId(`${id}-answer`);
  await answer.waitFor({ timeout: 15_000 });
  return answer.innerText();
}

async function setMode(page: Page, mode: 'off' | 'preview' | 'on'): Promise<void> {
  await openTab(page, 'General');
  await page.getByTestId(`ai-mode-${mode}`).click();
}

async function storageText(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const out: string[] = [JSON.stringify({ ...localStorage }), JSON.stringify({ ...sessionStorage })];
    for (const info of await indexedDB.databases()) {
      if (info.name === undefined) continue;
      const db = await new Promise<IDBDatabase>((res, rej) => {
        const r = indexedDB.open(info.name as string);
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
      for (const name of Array.from(db.objectStoreNames)) {
        const rows = await new Promise<unknown[]>((res, rej) => {
          const r = db.transaction(name).objectStore(name).getAll();
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
        out.push(JSON.stringify(rows, (_k, v: unknown) => (v instanceof ArrayBuffer ? Array.from(new Uint8Array(v)) : v)));
      }
      db.close();
    }
    return out.join('\n');
  });
}

async function preview(page: Page, context: BrowserContext): Promise<void> {
  await context.setOffline(true);
  await freshHome(page);
  const text = await ask(page, 'home-guide');
  check('Preview answers with the network cut off, marked as a sample', /Sample answer \(Preview/.test(text), text);
  await section(page, 'Tutor');
  await page.getByTestId('tutor-ask-q').fill('give me a stock tip for tomorrow');
  const declined = await ask(page, 'tutor-ask');
  check('a request for a stock tip is declined', /Not answered/.test(declined) && /not answer|never/i.test(declined), declined);
  await context.setOffline(false);
  check('no call went to the AI in Preview or when declining', calls === 0, String(calls));
}

async function fallbacks(page: Page): Promise<void> {
  await setMode(page, 'off');
  await freshHome(page);
  check('Off gives the built-in coach answer', /Built-in coach/.test(await ask(page, 'home-guide')));
  await setMode(page, 'on');
  await freshHome(page);
  check('On with no key gives the coach answer', /Built-in coach/.test(await ask(page, 'home-guide')));
  await section(page, 'Tutor');
  await page.getByTestId('ai-key').fill(KEY);
  await page.getByTestId('ai-key-save').click();
  await page.getByText('A key is saved on this device.').waitFor({ timeout: 10_000 });
  status = 401;
  await page.getByTestId('ai-key-test').click();
  await page.getByText(/refused or the API could not be reached/).waitFor({ timeout: 15_000 });
  check('Test key says a refused key does not work', true);
  await freshHome(page);
  check('a refused key gives the coach answer', /Built-in coach/.test(await ask(page, 'home-guide')));
}

async function liveAnswer(page: Page): Promise<void> {
  status = 200;
  const before = calls;
  await freshHome(page);
  const text = await ask(page, 'home-guide');
  check('a good key gives a live answer with its figures filled by code', /AI answer/.test(text) && /0 of 15/.test(text), text);
  check('the facts used and the model are shown under it', /Facts used: lessons done 0 of 15/.test(text) && /claude-haiku-5-5/.test(text), text);
  check('exactly one call was made', calls === before + 1, String(calls - before));
  await section(page, 'Tutor');
  await page.getByText(/, 1 calls/).waitFor({ timeout: 10_000 }).catch(() => undefined);
  const meter = await page.getByTestId('ai-meter').innerText();
  check('the usage meter counted the call', /, 1 calls/.test(meter), meter);
  check('the answer is kept for later', (await page.getByText(/Learning guide, \d{4}-\d{2}-\d{2}/).count()) === 1);
  const stored = await storageText(page);
  check('the key is in no page storage', !stored.includes(KEY));
}

async function limit(page: Page): Promise<void> {
  await openTab(page, 'General');
  await page.getByTestId('ai-limit').fill('0');
  await page.getByText('Save limit').click();
  const before = calls;
  await freshHome(page);
  check('at the limit the coach answers and no call is made', /Built-in coach/.test(await ask(page, 'home-guide')) && calls === before);
}

async function main(): Promise<void> {
  const web = await serveStatic();
  const url = `http://127.0.0.1:${(web.address() as AddressInfo).port}/`;
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  await context.route('https://api.anthropic.com/**', fakeApi);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('requestfailed', (r) => { if (process.env.DEBUG_E2E) console.log('FAILED', r.url(), r.failure()?.errorText); });
  page.on('console', (m) => { if (process.env.DEBUG_E2E) console.log('CONSOLE', m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  try {
    await page.goto(url);
    await appReady(page);
    await preview(page, context);
    await fallbacks(page);
    await liveAnswer(page);
    await limit(page);
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
