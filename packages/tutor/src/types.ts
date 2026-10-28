/** The AI tutor's shared types (SSD v4.1 §7). The tutor teaches and never tips; nothing here reaches an order. */
export const FEATURES = [
  'learning_guide',
  'ask_screen',
  'pre_trade',
  'trade_review',
  'weekly_review',
  'quiz_feedback',
  'scenario_debrief',
] as const;
export type Feature = (typeof FEATURES)[number];

export const FEATURE_LABELS: Readonly<Record<Feature, string>> = {
  learning_guide: 'Learning guide',
  ask_screen: 'Ask about this screen',
  pre_trade: 'Pre-trade check',
  trade_review: 'Trade review',
  weekly_review: 'Weekly coach review',
  quiz_feedback: 'Quiz feedback',
  scenario_debrief: 'Scenario debrief',
};

export type AiMode = 'off' | 'preview' | 'on';

/** A figure about the person's own account or trades. Code inserts `value`; the model only names the `key`. */
export interface Fact {
  key: string;
  label: string;
  value: string;
  /** For a fact that changes over time (a rate, a rule): the date it was checked. */
  asOf?: string;
}

export interface Material {
  title: string;
  text: string;
}

/** Everything a feature sends to the model, and nothing else. */
export interface TutorContext {
  feature: Feature;
  facts: Fact[];
  /** Lesson text, the screen, the person's own journal text. */
  material: Material[];
  /** Trading symbols the answer may mention. */
  symbols: string[];
  /** Lessons to point the person to. */
  lessonIds: string[];
  /** What the person typed, for features that take a question. */
  question?: string;
}

export type FallbackReason =
  | 'mode_off'
  | 'feature_off'
  | 'no_key'
  | 'limit_reached'
  | 'provider_error'
  | 'refused'
  | 'verifier_failed'
  | 'tip_request';

export interface Provenance {
  model: string;
  templateVersion: string;
  contextHash: string;
  verifier: { ok: boolean; reasons: string[] };
}

export interface ProviderRequest {
  system: string;
  user: string;
  model: string;
  maxTokens: number;
}

export interface ProviderReply {
  text: string;
  inputTokens: number;
  outputTokens: number;
  /** The provider declined to answer for safety reasons. */
  refused?: boolean;
}

/** A way to reach a language model. The app supplies one; tests supply a fake. */
export interface ModelProvider {
  readonly id: string;
  complete(req: ProviderRequest): Promise<ProviderReply>;
}

/** A failure to reach the provider. `retryable` ones (network, overload) are tried once more. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
