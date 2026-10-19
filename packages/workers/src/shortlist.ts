import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { addDays } from '@trading/core';
import { FileRawStore, loadBars, shortlist } from '@trading/data-service';

/**
 * Lists the instruments worth asking Yahoo about (WP-2.9): those that pass the exchange-only eligibility rules
 * (E1 to E6) at a window start. Writes one symbol per line, ready for `pnpm pull:yahoo --symbols-file`.
 *
 * Usage:  pnpm shortlist --window-start 2026-01-01 [--dir data/raw/nse-bars] [--out data/derived/shortlist.txt]
 *            [--history-days 220] (calendar days of bars read before the window, at least the 60-session warm-up)
 */
function option(args: readonly string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

export async function main(args: readonly string[]): Promise<number> {
  const windowStart = option(args, '--window-start');
  if (windowStart === undefined) {
    console.error('Usage: pnpm shortlist --window-start YYYY-MM-DD [--out file]');
    return 2;
  }
  const days = Number(option(args, '--history-days') ?? '220');
  const out = option(args, '--out') ?? 'data/derived/shortlist.txt';
  const store = new FileRawStore(option(args, '--dir') ?? 'data/raw/nse-bars');
  const rows = await loadBars(store, addDays(windowStart, -days), addDays(windowStart, -1));
  if (rows.length === 0) {
    console.error('No bars found before that date in the archive.');
    return 1;
  }
  const result = shortlist(rows, windowStart);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${result.shortlisted.map((s) => s.symbol).join('\n')}\n`);
  console.log(
    JSON.stringify({
      windowStart,
      barRows: rows.length,
      instruments: result.instruments,
      shortlisted: result.shortlisted.length,
      rejectedBy: result.rejectedBy,
      configHash: result.configHash,
      out,
    }),
  );
  return 0;
}

if (process.argv[1]?.endsWith('shortlist.ts') === true) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e);
      process.exit(2);
    },
  );
}
