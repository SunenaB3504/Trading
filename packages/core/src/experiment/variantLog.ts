import { appendEvent } from '../audit';
import { canonicalJson } from '../hash/canonicalJson';
import { sha256Hex } from '../hash/sha256';
import { RegistryError, lastEvent } from './registry';
import type { ParamValue, Registry, Variant } from './registry';

/** Multiplicity log (FR-S7): every variant tried, pilot ones included, is appended and cannot be removed. */

export interface VariantInput {
  hypothesisId: string;
  label: string;
  params: Readonly<Record<string, ParamValue>>;
  pilot?: boolean;
  synthetic?: boolean;
  pValue?: number | null;
}

/** Appends one variant. The hypothesis must be registered; a p-value, if given, must lie in [0, 1]. */
export function logVariant(reg: Registry, input: VariantInput, now: number): Registry {
  if (!reg.registrations.some((r) => r.spec.id === input.hypothesisId))
    throw new RegistryError(`${input.hypothesisId} is not registered`);
  const p = input.pValue ?? null;
  if (p !== null && !(p >= 0 && p <= 1)) throw new RegistryError('a p-value lies between 0 and 1');
  const body = {
    hypothesisId: input.hypothesisId,
    label: input.label,
    params: input.params,
    pilot: input.pilot ?? false,
    synthetic: input.synthetic ?? false,
    pValue: p,
    loggedAt: now,
  };
  const hash = sha256Hex(canonicalJson(body));
  const event = appendEvent(lastEvent(reg), {
    type: 'variant',
    payloadRef: `${input.hypothesisId}:${hash}`,
    createdAt: now,
  });
  const variant: Variant = { ...body, hash, eventSeq: event.seq };
  return { ...reg, variants: [...reg.variants, variant], events: [...reg.events, event] };
}

export interface MultiplicityCount {
  family: string;
  /** M: variants that count (synthetic placeholders do not). */
  m: number;
  pilot: number;
  synthetic: number;
  /** The p-values of counted variants that were run, in log order, for Benjamini-Hochberg. */
  pValues: number[];
  /** Counted variants with no p-value yet: M includes them even though they cannot be tested. */
  withoutP: number;
}

/** The count a report must show for a family: every variant tried across its hypotheses. */
export function multiplicityCount(reg: Registry, family: string): MultiplicityCount {
  const ids = new Set(
    reg.registrations.filter((r) => r.spec.family === family).map((r) => r.spec.id),
  );
  const inFamily = reg.variants.filter((v) => ids.has(v.hypothesisId));
  const counted = inFamily.filter((v) => !v.synthetic);
  return {
    family,
    m: counted.length,
    pilot: counted.filter((v) => v.pilot).length,
    synthetic: inFamily.length - counted.length,
    pValues: counted.flatMap((v) => (v.pValue === null ? [] : [v.pValue])),
    withoutP: counted.filter((v) => v.pValue === null).length,
  };
}
