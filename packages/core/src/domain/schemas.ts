import { z } from 'zod';
import {
  instrumentBucketSchema,
  instrumentNameSchema,
  instrumentSchema,
  instrumentStatusSchema,
} from './instrument';
import { auditEventSchema, ledgerEntrySchema, lotSchema, tradeSchema } from './ledger';
import { barAdjSchema, barUnadjSchema, calendarDaySchema, corporateActionSchema } from './market';
import { decisionSchema, fillSchema, orderSchema } from './trading';

/** Every persisted entity, by name. Source of truth for the JSON-schema snapshot. */
export const entitySchemas = {
  instrument: instrumentSchema,
  instrumentBucket: instrumentBucketSchema,
  instrumentStatus: instrumentStatusSchema,
  instrumentName: instrumentNameSchema,
  corporateAction: corporateActionSchema,
  calendarDay: calendarDaySchema,
  barUnadj: barUnadjSchema,
  barAdj: barAdjSchema,
  decision: decisionSchema,
  order: orderSchema,
  fill: fillSchema,
  lot: lotSchema,
  ledgerEntry: ledgerEntrySchema,
  trade: tradeSchema,
  auditEvent: auditEventSchema,
} as const;

export type EntityName = keyof typeof entitySchemas;

/** JSON Schema (draft 2020-12) for every entity, keyed by name. */
export function entityJsonSchemas(): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, schema] of Object.entries(entitySchemas)) {
    out[name] = z.toJSONSchema(schema, { unrepresentable: 'any' });
  }
  return out;
}
