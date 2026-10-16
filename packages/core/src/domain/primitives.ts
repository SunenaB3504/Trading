import { z } from 'zod';

/** Integer paise, always a safe integer (SSD §5.2 money representation). */
export const paiseSchema = z.number().int().safe();
export type Paise = z.infer<typeof paiseSchema>;

/** Share quantity: positive safe integer. */
export const quantitySchema = z.number().int().positive().safe();
export type Quantity = z.infer<typeof quantitySchema>;

/** UTC instant as integer milliseconds since the Unix epoch. IST is for display only. */
export const utcMillisSchema = z.number().int().nonnegative().safe();
export type UtcMillis = z.infer<typeof utcMillisSchema>;

/** Exchange session date, `YYYY-MM-DD`, in IST. */
export const tradingDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export type TradingDate = z.infer<typeof tradingDateSchema>;

/** Lower-case hex SHA-256. */
export const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
export type Sha256 = z.infer<typeof sha256Schema>;

export const idSchema = z.string().min(1);
export type Id = z.infer<typeof idSchema>;

/** `human` or `rule:<id>@<version>` (FR-T7). */
export const decisionSourceSchema = z.union([
  z.literal('human'),
  z.string().regex(/^rule:[A-Za-z0-9._-]+@[A-Za-z0-9._-]+$/),
]);
export type DecisionSource = z.infer<typeof decisionSourceSchema>;
