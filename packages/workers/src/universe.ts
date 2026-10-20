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
 *            [--exclude-file symbols.txt] [--out data/derived/universe_draft.json]
 */
function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function sharesFrom(text: string | undefined): UniverseConfig['shares'] {
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

interface BucketFile {
  asOf: string;
  results: Array<{ instrumentId: string; bucket: Bucket | null }>;
}

export function main(args: readonly string[]): number {
  const file = option(args, '--buckets');
  const seed = option(args, '--seed');
  if (file === undefined || seed === undefined) {
    console.error('Usage: pnpm universe --buckets FILE --seed "words"');
    return 2;
  }
  const data = JSON.parse(readFileSync(file, 'utf8')) as BucketFile;
  const candidates: UniverseCandidate[] = data.results.map((r) => ({
    instrumentId: r.instrumentId,
    eligible: true,
    bucket: r.bucket,
  }));
  const excludeFile = option(args, '--exclude-file');
  const excluded =
    excludeFile === undefined
      ? []
      : readFileSync(excludeFile, 'utf8')
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter((s) => s !== '');
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
        status: 'DRAFT: rule E7 not applied; shares and seed not yet chosen by the owner',
        asOf: data.asOf,
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
      buckets: manifest.buckets,
      hash: manifest.manifestHash,
      out,
    }),
  );
  return 0;
}

if (process.argv[1]?.endsWith('universe.ts') === true) process.exit(main(process.argv.slice(2)));
