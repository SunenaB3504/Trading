import type { CorporateAction } from '../domain/market';
import { CorporateActionError } from './errors';

/** One event per instrument, type and ex-date: the idempotency key (FR-T6). */
export function actionKey(a: Pick<CorporateAction, 'instrumentId' | 'type' | 'exDate'>): string {
  return `${a.instrumentId}|${a.type}|${a.exDate}`;
}

function compareActions(a: CorporateAction, b: CorporateAction): number {
  if (a.exDate !== b.exDate) return a.exDate < b.exDate ? -1 : 1;
  if (a.type !== b.type) return a.type < b.type ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

function validate(a: CorporateAction): void {
  const needsRatio = a.type === 'split' || a.type === 'bonus';
  if (needsRatio && a.ratio === null) {
    throw new CorporateActionError(`${a.type} ${a.id} needs a ratio`);
  }
  if (a.type === 'dividend' && a.dividendPaisePerShare === null) {
    throw new CorporateActionError(`dividend ${a.id} needs dividendPaisePerShare`);
  }
  if (a.type === 'merger' || a.type === 'demerger') {
    throw new CorporateActionError(`${a.type} ${a.id} is not supported (excluded by E3)`);
  }
}

/**
 * Validates, sorts (ex-date, type, id) and de-duplicates by `actionKey`, keeping the first
 * in that order, so duplicate rows from two providers cannot be applied twice.
 */
export function normalizeActions(actions: readonly CorporateAction[]): CorporateAction[] {
  const seen = new Set<string>();
  const out: CorporateAction[] = [];
  for (const a of [...actions].sort(compareActions)) {
    validate(a);
    const key = actionKey(a);
    if (!seen.has(key)) {
      seen.add(key);
      out.push(a);
    }
  }
  return out;
}
