import { z } from 'zod';
import { ledgerAccountSchema } from './enums';
import {
  decisionSourceSchema,
  idSchema,
  paiseSchema,
  quantitySchema,
  sha256Schema,
  tradingDateSchema,
  utcMillisSchema,
} from './primitives';

/** FIFO lot (FR-T5). `unitCostPaise` is the entry price; entry costs are allocated separately. */
export const lotSchema = z.object({
  id: idSchema,
  instrumentId: idSchema,
  openFillId: idSchema,
  openedOn: tradingDateSchema,
  quantityOriginal: quantitySchema,
  quantityRemaining: z.number().int().nonnegative().safe(),
  unitCostPaise: paiseSchema.positive(),
  entryCostsPaise: paiseSchema.nonnegative(),
});

/**
 * Append-only double-entry line. Lines sharing a `txnId` sum to zero in `amountPaise`.
 * Corrections are new lines that reference the old one (SSD §4 principle 4).
 */
export const ledgerEntrySchema = z.object({
  id: idSchema,
  txnId: idSchema,
  seq: z.number().int().nonnegative().safe(),
  account: ledgerAccountSchema,
  instrumentId: idSchema.nullable(),
  amountPaise: paiseSchema,
  quantityDelta: z.number().int().safe(),
  fillId: idSchema.nullable(),
  correctsEntryId: idSchema.nullable(),
  createdAt: utcMillisSchema,
});

/** A round trip (FR-W1). `exitFillId` is null while the position is open. */
export const tradeSchema = z.object({
  id: idSchema,
  instrumentId: idSchema,
  entryFillId: idSchema,
  exitFillId: idSchema.nullable(),
  openedOn: tradingDateSchema,
  closedOn: tradingDateSchema.nullable(),
  grossPnlPaise: paiseSchema.nullable(),
  netPnlPaise: paiseSchema.nullable(),
  source: decisionSourceSchema,
  bucket: z.string().nullable(),
  tags: z.array(z.string()),
});

/** Hash-chained audit event (NFR-7). The first event's `prevHash` is 64 zeros. */
export const auditEventSchema = z.object({
  seq: z.number().int().nonnegative().safe(),
  prevHash: sha256Schema,
  hash: sha256Schema,
  type: z.string().min(1),
  payloadRef: z.string().min(1),
  createdAt: utcMillisSchema,
});

export type Lot = z.infer<typeof lotSchema>;
export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;
export type Trade = z.infer<typeof tradeSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
