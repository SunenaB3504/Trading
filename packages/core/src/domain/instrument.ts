import { z } from 'zod';
import {
  bucketSchema,
  exchangeSchema,
  instrumentKindSchema,
  surveillanceListSchema,
  verificationSchema,
} from './enums';
import { idSchema, tradingDateSchema, utcMillisSchema } from './primitives';

/** FR-U1, FR-U9. `firstTradeTs` null means no exchange timestamp could be sourced. */
export const instrumentSchema = z.object({
  id: idSchema,
  kind: instrumentKindSchema,
  exchange: exchangeSchema,
  symbol: z.string().min(1),
  isin: z.string().regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/),
  sector: z.string().min(1),
  listingDate: tradingDateSchema,
  firstTradeTs: utcMillisSchema.nullable(),
  firstTradeSource: z.string().nullable(),
  verification: verificationSchema,
  delistedOn: tradingDateSchema.nullable(),
  delistReason: z.string().nullable(),
});

/** FR-U6: bucket assigned by a versioned, astro-blind rule. */
export const instrumentBucketSchema = z.object({
  instrumentId: idSchema,
  bucket: bucketSchema,
  ruleVersion: z.string().min(1),
  evaluatedAt: utcMillisSchema,
  inputsHash: z.string().min(1),
});

/** FR-U7: point-in-time status with effective and available times. */
export const instrumentStatusSchema = z.object({
  instrumentId: idSchema,
  surveillanceList: surveillanceListSchema,
  surveillanceStage: z.number().int().nonnegative().nullable(),
  bandPct: z.number().positive().max(20).nullable(),
  tradeForTrade: z.boolean(),
  suspended: z.boolean(),
  effectiveAt: utcMillisSchema,
  availableAt: utcMillisSchema,
  source: z.string().min(1),
});

/** FR-U8: legal-name history. */
export const instrumentNameSchema = z.object({
  instrumentId: idSchema,
  legalName: z.string().min(1),
  effectiveFrom: utcMillisSchema,
  effectiveTo: utcMillisSchema.nullable(),
  source: z.string().min(1),
});

export type Instrument = z.infer<typeof instrumentSchema>;
export type InstrumentBucket = z.infer<typeof instrumentBucketSchema>;
export type InstrumentStatus = z.infer<typeof instrumentStatusSchema>;
export type InstrumentName = z.infer<typeof instrumentNameSchema>;
