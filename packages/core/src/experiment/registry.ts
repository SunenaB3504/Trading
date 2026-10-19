import { appendEvent, verifyChain } from '../audit';
import type { AuditEvent } from '../domain/ledger';
import { canonicalJson } from '../hash/canonicalJson';
import { sha256Hex } from '../hash/sha256';

/**
 * The experiment registry (FR-S7, SSD §4 principles 9 to 11). A hypothesis is pre-registered with its
 * stated null, claimed effect and frozen parameters; freezing it appends to a hash chain and asks an
 * outside time service for a receipt. A rule cannot run unless it is frozen, anchored and unchanged.
 * Everything here is pure: the caller supplies the time and the anchoring service.
 */

export type ParamValue = number | string | boolean;

export interface HypothesisSpec {
  /** An H- or PH- identifier from the hypothesis register. */
  id: string;
  title: string;
  /** Hypotheses tested together share a family; the multiplicity count M is taken per family. */
  family: string;
  /** What is true if the hypothesis is false, in words (the null). */
  statedNull: string;
  claimed: { effectSizePct: number; direction: 'up' | 'down' | 'none'; horizonSessions: number };
  /** Every parameter the rule uses, fixed before any run. */
  params: Readonly<Record<string, ParamValue>>;
  /** Hash of the SignalDefinition or overlay this hypothesis tests. */
  ruleHash: string;
  /** Pilot stocks are excluded from confirmatory tests (SSD risk table). */
  excludedInstruments: readonly string[];
}

export interface AnchorProof {
  provider: string;
  digest: string;
  submittedAt: number;
  proof: string;
}

/** The outside time service (the OpenTimestamps adapter implements this where there is a network). */
export interface TimeAnchorer {
  submit(digestHex: string): Promise<AnchorProof>;
}

export interface Registration {
  spec: HypothesisSpec;
  specHash: string;
  registeredAt: number;
  registerEventSeq: number;
  frozen: { at: number; eventSeq: number; receipt: AnchorProof } | null;
  /** Why a freeze was attempted but not completed; null if none. */
  freezeNote: string | null;
}

export interface Variant {
  hypothesisId: string;
  label: string;
  params: Readonly<Record<string, ParamValue>>;
  /** Tried while piloting, before registration. Still counted in M. */
  pilot: boolean;
  /** A synthetic placeholder rule: never counted in M (SSD §11.3 step 7). */
  synthetic: boolean;
  /** The p-value the variant produced, once it has been run. */
  pValue: number | null;
  loggedAt: number;
  hash: string;
  eventSeq: number;
}

export interface Registry {
  registrations: readonly Registration[];
  variants: readonly Variant[];
  events: readonly AuditEvent[];
}

export const EMPTY_REGISTRY: Registry = { registrations: [], variants: [], events: [] };

const ID = /^(H|PH)-[A-Za-z0-9-]+$/;
const HASH = /^[0-9a-f]{64}$/;

export class RegistryError extends Error {}

export const specHashOf = (spec: HypothesisSpec): string => sha256Hex(canonicalJson(spec));

function specProblems(spec: HypothesisSpec): string[] {
  const c = spec.claimed;
  const rules: Array<[boolean, string]> = [
    [ID.test(spec.id), `needs an H- or PH- id, got "${spec.id}"`],
    [spec.title.trim() !== '' && spec.family.trim() !== '', 'needs a title and a family'],
    [spec.statedNull.trim() !== '', 'needs a stated null'],
    [
      Number.isFinite(c.effectSizePct) && c.effectSizePct > 0,
      'needs a claimed effect size above zero',
    ],
    [
      Number.isInteger(c.horizonSessions) && c.horizonSessions >= 1,
      'needs a horizon of 1+ sessions',
    ],
    [Object.keys(spec.params).length > 0, 'needs frozen parameters'],
    [HASH.test(spec.ruleHash), 'needs the hash of the rule it tests'],
  ];
  return rules.filter(([ok]) => !ok).map(([, msg]) => msg);
}

export const lastEvent = (r: Registry): AuditEvent | null => r.events[r.events.length - 1] ?? null;

function find(reg: Registry, id: string): Registration {
  const found = reg.registrations.find((x) => x.spec.id === id);
  if (found === undefined) throw new RegistryError(`${id} is not registered`);
  return found;
}

/** Records a hypothesis before any run. Refuses a spec missing its null, claim or parameters, and a repeated id. */
export function preRegister(reg: Registry, spec: HypothesisSpec, now: number): Registry {
  const bad = specProblems(spec)[0];
  if (bad !== undefined) throw new RegistryError(`${spec.id} ${bad}`);
  if (reg.registrations.some((x) => x.spec.id === spec.id))
    throw new RegistryError(`${spec.id} is already registered; a change is a new id`);
  const specHash = specHashOf(spec);
  const event = appendEvent(lastEvent(reg), {
    type: 'pre-registration',
    payloadRef: `${spec.id}:${specHash}`,
    createdAt: now,
  });
  const entry: Registration = {
    spec: Object.freeze({ ...spec }),
    specHash,
    registeredAt: now,
    registerEventSeq: event.seq,
    frozen: null,
    freezeNote: null,
  };
  return { ...reg, registrations: [...reg.registrations, entry], events: [...reg.events, event] };
}

async function anchor(
  anchorer: TimeAnchorer,
  digest: string,
): Promise<{ receipt: AnchorProof | null; note: string | null }> {
  try {
    const receipt = await anchorer.submit(digest);
    if (receipt.digest !== digest)
      return { receipt: null, note: 'the time service stamped a different digest' };
    return { receipt, note: null };
  } catch (e) {
    const why = e instanceof Error ? e.message : 'unknown error';
    return { receipt: null, note: `the time service failed: ${why}` };
  }
}

/**
 * Freezes a registered hypothesis: appends a freeze event and anchors its hash outside the owner's control.
 * It counts as frozen only if the receipt is for that event's hash; otherwise the event stays in the chain,
 * the hypothesis stays unfrozen with a note, and nothing is back-filled.
 */
export async function freeze(
  reg: Registry,
  id: string,
  now: number,
  anchorer: TimeAnchorer,
): Promise<Registry> {
  const entry = find(reg, id);
  if (entry.frozen !== null) throw new RegistryError(`${id} is already frozen`);
  const event = appendEvent(lastEvent(reg), {
    type: 'freeze',
    payloadRef: `${id}:${entry.specHash}`,
    createdAt: now,
  });
  const { receipt, note } = await anchor(anchorer, event.hash);
  const next: Registration =
    receipt === null
      ? { ...entry, freezeNote: note }
      : { ...entry, frozen: { at: now, eventSeq: event.seq, receipt }, freezeNote: null };
  return {
    ...reg,
    registrations: reg.registrations.map((x) => (x.spec.id === id ? next : x)),
    events: [...reg.events, event],
  };
}

export type RunCheck = { ok: true } | { ok: false; reason: string };

/** A rule may run only if it is registered, frozen with a receipt, unchanged, and frozen before the run starts. */
export function canRun(reg: Registry, spec: HypothesisSpec, runStartsAt: number): RunCheck {
  const entry = reg.registrations.find((x) => x.spec.id === spec.id);
  if (entry === undefined) return { ok: false, reason: `${spec.id} is not registered` };
  if (entry.frozen === null) return { ok: false, reason: `${spec.id} is not frozen` };
  if (specHashOf(spec) !== entry.specHash)
    return { ok: false, reason: `${spec.id} differs from what was frozen` };
  if (entry.frozen.at >= runStartsAt || entry.frozen.receipt.submittedAt >= runStartsAt)
    return { ok: false, reason: `${spec.id} was not frozen before the run started` };
  return { ok: true };
}

function registrationProblem(reg: Registry, r: Registration): string | null {
  if (specHashOf(r.spec) !== r.specHash) return `${r.spec.id} was altered`;
  if (reg.events[r.registerEventSeq]?.payloadRef !== `${r.spec.id}:${r.specHash}`)
    return `${r.spec.id} registration event does not match`;
  if (r.frozen === null) return null;
  const fe = reg.events[r.frozen.eventSeq];
  const matches =
    fe?.type === 'freeze' &&
    fe.payloadRef === `${r.spec.id}:${r.specHash}` &&
    r.frozen.receipt.digest === fe.hash;
  return matches ? null : `${r.spec.id} freeze does not match its receipt`;
}

/** Checks the chain, every hash, and that each registration points at its own events. */
export function verifyRegistry(reg: Registry): RunCheck {
  const chain = verifyChain(reg.events);
  if (!chain.ok) return { ok: false, reason: `event ${String(chain.index)}: ${chain.reason}` };
  for (const r of reg.registrations) {
    const problem = registrationProblem(reg, r);
    if (problem !== null) return { ok: false, reason: problem };
  }
  return { ok: true };
}
