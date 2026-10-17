import { canonicalJson, sha256Hex } from '@trading/core';
import type { InstrumentName } from '@trading/core';
import { buildChart } from './chart';
import type { Chart } from './chart';
import type { Moment } from './ephemeris';
import { isIntact } from './registry';
import type { FrozenConventions } from './registry';

/** What a chart stands for. A personal chart never leaves the device (FR-P5). */
export type ChartKind = 'personal' | 'company' | 'prashna';

/**
 * A chart bound to the convention set it was made under (FR-A1). The id is a hash of the subject, the
 * moment and the set, so the same inputs always give the same id and a changed convention gives a new one.
 */
export interface ChartEntity {
  id: string;
  kind: ChartKind;
  subject: string;
  moment: Moment;
  conventionHash: string;
  chart: Chart;
}

export function makeChart(
  kind: ChartKind,
  subject: string,
  moment: Moment,
  conventions: FrozenConventions,
): ChartEntity {
  if (!isIntact(conventions)) throw new Error('Convention set was changed after it was frozen');
  const id = sha256Hex(canonicalJson({ kind, subject, moment, hash: conventions.hash }));
  return {
    id,
    kind,
    subject,
    moment,
    conventionHash: conventions.hash,
    chart: buildChart(moment, conventions.calc),
  };
}

/**
 * The legal name in force on a date (FR-U8, D10), from a name history with half-open intervals
 * [effectiveFrom, effectiveTo). Null if no name was in force, so a caller never guesses.
 */
export function nameInForce(history: InstrumentName[], atMillis: number): string | null {
  const hits = history.filter(
    (n) => n.effectiveFrom <= atMillis && (n.effectiveTo === null || atMillis < n.effectiveTo),
  );
  if (hits.length > 1) throw new Error('Overlapping name history');
  return hits[0]?.legalName ?? null;
}
