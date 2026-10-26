import { z } from 'zod';
import {
  blockedReasonSchema,
  orderStatusSchema,
  orderTypeSchema,
  orderValiditySchema,
  sideSchema,
  triggerWhenSchema,
} from './enums';
import {
  decisionSourceSchema,
  idSchema,
  paiseSchema,
  quantitySchema,
  tradingDateSchema,
  utcMillisSchema,
} from './primitives';

/** FR-T1, FR-T7. A limit order must carry a limit price; a market order must not. */
export const orderSchema = z
  .object({
    id: idSchema,
    decisionId: idSchema,
    instrumentId: idSchema,
    side: sideSchema,
    type: orderTypeSchema,
    quantity: quantitySchema,
    limitPaise: paiseSchema.positive().nullable(),
    /** Stop and stop-limit orders: the price that sets the order off, and which way it must move. */
    triggerPaise: paiseSchema.positive().nullable().optional(),
    triggerWhen: triggerWhenSchema.nullable().optional(),
    /** GTT orders: the last session the order stays alive (at most 250 sessions after placement). */
    validUntil: tradingDateSchema.nullable().optional(),
    validity: orderValiditySchema,
    placedAt: utcMillisSchema,
    tradingDate: tradingDateSchema,
    status: orderStatusSchema,
    source: decisionSourceSchema,
    rationale: z.string(),
    fillRuleId: z.string().min(1),
    blockedReason: blockedReasonSchema.nullable(),
  })
  .refine((o) => (o.type === 'limit' || o.type === 'stop_limit') === (o.limitPaise !== null), {
    message: 'limit and stop-limit orders need limitPaise; market and stop orders must not have one',
  })
  .refine(
    (o) => (o.type === 'stop' || o.type === 'stop_limit') === (o.triggerPaise != null && o.triggerWhen != null),
    { message: 'stop and stop-limit orders need a trigger and its direction; other orders must not have them' },
  )
  .refine((o) => o.validity === 'day' || o.type !== 'market', {
    message: 'a market order cannot be good till triggered',
  });

export const fillSchema = z.object({
  id: idSchema,
  orderId: idSchema,
  instrumentId: idSchema,
  side: sideSchema,
  quantity: quantitySchema,
  pricePaise: paiseSchema.positive(),
  costsPaise: paiseSchema.nonnegative(),
  fillRuleId: z.string().min(1),
  filledAt: utcMillisSchema,
  tradingDate: tradingDateSchema,
});

export const decisionSchema = z.object({
  id: idSchema,
  source: decisionSourceSchema,
  rationale: z.string(),
  signalFlags: z.array(z.string()),
  bucket: z.string().nullable(),
  createdAt: utcMillisSchema,
});

export type Order = z.infer<typeof orderSchema>;
export type Fill = z.infer<typeof fillSchema>;
export type Decision = z.infer<typeof decisionSchema>;
