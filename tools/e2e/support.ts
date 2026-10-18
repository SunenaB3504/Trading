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
