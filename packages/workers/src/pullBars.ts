import { createRng } from '@trading/core';
import { FileRawStore, RateLimiter, nodeHttpClient, pullRange } from '@trading/data-service';
import type { FetchDeps, SessionPull } from '@trading/data-service';

/**
 * Pulls NSE's daily bhavcopy and PR archive for a range of sessions into `data/raw/nse-bars` (WP-2.9).
 * Sessions already stored are skipped, so the pull can be stopped and run again. About four seconds a
 * session at the default spacing, so a year takes roughly 25 minutes.
 *
 * Usage:  pnpm pull:bars --from 2024-02-01 --to 2026-10-16 [--dir data/raw/nse-bars] [--spacing-ms 2000]
 *            [--weekends] (also Saturdays and Sundays, bhavcopy only, to find special sessions)
 *            [--recheck-missing] (ask again for dates earlier answered "no such file")
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

function summary(results: readonly SessionPull[]): object {
  const count = (k: 'bhavcopy' | 'pr') => ({
    stored: results.filter((r) => r[k] === 'stored').length,
    have: results.filter((r) => r[k] === 'have').length,
    none: results.filter((r) => r[k] === 'none').length,
    failed: results.filter((r) => r[k] === 'failed').length,
  });
  return { sessions: results.length, bhavcopy: count('bhavcopy'), pr: count('pr') };
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
  if (from === undefined || to === undefined) {
    console.error('Usage: pnpm pull:bars --from YYYY-MM-DD --to YYYY-MM-DD');
    return 2;
  }
  const deps = depsFor(
    option(args, '--dir') ?? 'data/raw/nse-bars',
    Number(option(args, '--spacing-ms') ?? '2000'),
    `pull-bars-${from}-${to}`,
  );
  let failed = 0;
  const results = await pullRange(
    from,
    to,
    deps,
    (s) => {
      if (s.problems.length > 0) failed += 1;
      const problem = s.problems.length > 0 ? ` PROBLEM ${s.problems.join('; ')}` : '';
      console.log(`${s.date} bhavcopy ${s.bhavcopy}, PR ${s.pr}${problem}`);
    },
    { weekends: args.includes('--weekends'), recheckMissing: args.includes('--recheck-missing') },
  );
  console.log(JSON.stringify(summary(results)));
  return failed === 0 ? 0 : 1;
}

if (process.argv[1]?.endsWith('pullBars.ts') === true) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e);
      process.exit(2);
    },
  );
}
