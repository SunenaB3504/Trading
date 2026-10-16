import { z } from 'zod';
import {
  blockedReasonSchema,
  orderStatusSchema,
  orderTypeSchema,
  orderValiditySchema,
  sideSchema,
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
    validity: orderValiditySchema,
    placedAt: utcMillisSchema,
    tradingDate: tradingDateSchema,
    status: orderStatusSchema,
    source: decisionSourceSchema,
    rationale: z.string(),
    fillRuleId: z.string().min(1),
    blockedReason: blockedReasonSchema.nullable(),
  })
  .refine((o) => (o.type === 'limit') === (o.limitPaise !== null), {
    message: 'limit orders need limitPaise; market orders must not have one',
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
