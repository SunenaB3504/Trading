import { mkdirSync, writeFileSync } from 'node:fs';
import { sha256Hex } from '@trading/core';
import { OpenTimestampsAnchorer, nodeHttpPoster } from '@trading/data-service';

/**
 * One live stamp to prove the OpenTimestamps adapter end to end. It sends the SHA-256 of a fixed test sentence
 * (nothing from the project) to the public calendars and saves the returned proof as a `.ots` file.
 *
 * Usage:  pnpm ots:probe
 */
const TEXT = 'trading-app OpenTimestamps adapter probe';

const anchorer = new OpenTimestampsAnchorer({ poster: nodeHttpPoster(), now: () => Date.now() });
const digest = sha256Hex(TEXT);
const proof = await anchorer.submit(digest);
mkdirSync('data/derived', { recursive: true });
const file = 'data/derived/probe.ots';
writeFileSync(file, Buffer.from(proof.proof, 'hex'));
console.log(
  JSON.stringify({
    text: TEXT,
    digest,
    provider: proof.provider,
    submittedAt: proof.submittedAt,
    bytes: proof.proof.length / 2,
    file,
  }),
);
