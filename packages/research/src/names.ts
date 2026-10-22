import type { InstrumentName } from '@trading/core';
import { parseCsv } from '@trading/data-service';

/**
 * Reads the company-name table (`data/names/universe_v2_names.csv`) into legal-name histories (FR-U8). A row with
 * no name is a company we could not identify: it gets no history, so H-21 reports 'no name' and gives no signal.
 * Dates are UTC midnights: a name is in force from the start of `effectiveFrom` to the start of the day after
 * `effectiveTo`; an empty `effectiveFrom` means since before the study and an empty `effectiveTo` means still.
 */
const DAY_MS = 86_400_000;
const dayStart = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

export function parseNameHistory(csv: string): Map<string, InstrumentName[]> {
  const [header, ...rows] = parseCsv(csv);
  const col = (name: string): number => {
    const i = header?.indexOf(name) ?? -1;
    if (i < 0) throw new Error(`name table: missing column "${name}"`);
    return i;
  };
  const [id, name, from, to] = ['instrumentId', 'legalName', 'effectiveFrom', 'effectiveTo'].map(
    col,
  ) as [number, number, number, number];
  const out = new Map<string, InstrumentName[]>();
  for (const r of rows) {
    const legalName = (r[name] ?? '').trim();
    const instrumentId = (r[id] ?? '').trim();
    if (instrumentId === '') continue;
    const list = out.get(instrumentId) ?? [];
    out.set(instrumentId, list);
    if (legalName === '') continue;
    list.push({
      instrumentId,
      legalName,
      effectiveFrom: (r[from] ?? '') === '' ? 0 : dayStart(r[from] as string),
      effectiveTo: (r[to] ?? '') === '' ? null : dayStart(r[to] as string) + DAY_MS,
      source: 'assistant draft 2026-10-22, owner review pending',
    });
  }
  return out;
}
