import { z } from 'zod';
import { tradingDateSchema } from '../domain/primitives';

/**
 * Mutual fund prices for the learning app (MIP v4.1 Stage 2): the daily NAV of a chosen set of direct-growth
 * funds, built by `pnpm funds:build`. A NAV has four decimals, so it is stored as an integer count of
 * ten-thousandths of a rupee. Funds trade at the NAV of a day, not at an open (Stage 3).
 */
export const FUNDS_FORMAT = 'learning-funds';
export const FUNDS_VERSION = 1;
/** NAV integers are in units of 1/10,000 rupee. */
export const NAV_SCALE = 10_000;

/** One NAV: the date it applies to and its value in ten-thousandths of a rupee. */
const navSchema = z.tuple([tradingDateSchema, z.number().int().positive().safe()]);
export type FundNav = z.infer<typeof navSchema>;

export const fundSchema = z.object({
  /** The AMFI scheme code. */
  id: z.string().min(1),
  name: z.string().min(1),
  /** A plain-language group such as "Index fund" or "Liquid fund". */
  kind: z.string().min(1),
  isin: z.string().nullable(),
  firstDate: tradingDateSchema,
  lastDate: tradingDateSchema,
});
export type Fund = z.infer<typeof fundSchema>;

export const fundsMarketSchema = z.object({
  format: z.literal(FUNDS_FORMAT),
  version: z.literal(FUNDS_VERSION),
  builtAt: z.number().int().nonnegative(),
  source: z.string().min(1),
  funds: z.array(fundSchema),
  navs: z.record(z.string(), z.array(navSchema)),
  /** Funds whose latest NAV differed from the AMFI file by more than a rounding error when built. */
  disputed: z.array(z.string()),
});
export type FundsMarket = z.infer<typeof fundsMarketSchema>;

/** "159.17700" to 1,591,770. Null when the text is not a positive number with at most four meaningful decimals. */
export function parseNav(text: string): number | null {
  const m = /^(\d+)(?:\.(\d{1,5}))?$/.exec(text.trim());
  if (m === null) return null;
  const frac = (m[2] ?? '').padEnd(5, '0');
  if (frac[4] !== '0') return null;
  const n = Number(m[1]) * NAV_SCALE + Number(frac.slice(0, 4));
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

/** Checks a funds file read from disk or the network; a broken one is refused, never half-used. */
export function parseFundsMarket(value: unknown): FundsMarket | null {
  const parsed = fundsMarketSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
