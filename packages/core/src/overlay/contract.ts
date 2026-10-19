/**
 * The overlay contract (FR-S4, SSD §9.3). An overlay looks at one trade candidate and the features known
 * before the decision, and answers allow, deny or resize, with a reason code. It is a pure function of its
 * inputs, versioned, and carries the H- or PH-ID it tests. The signal-state router and every PH protocol are
 * implementations of this one contract; nothing outside it may hold rule-specific execution logic (FR-S12).
 */

export type FeatureValue = number | string | boolean | null;

/** What the overlay is asked about: a trade the base strategy (arm B0) would take. */
export interface Candidate {
  instrumentId: string;
  /** Trading date of the decision (YYYY-MM-DD). */
  date: string;
  side: 'buy' | 'sell';
  quantity: number;
}

/** What the overlay may look at: features computed before the decision, and nothing else. */
export interface OverlayContext {
  /** Features keyed by name. Only values known before the decision belong here. */
  features: Readonly<Record<string, FeatureValue>>;
  /** When the decision is made, UTC ms. */
  decidedAt: number;
}

export type OverlayDecision = 'allow' | 'deny' | 'resize';

export type StateCode = 'GREEN' | 'YELLOW' | 'RED' | 'GRAY-NOSIGNAL' | 'GRAY-NODATA';

/** What an overlay returns. `featuresHash` is not set by the overlay: the sandbox computes it. */
export interface OverlayAnswer {
  decision: OverlayDecision;
  /** Only for `resize`: a factor above zero, at most the sandbox limit (default 1: an overlay may shrink, not grow). */
  sizeMultiplier?: number;
  /** Optional change of side, for overlays that flip direction. */
  direction?: 'buy' | 'sell';
  reasonCode: string;
  stateCode?: StateCode;
}

export interface Overlay {
  id: string;
  version: number;
  /** The H- or PH- identifier of the hypothesis this overlay tests. */
  hypothesisId: string;
  /** Hash of the overlay's definition: what the registry froze. */
  ruleHash: string;
  evaluate(candidate: Candidate, context: OverlayContext): OverlayAnswer;
}

/** The answer as recorded: the overlay's answer plus the hash of the exact features it saw. */
export interface OverlayResult extends OverlayAnswer {
  featuresHash: string;
}
