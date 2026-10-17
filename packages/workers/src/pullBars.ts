import { createRng } from '@trading/core';
import { FileRawStore, RateLimiter, nodeHttpClient, pullRange } from '@trading/data-service';

/**
 * Pulls NSE's daily bhavcopy and PR archive for a range of sessions into `data/raw/nse-bars` (WP-2.9).
 * Sessions already stored are skipped, so the pull can be stopped and run again. About four seconds a
 * session at the default spacing, so a year takes roughly 25 minutes.
 *
 * Usage:  pnpm pull:bars --from 2024-02-01 --to 2026-10-16 [--dir data/raw/nse-bars] [--spacing-ms 2000]
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

export async function main(args: readonly string[]): Promise<number> {
  const from = option(args, '--from');
  const to = option(args, '--to');
  if (from === undefined || to === undefined) {
    console.error('Usage: pnpm pull:bars --from YYYY-MM-DD --to YYYY-MM-DD');
    return 2;
  }
  const store = new FileRawStore(option(args, '--dir') ?? 'data/raw/nse-bars');
  const now = (): number => Date.now();
  const spacing = Number(option(args, '--spacing-ms') ?? '2000');
  let failed = 0;
  const results = await pullRange(
    from,
    to,
    {
      client: nodeHttpClient({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
      }),
      store,
      limiter: new RateLimiter(spacing, now, sleep),
      now,
      retry: {
        maxAttempts: 4,
        baseDelayMs: 2_000,
        factor: 2,
        maxDelayMs: 30_000,
        jitter: 0.2,
        sleep,
        rng: createRng(`pull-bars-${from}-${to}`),
      },
    },
    (s) => {
      if (s.problems.length > 0) failed += 1;
      console.log(
        `${s.date} bhavcopy ${s.bhavcopy}, PR ${s.pr}${s.problems.length > 0 ? ` PROBLEM ${s.problems.join('; ')}` : ''}`,
      );
    },
  );
  const count = (k: 'bhavcopy' | 'pr', v: string): number =>
    results.filter((r) => r[k] === v).length;
  console.log(
    JSON.stringify({
      sessions: results.length,
      bhavcopy: {
        stored: count('bhavcopy', 'stored'),
        have: count('bhavcopy', 'have'),
        none: count('bhavcopy', 'none'),
        failed: count('bhavcopy', 'failed'),
      },
      pr: {
        stored: count('pr', 'stored'),
        have: count('pr', 'have'),
        none: count('pr', 'none'),
        failed: count('pr', 'failed'),
      },
    }),
  );
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
