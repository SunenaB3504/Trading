import { canonicalJson, sha256Hex } from '@trading/core';
import { z } from 'zod';

/**
 * The signed daily snapshot file (SSD §7.6, FR-P1): a manifest that names the payload by its hash, the payload
 * itself, and a signature over the manifest. The client trusts nothing else in the file. What the payload holds is
 * decided by D26 and WP-2.8; the client only checks that it is the payload the manifest names.
 */
export const manifestSchema = z.object({
  version: z.literal(1),
  snapshotId: z.string().min(1),
  /** Last session the snapshot contains (YYYY-MM-DD). */
  asOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.number().int().nonnegative(),
  /** SHA-256 of the canonical JSON of `payload`. */
  payloadHash: z.string().regex(/^[0-9a-f]{64}$/),
  /** Which signing key made the signature, so a key can be replaced. */
  keyId: z.string().min(1),
});

export const envelopeSchema = z.object({
  manifest: manifestSchema,
  payload: z.unknown(),
  /** Hex signature over the UTF-8 bytes of the canonical JSON of the manifest. */
  signature: z.string().regex(/^[0-9a-f]+$/),
});

export type Manifest = z.infer<typeof manifestSchema>;
export type Envelope = z.infer<typeof envelopeSchema>;

export const manifestBytes = (m: Manifest): Uint8Array =>
  new TextEncoder().encode(canonicalJson(m));

export const payloadHashOf = (payload: unknown): string => sha256Hex(canonicalJson(payload));
