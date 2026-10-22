import { createServer } from 'node:http';
import type { Server } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * A local stand-in for the snapshot host (D26): serves the files in a folder over GET on 127.0.0.1 with the
 * cross-origin header a browser needs. Only `base_tickets_YYYYMMDD.json` names are served. The real host (the
 * owner's website) is set up the same way; the app only needs the address changed.
 *
 * Usage:  pnpm snapshot:serve [--dir data/publish] [--port 8787]
 */
const NAME = /^\/base_tickets_\d{8}\.json$/;

export function snapshotServer(dir: string): Server {
  return createServer((req, res) => {
    const path = (req.url ?? '').split('?')[0] ?? '';
    const headers = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' };
    const file = join(dir, path);
    if (req.method !== 'GET' || !NAME.test(path) || !existsSync(file)) {
      res.writeHead(req.method === 'GET' ? 404 : 405, headers).end();
      return;
    }
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' }).end(readFileSync(file));
  });
}

function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

if (process.argv[1]?.endsWith('serveSnapshots.ts') === true) {
  const args = process.argv.slice(2);
  const port = Number(option(args, '--port') ?? '8787');
  snapshotServer(option(args, '--dir') ?? 'data/publish').listen(port, '127.0.0.1', () =>
    console.log(`serving snapshots at http://127.0.0.1:${String(port)}/`),
  );
}
