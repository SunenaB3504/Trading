import { readFileSync } from 'node:fs';
import { createRng } from '@trading/core';
import { FileRawStore, RateLimiter, nodeHttpClient, pullSymbols } from '@trading/data-service';
import type { FetchDeps } from '@trading/data-service';

/**
 * Pulls Yahoo daily series into `data/raw/yahoo` for the cross-check of the exchange series (WP-2.9, rule E7).
 * Yahoo is only a cross-check (T9): its prices are adjusted for later splits and bonuses. Symbols already
 * stored for the same range are skipped, so the pull can be stopped and run again.
 *
 * Usage:  pnpm pull:yahoo --from 2018-01-01 --to 2026-10-16 (--symbols RELIANCE,TCS | --symbols-file list.txt)
 *            [--dir data/raw/yahoo] [--spacing-ms 1500]
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function symbolsFrom(args: readonly string[]): string[] {
  const inline = option(args, '--symbols');
  const file = option(args, '--symbols-file');
  const raw = inline ?? (file === undefined ? '' : readFileSync(file, 'utf8').replace(/\r/g, ''));
  return raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s !== '');
}

function depsFor(dir: string, spacing: number, seed: string): FetchDeps {
  const now = (): number => Date.now();
  return {
    client: nodeHttpClient({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    }),
    store: new FileRawStore(dir),
    limiter: new RateLimiter(spacing, now, sleep),
    now,
    retry: {
      maxAttempts: 4,
      baseDelayMs: 2_000,
      factor: 2,
      maxDelayMs: 30_000,
      jitter: 0.2,
      sleep,
      rng: createRng(seed),
    },
  };
}

export async function main(args: readonly string[]): Promise<number> {
  const from = option(args, '--from');
  const to = option(args, '--to');
  const symbols = symbolsFrom(args);
  if (from === undefined || to === undefined || symbols.length === 0) {
    console.error(
      'Usage: pnpm pull:yahoo --from YYYY-MM-DD --to YYYY-MM-DD --symbols A,B | --symbols-file f',
    );
    return 2;
  }
  const deps = depsFor(
    option(args, '--dir') ?? 'data/raw/yahoo',
    Number(option(args, '--spacing-ms') ?? '1500'),
    `pull-yahoo-${from}-${to}`,
  );
  const results = await pullSymbols(deps, symbols, from, to);
  for (const r of results)
    console.log(`${r.symbol} ${r.result}${r.problem === undefined ? '' : ` PROBLEM ${r.problem}`}`);
  const n = (k: string): number => results.filter((r) => r.result === k).length;
  console.log(
    JSON.stringify({
      symbols: results.length,
      stored: n('stored'),
      have: n('have'),
      none: n('none'),
      failed: n('failed'),
    }),
  );
  return n('failed') === 0 ? 0 : 1;
}

if (process.argv[1]?.endsWith('pullYahoo.ts') === true) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e);
      process.exit(2);
    },
  );
}
