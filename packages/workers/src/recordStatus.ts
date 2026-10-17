import { createRng, istDateOfInstant } from '@trading/core';
import {
  FileRawStore,
  RateLimiter,
  loadHistory,
  nodeHttpClient,
  recordDailyStatus,
} from '@trading/data-service';

/**
 * The daily recording job (WP-2.9): fetches the day's NSE security list and ASM and GSM reports and
 * keeps the raw responses in `data/raw/nse-status`. Run it once each trading day after the lists are
 * published (the reports are dated the same morning), for example from the Windows Task Scheduler at
 * 09:00 IST. The ASM list is not archived by NSE, so a day that is missed cannot be recovered.
 *
 * Usage:  pnpm record:status [--date YYYY-MM-DD] [--dir data/raw/nse-status]
 */
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

export async function main(args: readonly string[]): Promise<number> {
  const date = option(args, '--date') ?? istDateOfInstant(Date.now());
  const dir = option(args, '--dir') ?? 'data/raw/nse-status';
  const store = new FileRawStore(dir);
  const now = (): number => Date.now();
  const outcome = await recordDailyStatus(date, {
    client: nodeHttpClient({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36',
    }),
    store,
    limiter: new RateLimiter(2_000, now, sleep),
    now,
    retry: {
      maxAttempts: 4,
      baseDelayMs: 2_000,
      factor: 2,
      maxDelayMs: 30_000,
      jitter: 0.2,
      sleep,
      rng: createRng(`record-status-${date}`),
    },
  });
  const history = await loadHistory(store);
  const probe = history.statusOn('RELIANCE', date);
  console.log(
    JSON.stringify(
      { ...outcome, records: outcome.records.length, asmKnownForDate: probe.asmKnown },
      null,
      1,
    ),
  );
  return outcome.stored.length === 3 ? 0 : 1;
}

if (process.argv[1]?.endsWith('recordStatus.ts') === true) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e);
      process.exit(2);
    },
  );
}
