import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  BUCKET_RULES_V1,
  ELIGIBILITY_V1,
  UNIVERSE_V1_DEFAULT,
  bucketRulesHash,
  canonicalJson,
  configHash,
  selectUniverse,
  sha256Hex,
} from '@trading/core';
import type { UniverseCandidate, UniverseConfig, UniverseManifest } from '@trading/core';
import { OpenTimestampsAnchorer, nodeHttpPoster } from '@trading/data-service';
import { e7Filter, option, pilotInstruments, sharesFrom } from './universe';
import type { BucketFile, E7 } from './universe';

/**
 * Freezes the evaluation universe and its buckets (SSD §10.5, principles 5, 10 and 11, D40): the draw, every input
 * hash it depended on, the buckets of all candidates and the disputed event days of the members are written to
 * `data/frozen/` and hashed. With `--stamp` the hash of the universe file is also sent to the OpenTimestamps
 * calendars (D16), so the date of the freeze is proved by someone other than us.
 *
 * Usage:  pnpm universe:freeze --buckets data/derived/buckets_2018-10-01.json --disputes data/derived/disputes.json
 *            --seed "words" --shares steady=0.27,... --exclude-file data/pilot_symbols.txt
 *            --allow-single-provider [--stamp] [--out data/frozen/universe_v1.json]
 */
interface DisputesFull {
  from: string;
  to: string;
  volumeToleranceBps: number;
  list: { threshold: number; hash: string };
  checks: Array<{ symbol: string; returnCoverage: number | null; returnDisputedDates: string[] }>;
}

const hashFile = (path: string): string => sha256Hex(readFileSync(path, 'utf8'));

interface Prepared {
  data: BucketFile & { rulesHash: string; sectorsHash: string };
  disputes: DisputesFull;
  e7: (id: string) => E7;
  symbolOf: (id: string) => string;
  allowSingle: boolean;
  config: UniverseConfig;
  candidates: UniverseCandidate[];
  pilotFile: string;
}

function prepare(args: readonly string[]): Prepared | null {
  const bucketsFile = option(args, '--buckets');
  const disputesFile = option(args, '--disputes');
  const seed = option(args, '--seed');
  const pilotFile = option(args, '--exclude-file');
  if (
    bucketsFile === undefined ||
    disputesFile === undefined ||
    seed === undefined ||
    pilotFile === undefined
  )
    return null;
  const data = JSON.parse(readFileSync(bucketsFile, 'utf8')) as Prepared['data'];
  const aliases = data.aliases ?? {};
  const e7 = e7Filter(disputesFile, aliases);
  const allowSingle = args.includes('--allow-single-provider');
  const candidates: UniverseCandidate[] = data.results.map((r) => ({
    instrumentId: r.instrumentId,
    eligible:
      e7(r.instrumentId) === 'pass' || (allowSingle && e7(r.instrumentId) === 'single-provider'),
    bucket: r.bucket,
  }));
  return {
    data,
    disputes: JSON.parse(readFileSync(disputesFile, 'utf8')) as DisputesFull,
    e7,
    symbolOf: (id) => (aliases[id] ?? [id]).slice(-1)[0] ?? id,
    allowSingle,
    config: {
      ...UNIVERSE_V1_DEFAULT,
      seed,
      size: Number(option(args, '--size') ?? UNIVERSE_V1_DEFAULT.size),
      shares: sharesFrom(option(args, '--shares')),
      excluded: pilotInstruments(pilotFile, data),
    },
    candidates,
    pilotFile,
  };
}

function frozenBody(p: Prepared, manifest: UniverseManifest, bucketsCopy: string) {
  const aliases = p.data.aliases ?? {};
  const dates = new Map(p.disputes.checks.map((c) => [c.symbol, c.returnDisputedDates]));
  return {
    version: 'universe-v1',
    asOf: p.data.asOf,
    frozenAt: new Date().toISOString(),
    inputs: {
      eligibilityConfigHash: configHash(ELIGIBILITY_V1),
      bucketRulesHash: bucketRulesHash(BUCKET_RULES_V1),
      sectorsHash: p.data.sectorsHash,
      bucketsFileHash: hashFile(bucketsCopy),
      pilotSymbolsHash: hashFile(p.pilotFile),
      disputesListHash: p.disputes.list.hash,
      crossCheckRange: [p.disputes.from, p.disputes.to],
      volumeToleranceBps: p.disputes.volumeToleranceBps,
      e7: `day-to-day returns agree on at least ${String(p.disputes.list.threshold)} of sessions; names with no second-provider series are ${p.allowSingle ? 'kept and flagged single_provider' : 'dropped'}`,
    },
    config: p.config,
    candidates: p.candidates.map((c) => ({
      instrumentId: c.instrumentId,
      symbol: p.symbolOf(c.instrumentId),
      bucket: c.bucket,
      e7: p.e7(c.instrumentId),
      eligible: c.eligible,
    })),
    buckets: manifest.buckets,
    shortfall: manifest.shortfall,
    members: manifest.members.map((m) => ({
      instrumentId: m.instrumentId,
      symbol: p.symbolOf(m.instrumentId),
      bucket: m.bucket,
      singleProvider: p.e7(m.instrumentId) === 'single-provider',
      eventDisputedDates: [
        ...new Set((aliases[m.instrumentId] ?? []).flatMap((a) => dates.get(a) ?? [])),
      ].sort(),
    })),
    manifestHash: manifest.manifestHash,
  };
}

export async function main(args: readonly string[]): Promise<number> {
  const p = prepare(args);
  if (p === null) {
    console.error(
      'Usage: pnpm universe:freeze --buckets F --disputes F --seed "words" --exclude-file F',
    );
    return 2;
  }
  const manifest = selectUniverse(p.candidates, p.config);
  const out = option(args, '--out') ?? 'data/frozen/universe_v1.json';
  const bucketsCopy = out.replace(/universe_v1\.json$/, `buckets_${p.data.asOf}.json`);
  mkdirSync(dirname(out), { recursive: true });
  copyFileSync(option(args, '--buckets') as string, bucketsCopy);
  const body = frozenBody(p, manifest, bucketsCopy);
  const fileHash = sha256Hex(canonicalJson(body));
  writeFileSync(out, JSON.stringify({ ...body, fileHash }, null, 1));
  let stamp = 'not stamped';
  if (args.includes('--stamp')) {
    const anchorer = new OpenTimestampsAnchorer({
      poster: nodeHttpPoster(),
      now: () => Date.now(),
    });
    const proof = await anchorer.submit(fileHash);
    writeFileSync(out.replace(/\.json$/, '.ots'), Buffer.from(proof.proof, 'hex'));
    stamp = `${proof.provider} at ${new Date(proof.submittedAt).toISOString()}`;
  }
  console.log(
    JSON.stringify({
      out,
      members: body.members.length,
      shortfall: manifest.shortfall,
      singleProvider: body.members.filter((m) => m.singleProvider).length,
      buckets: manifest.buckets,
      fileHash,
      stamp,
    }),
  );
  return 0;
}

if (process.argv[1]?.endsWith('freezeUniverse.ts') === true) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e);
      process.exit(2);
    },
  );
}
