import { canonicalJson } from '../hash/canonicalJson';
import { sha256Hex } from '../hash/sha256';
import { canRun } from '../experiment/registry';
import type { HypothesisSpec, Registry } from '../experiment/registry';
import type { Candidate, Overlay, OverlayAnswer, OverlayContext, OverlayResult } from './contract';

/**
 * The sandboxed evaluator (SSD §9.3). It refuses an overlay whose hypothesis is not frozen, hands it frozen
 * copies of its inputs, runs it twice and requires the same answer, checks that the answer is well formed,
 * and computes the features hash itself. A thrown error, a promise, a malformed answer, a changed input or
 * two different answers all fail the evaluation; none is turned into an "allow" or a "deny".
 *
 * Limit: JavaScript cannot stop an overlay from reaching globals. What stops that is that overlays live in
 * the core package, where lint and the import rules forbid time, randomness, files and network calls.
 */

export interface SandboxOptions {
  /** Largest size factor an overlay may ask for. 1 means it can only shrink a trade. */
  maxSizeMultiplier?: number;
}

export type EvalOutcome = { ok: true; result: OverlayResult } | { ok: false; reason: string };

const fail = (reason: string): EvalOutcome => ({ ok: false, reason });

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

const frozenCopy = <T>(value: T): T => deepFreeze(JSON.parse(canonicalJson(value)) as T);

function sizeProblem(a: OverlayAnswer, max: number): string | null {
  const m = a.sizeMultiplier;
  if (a.decision !== 'resize')
    return m === undefined ? null : 'a size factor is only allowed with resize';
  const good = m !== undefined && Number.isFinite(m) && m > 0 && m <= max;
  return good ? null : `a resize needs a size factor above 0 and at most ${String(max)}`;
}

function answerProblem(a: OverlayAnswer, max: number): string | null {
  const rules: Array<[boolean, string]> = [
    [['allow', 'deny', 'resize'].includes(a.decision), 'the decision is not allow, deny or resize'],
    [typeof a.reasonCode === 'string' && a.reasonCode.trim() !== '', 'no reason code'],
    [
      a.direction === undefined || a.direction === 'buy' || a.direction === 'sell',
      'the direction is not buy or sell',
    ],
  ];
  const bad = rules.find(([ok]) => !ok);
  return bad === undefined ? sizeProblem(a, max) : bad[1];
}

function runOnce(overlay: Overlay, candidate: Candidate, context: OverlayContext): OverlayAnswer {
  const answer: unknown = overlay.evaluate(candidate, context);
  if (
    answer === null ||
    typeof answer !== 'object' ||
    typeof (answer as { then?: unknown }).then === 'function'
  )
    throw new TypeError('an overlay must answer at once with a plain object');
  return answer as OverlayAnswer;
}

function gateProblem(
  registry: Registry,
  spec: HypothesisSpec,
  overlay: Overlay,
  runStartsAt: number,
): string | null {
  if (overlay.hypothesisId !== spec.id) return 'the overlay carries a different hypothesis id';
  if (overlay.ruleHash !== spec.ruleHash)
    return 'the overlay differs from the rule that was frozen';
  const allowed = canRun(registry, spec, runStartsAt);
  return allowed.ok ? null : allowed.reason;
}

/** Runs one overlay on one candidate under the rules above. `runStartsAt` is when the experiment run began. */
export function evaluateOverlay(
  registry: Registry,
  spec: HypothesisSpec,
  overlay: Overlay,
  candidate: Candidate,
  context: OverlayContext,
  runStartsAt: number,
  options: SandboxOptions = {},
): EvalOutcome {
  const gate = gateProblem(registry, spec, overlay, runStartsAt);
  if (gate !== null) return fail(gate);
  const c = frozenCopy(candidate);
  const x = frozenCopy(context);
  const before = sha256Hex(canonicalJson({ c, x }));
  let first: OverlayAnswer;
  let second: OverlayAnswer;
  try {
    first = runOnce(overlay, c, x);
    second = runOnce(overlay, c, x);
  } catch (e) {
    return fail(`the overlay failed: ${e instanceof Error ? e.message : 'unknown error'}`);
  }
  if (sha256Hex(canonicalJson({ c, x })) !== before) return fail('the overlay changed its inputs');
  const a = JSON.parse(canonicalJson(first)) as OverlayAnswer;
  if (canonicalJson(first) !== canonicalJson(second))
    return fail('the overlay gave two different answers to the same inputs');
  const problem = answerProblem(a, options.maxSizeMultiplier ?? 1);
  if (problem !== null) return fail(`the overlay's answer is not valid: ${problem}`);
  return { ok: true, result: { ...a, featuresHash: sha256Hex(canonicalJson(x.features)) } };
}
