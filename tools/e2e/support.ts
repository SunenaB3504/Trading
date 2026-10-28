import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';

/** Shared helpers for the browser checks: a static file server for the exported web build and a check log. */
export const dist = resolve('packages/app/dist');

const types: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

export function serveStatic(port = 0): Promise<Server> {
  if (!existsSync(join(dist, 'index.html'))) throw new Error('export the web build first');
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
    let file = join(dist, path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html');
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
    res.end(readFileSync(file));
  });
  return new Promise((resolveListen) =>
    server.listen(port, '127.0.0.1', () => resolveListen(server)),
  );
}

export interface Check {
  name: string;
  ok: boolean;
  detail?: string;
}

export function checkLog(): {
  checks: Check[];
  check: (name: string, ok: boolean, detail?: string) => void;
} {
  const checks: Check[] = [];
  return {
    checks,
    check: (name, ok, detail) => {
      checks.push(detail === undefined ? { name, ok } : { name, ok, detail });
    },
  };
}

/** Where each screen lives since the learning-app navigation (D42): sub-tabs sit inside a main section. */
const PARENT: Record<string, string> = {
  Trade: 'Practise',
  Funds: 'Practise',
  'Time Machine': 'Practise',
  Builder: 'Practise',
  Charts: 'Practise',
  'Strategy Lab': 'Practise',
  Robo: 'Practise',
  'F&O': 'Practise',
  'Options Lab': 'Practise',
  Path: 'Learn',
  Glossary: 'Learn',
  Mistakes: 'Measure',
  Journal: 'Measure',
  Ledger: 'Practise',
  Universe: 'Practise',
  Compare: 'Practise',
  Report: 'Practise',
  General: 'Settings',
  Profiles: 'Settings',
  Backup: 'Settings',
  Data: 'Settings',
};

/** Opens a screen by its tab name, selecting its main section first when it has one. */
export async function openTab(
  page: { getByRole: (r: 'tab', o: { name: string; exact: boolean }) => { first: () => { click: () => Promise<void> } } },
  name: string,
): Promise<void> {
  const parent = PARENT[name];
  if (parent !== undefined) await page.getByRole('tab', { name: parent, exact: true }).first().click();
  await page.getByRole('tab', { name, exact: true }).first().click();
}

/** Waits until the app has opened a profile and shows its main sections. */
export async function appReady(page: {
  getByRole: (r: 'tab', o: { name: string; exact: boolean }) => { first: () => { waitFor: (o: { timeout: number }) => Promise<void> } };
}): Promise<void> {
  await page.getByRole('tab', { name: 'Home', exact: true }).first().waitFor({ timeout: 30_000 });
}
