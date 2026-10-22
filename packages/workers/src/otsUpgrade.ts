import { readFileSync, writeFileSync } from 'node:fs';
import { nodeHttpClient, upgradeProof } from '@trading/data-service';

/**
 * Asks the calendars whether a pending OpenTimestamps proof has reached the Bitcoin chain, and writes the
 * completed proof if so. GET only, to the trusted calendars named in the proof. Safe to run again and again.
 *
 * Usage:  pnpm ots:upgrade data/derived/probe.ots [--out data/derived/probe.upgraded.ots]
 */
const [file] = process.argv.slice(2);
if (file === undefined) {
  console.error('Usage: pnpm ots:upgrade FILE.ots [--out FILE]');
  process.exit(2);
}
const outIndex = process.argv.indexOf('--out');
const result = await upgradeProof(
  new Uint8Array(readFileSync(file)),
  nodeHttpClient({ userAgent: 'trading-app-ots-upgrade' }),
);
if (result.status === 'attested') {
  const out = outIndex >= 0 ? (process.argv[outIndex + 1] ?? file) : file;
  writeFileSync(out, result.proof);
  console.log(
    JSON.stringify({
      status: result.status,
      bitcoinHeights: result.bitcoinHeights,
      pending: result.pending,
      written: out,
    }),
  );
} else {
  console.log(
    JSON.stringify({ status: result.status, pending: result.pending, notes: result.notes }),
  );
}
