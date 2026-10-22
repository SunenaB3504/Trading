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

function columnsOf(header: string[] | undefined): {
  id: number;
  name: number;
  from: number;
  to: number;
} {
  const col = (name: string): number => {
    const i = header?.indexOf(name) ?? -1;
    if (i < 0) throw new Error(`name table: missing column "${name}"`);
    return i;
  };
  return {
    id: col('instrumentId'),
    name: col('legalName'),
    from: col('effectiveFrom'),
    to: col('effectiveTo'),
  };
}

const orEmpty = (cell: string | undefined): string => (cell ?? '').trim();

function nameOf(
  instrumentId: string,
  r: string[],
  c: ReturnType<typeof columnsOf>,
): InstrumentName {
  const from = orEmpty(r[c.from]);
  const to = orEmpty(r[c.to]);
  return {
    instrumentId,
    legalName: orEmpty(r[c.name]),
    effectiveFrom: from === '' ? 0 : dayStart(from),
    effectiveTo: to === '' ? null : dayStart(to) + DAY_MS,
    source: 'assistant draft 2026-10-22, owner review pending',
  };
}

export function parseNameHistory(csv: string): Map<string, InstrumentName[]> {
  const [header, ...rows] = parseCsv(csv);
  const c = columnsOf(header);
  const out = new Map<string, InstrumentName[]>();
  for (const r of rows) {
    const instrumentId = orEmpty(r[c.id]);
    if (instrumentId === '') continue;
    const list = out.get(instrumentId) ?? [];
    out.set(instrumentId, list);
    const entry = nameOf(instrumentId, r, c);
    if (entry.legalName !== '') list.push(entry);
  }
  return out;
}
