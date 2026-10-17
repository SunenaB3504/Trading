import { createServer } from 'node:http';
import type { IncomingMessage, Server } from 'node:http';
import { canonicalJson } from '@trading/core';
import type { ServiceRequest, ServiceResponse } from './types';

const MAX_BODY_BYTES = 1_000_000;

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req as AsyncIterable<Buffer>) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new RangeError('body too large');
    chunks.push(chunk);
  }
  return size === 0 ? undefined : (JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown);
}

/**
 * Local-only HTTP front for the handler: bound to 127.0.0.1, read-mostly, with CORS opened only for
 * the origin given (the web app's dev origin). It holds no ledger and no write path beyond snapshots.
 */
export function startServer(
  handle: (req: ServiceRequest) => ServiceResponse,
  options: { port: number; allowedOrigin?: string },
): Promise<Server> {
  const server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1');
      let out: ServiceResponse;
      try {
        const body = req.method === 'POST' ? await readBody(req) : undefined;
        out = handle({
          method: req.method ?? 'GET',
          path: url.pathname,
          query: Object.fromEntries(url.searchParams),
          ...(body === undefined ? {} : { body }),
        });
      } catch (e) {
        out = { status: 400, body: { error: e instanceof Error ? e.message : 'bad request' } };
      }
      res.writeHead(out.status, {
        'content-type': 'application/json; charset=utf-8',
        ...(options.allowedOrigin === undefined
          ? {}
          : { 'access-control-allow-origin': options.allowedOrigin }),
      });
      res.end(canonicalJson(out.body));
    })();
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(options.port, '127.0.0.1', () => resolve(server));
  });
}
