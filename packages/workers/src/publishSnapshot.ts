import { createPrivateKey, sign } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalJson, sha256Hex } from '@trading/core';

/**
 * Makes the signed daily snapshot file the app downloads (SSD §7.6, D26): `base_tickets_YYYYMMDD.json` holding a
 * manifest, the payload and an Ed25519 signature over the canonical manifest. The envelope shape is the one the
 * app checks (`packages/app/src/snapshotClient/envelope.ts`); a test in `tools/` runs the two against each other.
 * The payload is prices and objective facts only, never astro fields (D26, D34).
 *
 * Usage:  pnpm snapshot:publish --payload data/derived/snapshot_universe_v2.json --as-of 2026-10-16
 *            --key C:\keys\snapshot_k1.pem --key-id k1 [--out data/publish]
 */
export interface EnvelopeInput {
  payload: unknown;
  asOf: string;
  keyId: string;
  privateKeyPem: string;
  createdAt: number;
}

export function buildEnvelopeText(input: EnvelopeInput): string {
  const manifest = {
    version: 1,
    snapshotId: `snap-${input.asOf}-${sha256Hex(canonicalJson(input.payload)).slice(0, 12)}`,
    asOf: input.asOf,
    createdAt: input.createdAt,
    payloadHash: sha256Hex(canonicalJson(input.payload)),
    keyId: input.keyId,
  };
  const key = createPrivateKey(input.privateKeyPem);
  const signature = sign(null, Buffer.from(canonicalJson(manifest), 'utf8'), key).toString('hex');
  return JSON.stringify({ manifest, payload: input.payload, signature });
}

export const fileNameFor = (asOf: string): string =>
  `base_tickets_${asOf.replaceAll('-', '')}.json`;

function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

export function main(args: readonly string[]): number {
  const payloadFile = option(args, '--payload');
  const asOf = option(args, '--as-of');
  const keyFile = option(args, '--key');
  if (payloadFile === undefined || asOf === undefined || keyFile === undefined) {
    console.error(
      'Usage: pnpm snapshot:publish --payload FILE --as-of YYYY-MM-DD --key PEM [--key-id k1] [--out DIR]',
    );
    return 2;
  }
  const text = buildEnvelopeText({
    payload: JSON.parse(readFileSync(payloadFile, 'utf8')) as unknown,
    asOf,
    keyId: option(args, '--key-id') ?? 'k1',
    privateKeyPem: readFileSync(keyFile, 'utf8'),
    createdAt: Date.now(),
  });
  const dir = option(args, '--out') ?? 'data/publish';
  mkdirSync(dir, { recursive: true });
  const path = join(dir, fileNameFor(asOf));
  writeFileSync(path, text, 'utf8');
  console.log(JSON.stringify({ written: path, bytes: text.length }));
  return 0;
}

if (process.argv[1]?.endsWith('publishSnapshot.ts') === true)
  process.exit(main(process.argv.slice(2)));
