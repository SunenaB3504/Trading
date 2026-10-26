import { z } from 'zod';

export const exchangeSchema = z.enum(['NSE', 'BSE']);
export const instrumentKindSchema = z.enum(['equity']);
export const sideSchema = z.enum(['buy', 'sell']);
/**
 * `stop` is SL-M (a market order once the trigger is reached) and `stop_limit` is SL (a limit order once it is).
 */
export const orderTypeSchema = z.enum(['market', 'limit', 'stop', 'stop_limit']);
/** `gtt` (good till triggered) stays alive over many sessions until it fills or runs out. */
export const orderValiditySchema = z.enum(['day', 'gtt']);
/** Which way the price must move to set a stop or GTT order off. */
export const triggerWhenSchema = z.enum(['at_or_below', 'at_or_above']);
export const orderStatusSchema = z.enum(['open', 'filled', 'rejected', 'expired', 'cancelled']);

/** Why an order did not fill (FR-T3, FR-T10, FR-T11). */
export const blockedReasonSchema = z.enum([
  'circuit_upper',
  'circuit_lower',
  'outside_day_range',
  'limit_not_reached',
  'trigger_not_reached',
  'non_trading_day',
  'halted',
  'ineligible',
  'expired',
]);

/** Objective, astro-blind buckets (SSD §10.2). */
export const bucketSchema = z.enum(['steady', 'underdogs', 'speculative', 'cyclicals', 'mundane']);

export const corporateActionTypeSchema = z.enum([
  'split',
  'bonus',
  'dividend',
  'rename',
  'merger',
  'demerger',
]);

export const verificationSchema = z.enum(['verified', 'unverified', 'time_assumed']);
export const circuitFlagSchema = z.enum(['none', 'upper', 'lower']);
export const surveillanceListSchema = z.enum(['none', 'asm', 'gsm']);
export const ledgerAccountSchema = z.enum(['cash', 'position', 'fees', 'realised_pnl', 'capital']);

export type TriggerWhen = z.infer<typeof triggerWhenSchema>;
export type Side = z.infer<typeof sideSchema>;
export type OrderType = z.infer<typeof orderTypeSchema>;
export type OrderStatus = z.infer<typeof orderStatusSchema>;
export type BlockedReason = z.infer<typeof blockedReasonSchema>;
export type Bucket = z.infer<typeof bucketSchema>;
