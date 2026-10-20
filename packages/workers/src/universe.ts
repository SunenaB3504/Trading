import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { UNIVERSE_V1_DEFAULT, selectUniverse } from '@trading/core';
import type { Bucket, UniverseCandidate, UniverseConfig } from '@trading/core';

/**
 * Draws the evaluation universe from a bucket file made by `pnpm buckets` (SSD §10.5, D8, D40). The draw is
 * seeded and astro-blind. The result is a DRAFT until rule E7 (two providers) has been applied to the candidates
 * and the owner has chosen the shares and the seed.
 *
 * Usage:  pnpm universe --buckets data/derived/buckets_2018-10-01.json --seed "words" [--size 100]
 *            [--shares steady=0.27,underdogs=0.27,speculative=0.28,cyclicals=0.05,mundane=0.13]
 *            [--exclude-file data/pilot_symbols.txt] [--disputes data/derived/disputes.json]
 *            [--allow-single-provider] (keep names with no second-provider series, flagged; the default drops them) [--out data/derived/universe_draft.json]
 */
export function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

export function sharesFrom(text: string | undefined): UniverseConfig['shares'] {
  if (text === undefined) return UNIVERSE_V1_DEFAULT.shares;
  const out: Record<string, number> = { ...UNIVERSE_V1_DEFAULT.shares };
  for (const part of text.split(',')) {
    const [name, value] = part.split('=');
    if (name === undefined || value === undefined || !(name in out))
      throw new Error(`bad share: ${part}`);
    out[name] = Number(value);
  }
  return out as UniverseConfig['shares'];
}

export interface DisputesFile {
  list: { threshold: number };
  checks: Array<{ symbol: string; returnCoverage: number | null }>;
}

export interface BucketFile {
  asOf: string;
  /** Every exchange symbol an instrument has traded under. */
  aliases?: Record<string, string[]>;
  results: Array<{ instrumentId: string; bucket: Bucket | null }>;
}

export type E7 = 'pass' | 'single-provider' | 'fail';

/**
 * Rule E7 (SSD §10.1): a name needs two providers whose day-to-day returns agree on at least the threshold share of
 * sessions. Without a disputes file the rule is not applied (a draft). A name with no second-provider series at all
 * (mostly names delisted or merged since: Yahoo drops them) is 'single-provider': it fails unless the owner allows
 * it, in which case it stays in, flagged. A name with a second provider whose returns disagree always fails.
 */
export function e7Filter(
  file: string | undefined,
  aliases: Record<string, string[]>,
): (instrumentId: string) => E7 {
  if (file === undefined) return () => 'pass';
  const d = JSON.parse(readFileSync(file, 'utf8')) as DisputesFile;
  const bySymbol = new Map(d.checks.map((c) => [c.symbol, c.returnCoverage]));
  return (id) => {
    const found = (aliases[id] ?? []).filter((a) => bySymbol.has(a));
    if (found.some((a) => (bySymbol.get(a) ?? 0) >= d.list.threshold)) return 'pass';
    return found.some((a) => bySymbol.get(a) !== null) ? 'fail' : 'single-provider';
  };
}

/** The instruments that ever traded under one of the listed exchange symbols (the pilot stocks). */
export function pilotInstruments(file: string | undefined, data: BucketFile): string[] {
  if (file === undefined) return [];
  const names = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
  return data.results
    .map((r) => r.instrumentId)
    .filter((id) => (data.aliases?.[id] ?? []).some((a) => names.includes(a)));
}

export function main(args: readonly string[]): number {
  const file = option(args, '--buckets');
  const seed = option(args, '--seed');
  if (file === undefined || seed === undefined) {
    console.error('Usage: pnpm universe --buckets FILE --seed "words"');
    return 2;
  }
  const data = JSON.parse(readFileSync(file, 'utf8')) as BucketFile;
  const e7 = e7Filter(option(args, '--disputes'), data.aliases ?? {});
  const allowSingle = args.includes('--allow-single-provider');
  const candidates: UniverseCandidate[] = data.results.map((r) => ({
    instrumentId: r.instrumentId,
    eligible:
      e7(r.instrumentId) === 'pass' || (allowSingle && e7(r.instrumentId) === 'single-provider'),
    bucket: r.bucket,
  }));
  const excluded = pilotInstruments(option(args, '--exclude-file'), data);
  const manifest = selectUniverse(candidates, {
    ...UNIVERSE_V1_DEFAULT,
    seed,
    size: Number(option(args, '--size') ?? UNIVERSE_V1_DEFAULT.size),
    shares: sharesFrom(option(args, '--shares')),
    excluded,
  });
  const out = option(args, '--out') ?? 'data/derived/universe_draft.json';
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    JSON.stringify(
      {
        status:
          option(args, '--disputes') === undefined
            ? 'DRAFT: rule E7 not applied; shares and seed not yet chosen by the owner'
            : 'DRAFT: rule E7 applied; shares and seed not yet chosen by the owner',
        asOf: data.asOf,
        singleProvider: manifest.members
          .filter((m) => e7(m.instrumentId) === 'single-provider')
          .map((m) => m.instrumentId),
        manifest,
      },
      null,
      1,
    ),
  );
  console.log(
    JSON.stringify({
      asOf: data.asOf,
      chosen: manifest.members.length,
      shortfall: manifest.shortfall,
      excludedPilotInstruments: excluded.length,
      singleProviderKept: manifest.members.filter((m) => e7(m.instrumentId) === 'single-provider')
        .length,
      buckets: manifest.buckets,
      hash: manifest.manifestHash,
      out,
    }),
  );
  return 0;
}

if (process.argv[1]?.endsWith('universe.ts') === true) process.exit(main(process.argv.slice(2)));
