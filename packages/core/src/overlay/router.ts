import { canonicalJson } from '../hash/canonicalJson';
import { sha256Hex } from '../hash/sha256';
import type { HypothesisSpec } from '../experiment/registry';
import type { FeatureValue, Overlay, OverlayAnswer, StateCode } from './contract';

/**
 * The signal-state router (FR-S8, PH-10): one overlay that turns the states of several registered signals into
 * one state and then into one decision. States are indicators; only this frozen arm turns them into a decision.
 *
 * The decision table is written out in full and frozen before any run. Precedence, first match wins:
 *   1. any input GRAY-NODATA            -> GRAY-NODATA  (the data cannot be trusted; never mixed with no-signal)
 *   2. any input RED                    -> RED          (caution outranks agreement: a RED vetoes a GREEN)
 *   3. any YELLOW                       -> YELLOW       (a GREEN together with a YELLOW gives YELLOW)
 *   4. any GREEN                        -> GREEN
 *   5. otherwise (all GRAY-NOSIGNAL)    -> GRAY-NOSIGNAL
 * Mapping to a decision: GREEN allows; YELLOW resizes to a frozen factor; RED denies; both GRAY states allow the
 * baseline trade unchanged (Mode 1 behaviour, FR-S11), and are counted apart in the reason code.
 * The order of the inputs never matters; only which states are present.
 */

export const STATES: readonly StateCode[] = [
  'GREEN',
  'YELLOW',
  'RED',
  'GRAY-NOSIGNAL',
  'GRAY-NODATA',
];

export interface TableRow {
  /** How many inputs are in each state, in `STATES` order. */
  counts: number[];
  output: StateCode;
  /** Which precedence rule decided it (1 to 5). */
  rule: 1 | 2 | 3 | 4 | 5;
}

function present(counts: readonly number[], state: StateCode): boolean {
  return (counts[STATES.indexOf(state)] ?? 0) > 0;
}

function decide(counts: readonly number[]): { output: StateCode; rule: TableRow['rule'] } {
  if (present(counts, 'GRAY-NODATA')) return { output: 'GRAY-NODATA', rule: 1 };
  if (present(counts, 'RED')) return { output: 'RED', rule: 2 };
  if (present(counts, 'YELLOW')) return { output: 'YELLOW', rule: 3 };
  if (present(counts, 'GREEN')) return { output: 'GREEN', rule: 4 };
  return { output: 'GRAY-NOSIGNAL', rule: 5 };
}

/** Combines the states of `n >= 1` signals into one, by the precedence above. */
export function routeStates(states: readonly StateCode[]): StateCode {
  if (states.length === 0) throw new RangeError('the router needs at least one input state');
  return decide(STATES.map((s) => states.filter((x) => x === s).length)).output;
}

/** Every way `n` inputs can be spread over the five states (a multiset), each with its output and rule. */
export function decisionTable(n: number): TableRow[] {
  if (!Number.isInteger(n) || n < 1 || n > 8)
    throw new RangeError('the table covers 1 to 8 inputs');
  const rows: TableRow[] = [];
  const fill = (index: number, left: number, counts: number[]): void => {
    if (index === STATES.length - 1) {
      const full = [...counts, left];
      rows.push({ counts: full, ...decide(full) });
      return;
    }
    for (let c = 0; c <= left; c += 1) fill(index + 1, left - c, [...counts, c]);
  };
  fill(0, n, []);
  return rows;
}

export interface RouterSignal {
  /** The context feature that carries this signal's state code. */
  featureKey: string;
  /** The hypothesis that signal belongs to: it must already be Supported. */
  hypothesisId: string;
}

export interface RouterConfig {
  id: string;
  version: number;
  /** The router's own PH-ID (FR-S8). */
  hypothesisId: string;
  signals: readonly RouterSignal[];
  /** Size factor for YELLOW, above 0 and at most 1 (within the FR-T8 caps). */
  yellowSize: number;
}

const isState = (v: FeatureValue | undefined): v is StateCode =>
  typeof v === 'string' && (STATES as readonly string[]).includes(v);

/** A missing or unrecognised state counts as GRAY-NODATA: a signal that did not report cannot be trusted. */
function inputStates(
  cfg: RouterConfig,
  features: Readonly<Record<string, FeatureValue>>,
): StateCode[] {
  return cfg.signals.map((s) => {
    const v = features[s.featureKey];
    return isState(v) ? v : 'GRAY-NODATA';
  });
}

function answerFor(state: StateCode, yellowSize: number): OverlayAnswer {
  const reasonCode = `ROUTER-${state}`;
  if (state === 'RED') return { decision: 'deny', reasonCode, stateCode: state };
  if (state === 'YELLOW')
    return { decision: 'resize', sizeMultiplier: yellowSize, reasonCode, stateCode: state };
  return { decision: 'allow', reasonCode, stateCode: state };
}

/** The hash of what is frozen: the config and the full decision table for its number of inputs. */
export function routerRuleHash(cfg: RouterConfig): string {
  return sha256Hex(canonicalJson({ cfg, table: decisionTable(cfg.signals.length) }));
}

export function routerOverlay(cfg: RouterConfig): Overlay {
  if (cfg.signals.length === 0) throw new RangeError('the router needs at least one signal');
  if (!(cfg.yellowSize > 0 && cfg.yellowSize <= 1))
    throw new RangeError('yellowSize must be above 0 and at most 1');
  return {
    id: cfg.id,
    version: cfg.version,
    hypothesisId: cfg.hypothesisId,
    ruleHash: routerRuleHash(cfg),
    evaluate: (_candidate, context) =>
      answerFor(routeStates(inputStates(cfg, context.features)), cfg.yellowSize),
  };
}

export interface RouterClaim {
  effectSizePct: number;
  horizonSessions: number;
  excludedInstruments: readonly string[];
}

/**
 * The hypothesis record for the router (PH-10). It is refused unless every signal it combines belongs to a
 * hypothesis already reported Supported: running the router earlier would combine untested parts and add free
 * parameters (PH-10 gate).
 */
export function routerSpec(
  cfg: RouterConfig,
  claim: RouterClaim,
  supportedHypotheses: readonly string[],
): HypothesisSpec {
  const unsupported = cfg.signals.filter((s) => !supportedHypotheses.includes(s.hypothesisId));
  if (unsupported.length > 0 || cfg.signals.length === 0)
    throw new Error(
      `the router may only combine Supported hypotheses; not supported: ${
        unsupported.map((s) => s.hypothesisId).join(', ') || 'none given'
      }`,
    );
  return {
    id: cfg.hypothesisId,
    title: 'Signal-state router decision table',
    family: 'router',
    statedNull: 'Trading through the router is no better than the baseline (arm B0).',
    claimed: {
      effectSizePct: claim.effectSizePct,
      direction: 'up',
      horizonSessions: claim.horizonSessions,
    },
    params: {
      version: cfg.version,
      yellowSize: cfg.yellowSize,
      signals: cfg.signals.map((s) => `${s.featureKey}@${s.hypothesisId}`).join(','),
    },
    ruleHash: routerRuleHash(cfg),
    excludedInstruments: claim.excludedInstruments,
  };
}
