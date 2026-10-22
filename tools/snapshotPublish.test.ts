import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { MemoryKv } from '../packages/app/src/store/kv';
import {
  LATEST_KEY,
  auditedFetch,
  pinnedEd25519,
  pullSnapshot,
  readVerified,
} from '../packages/app/src/snapshotClient/index';
import type { RawFetch } from '../packages/app/src/snapshotClient/index';
import { buildEnvelopeText, fileNameFor } from '../packages/workers/src/publishSnapshot';
import { snapshotServer } from '../packages/workers/src/serveSnapshots';

/** The publisher, the local host and the app's snapshot client, run against each other with a throwaway key. */
const dir = mkdtempSync(join(tmpdir(), 'snap-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const pem = privateKey.export({ format: 'pem', type: 'pkcs8' }).toString();
const publicHex = Buffer.from(publicKey.export({ format: 'jwk' }).x ?? '', 'base64url').toString(
  'hex',
);
const verifier = pinnedEd25519({ k1: publicHex });

const publish = (asOf: string, payload: unknown = { universe: 83, asOf }): void =>
  writeFileSync(
    join(dir, fileNameFor(asOf)),
    buildEnvelopeText({ payload, asOf, keyId: 'k1', privateKeyPem: pem, createdAt: 1 }),
  );

async function withServer<T>(run: (origin: string) => Promise<T>): Promise<T> {
  const server = snapshotServer(dir);
  await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
  try {
    return await run(`http://127.0.0.1:${String((server.address() as AddressInfo).port)}`);
  } finally {
    server.close();
  }
}

const rawFetch: RawFetch = (url, init) => fetch(url, init);

describe('publisher, local host and app client together', () => {
  it('a published snapshot is downloaded, verified and stored, then reported unchanged', async () => {
    publish('2026-06-10');
    const kv = new MemoryKv();
    await withServer(async (origin) => {
      const deps = {
        net: auditedFetch(origin, rawFetch),
        origin,
        verifier,
        kv,
        today: '2026-06-10',
      };
      expect((await pullSnapshot(deps)).status).toBe('updated');
      expect((await pullSnapshot(deps)).status).toBe('unchanged');
    });
    expect((await readVerified(kv, verifier))?.payload).toEqual({
      universe: 83,
      asOf: '2026-06-10',
    });
  });

  it('a file signed by another key is refused and the stored snapshot stays', async () => {
    publish('2026-06-11');
    const kv = new MemoryKv();
    const wrong = pinnedEd25519({ k1: '00'.repeat(32) });
    await withServer(async (origin) => {
      const res = await pullSnapshot({
        net: auditedFetch(origin, rawFetch),
        origin,
        verifier: wrong,
        kv,
        today: '2026-06-11',
      });
      expect(res.status).toBe('kept-previous');
    });
    expect(await kv.get(LATEST_KEY)).toBeNull();
  });

  it('nothing but snapshot files is served, and only by GET', async () => {
    await withServer(async (origin) => {
      expect((await fetch(`${origin}/secret.txt`)).status).toBe(404);
      expect((await fetch(`${origin}/base_tickets_20260610.json`, { method: 'POST' })).status).toBe(
        405,
      );
      const ok = await fetch(`${origin}/base_tickets_20260610.json`);
      expect(ok.headers.get('access-control-allow-origin')).toBe('*');
    });
  });
});
