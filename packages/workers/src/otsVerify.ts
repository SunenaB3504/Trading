import { readFileSync } from 'node:fs';
import { nodeHttpClient, verifyBitcoinAttestations } from '@trading/data-service';

/**
 * Checks the Bitcoin attestations of an upgraded OpenTimestamps proof against two public block explorers
 * (GET only): header hash, proof-of-work, Merkle root. See `otsVerify.ts` in the data service for what it proves.
 *
 * Usage:  pnpm ots:verify data/derived/probe.upgraded.ots
 */
const [file] = process.argv.slice(2);
if (file === undefined) {
  console.error('Usage: pnpm ots:verify FILE.ots');
  process.exit(2);
}
const checks = await verifyBitcoinAttestations(
  new Uint8Array(readFileSync(file)),
  nodeHttpClient({ userAgent: 'trading-app-ots-verify' }),
);
for (const c of checks)
  console.log(
    JSON.stringify({
      ...c,
      blockTimeUtc: c.blockTime === null ? null : new Date(c.blockTime * 1000).toISOString(),
    }),
  );
if (checks.length === 0) console.log('no Bitcoin attestation in this proof (still pending?)');
process.exit(checks.length > 0 && checks.every((c) => c.ok) ? 0 : 1);
