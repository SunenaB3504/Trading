import { z } from 'zod';
import { circuitFlagSchema, corporateActionTypeSchema, exchangeSchema } from './enums';
import { idSchema, paiseSchema, tradingDateSchema, utcMillisSchema } from './primitives';

const volumeSchema = z.number().int().nonnegative().safe();

/** Unadjusted daily bar: integer paise (FR-D3). */
export const barUnadjSchema = z.object({
  instrumentId: idSchema,
  date: tradingDateSchema,
  open: paiseSchema,
  high: paiseSchema,
  low: paiseSchema,
  close: paiseSchema,
  volume: volumeSchema,
  provider: z.string().min(1),
  snapshotId: idSchema,
  disputed: z.boolean(),
  circuitFlag: circuitFlagSchema,
});

/** Adjusted daily bar: analytics only, so prices may be fractional (never used for money). */
export const barAdjSchema = z.object({
  instrumentId: idSchema,
  date: tradingDateSchema,
  open: z.number().positive(),
  high: z.number().positive(),
  low: z.number().positive(),
  close: z.number().positive(),
  volume: volumeSchema,
  snapshotId: idSchema,
});

const ratioSchema = z.object({
  numerator: z.number().int().positive().safe(),
  denominator: z.number().int().positive().safe(),
});

/**
 * FR-U3. Splits and bonuses carry a ratio, defined as shares held AFTER over shares held
 * BEFORE: a 1-into-5 split is 5/1, a 1:1 bonus is 2/1, a 1:2 bonus is 3/2, and a 1-for-10
 * consolidation is 1/10. Dividends carry paise per share.
 */
export const corporateActionSchema = z.object({
  id: idSchema,
  instrumentId: idSchema,
  type: corporateActionTypeSchema,
  exDate: tradingDateSchema,
  ratio: ratioSchema.nullable(),
  dividendPaisePerShare: paiseSchema.nonnegative().nullable(),
  source: z.string().min(1),
  effectiveAt: utcMillisSchema,
});

export const calendarDaySchema = z.object({
  exchange: exchangeSchema,
  date: tradingDateSchema,
  isTradingDay: z.boolean(),
  sessionOpen: utcMillisSchema.nullable(),
  sessionClose: utcMillisSchema.nullable(),
  muhurat: z.boolean(),
});

export type BarUnadj = z.infer<typeof barUnadjSchema>;
export type BarAdj = z.infer<typeof barAdjSchema>;
export type CorporateAction = z.infer<typeof corporateActionSchema>;
export type CalendarDay = z.infer<typeof calendarDaySchema>;
