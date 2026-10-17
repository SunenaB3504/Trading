import type { InstrumentIdentity } from '../canonical/identity';
import type { ServiceResponse } from './types';

export const ok = (body: unknown, status = 200): ServiceResponse => ({ status, body });
export const fail = (status: number, message: string): ServiceResponse => ({
  status,
  body: { error: message },
});

const DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isDate(value: string | undefined): value is string {
  return value !== undefined && DATE.test(value);
}

/** The date range of a request: both ends optional, each a `YYYY-MM-DD` string. */
export function dateRange(
  query: Readonly<Record<string, string>>,
): { from: string; to: string } | ServiceResponse {
  const from = query.from ?? '0000-01-01';
  const to = query.to ?? '9999-12-31';
  if (!isDate(from) || !isDate(to)) return fail(400, 'from and to must be YYYY-MM-DD');
  if (from > to) return fail(400, 'from is after to');
  return { from, to };
}

export const isResponse = (v: unknown): v is ServiceResponse =>
  typeof v === 'object' && v !== null && 'status' in v && 'body' in v;

/** Instrument id for a symbol, using any symbol the instrument has traded under. */
export function resolveSymbol(
  identities: readonly InstrumentIdentity[],
  symbol: string | undefined,
): string | ServiceResponse {
  if (symbol === undefined || symbol === '') return fail(400, 'symbol is required');
  const found = identities.find((i) => i.listings.some((l) => l.symbol === symbol));
  return found === undefined ? fail(404, `unknown symbol ${symbol}`) : found.instrumentId;
}
