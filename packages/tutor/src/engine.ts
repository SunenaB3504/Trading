import { coachAnswer } from './coach';
import { buildPrompt, fillPlaceholders } from './prompt';
import { addSpend, costPaise, estimateInputTokens, modelInfo, withinLimit } from './usage';
import type { Usage } from './usage';
import { DECLINE_TEXT, isTipRequest, verifyAnswer } from './verifier';
import { ProviderError } from './types';
import type { AiMode, Fact, FallbackReason, Feature, ModelProvider, Provenance, ProviderReply, TutorContext } from './types';

export const MAX_OUTPUT_TOKENS = 1500;

export interface AskDeps {
  mode: AiMode;
  /** Null when no key is saved. */
  provider: ModelProvider | null;
  model: string;
  featureOn: boolean;
  usage: Usage;
  limitRupees: number;
  /** The bundled sample for this feature, shown in Preview mode. */
  sample: string | null;
  /** Words the verifier should accept as known terms (the glossary). */
  knownTerms: ReadonlySet<string>;
}

export type AnswerSource = 'ai' | 'coach' | 'preview' | 'declined';

export interface TutorAnswer {
  feature: Feature;
  source: AnswerSource;
  text: string;
  /** Why the coach answered instead of the AI, when it did. */
  reason: FallbackReason | null;
  /** The figures used in the answer, shown under it. */
  facts: Fact[];
  provenance: Provenance | null;
  usage: Usage;
}

const fallback = (ctx: TutorContext, deps: AskDeps, reason: FallbackReason, source: AnswerSource = 'coach'): TutorAnswer => ({
  feature: ctx.feature,
  source,
  text: source === 'declined' ? DECLINE_TEXT : coachAnswer(ctx, reason),
  reason,
  facts: [],
  provenance: null,
  usage: deps.usage,
});

/** Calls the provider, trying once more if the first failure was a passing one. */
async function callWithRetry(provider: ModelProvider, req: Parameters<ModelProvider['complete']>[0]): Promise<ProviderReply | 'error'> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await provider.complete(req);
    } catch (e) {
      if (!(e instanceof ProviderError) || !e.retryable) return 'error';
    }
  }
  return 'error';
}

function offlineAnswer(ctx: TutorContext, deps: AskDeps): TutorAnswer | null {
  if (ctx.question !== undefined && isTipRequest(ctx.question)) return fallback(ctx, deps, 'tip_request', 'declined');
  if (deps.mode === 'off') return fallback(ctx, deps, 'mode_off');
  if (deps.mode === 'preview')
    return deps.sample === null
      ? fallback(ctx, deps, 'mode_off')
      : { feature: ctx.feature, source: 'preview', text: deps.sample, reason: null, facts: [], provenance: null, usage: deps.usage };
  if (!deps.featureOn) return fallback(ctx, deps, 'feature_off');
  return deps.provider === null ? fallback(ctx, deps, 'no_key') : null;
}

/**
 * One tutor answer (SSD v4.1 §7.6). Order of checks: a request for a tip is declined before anything is sent; Off and
 * Preview never call a provider; On checks the switch, the key and the monthly limit (by estimate), calls the model
 * with one retry for passing failures, fills the figures in by code, and runs the verifier. Any failure gives the
 * coach answer. Only money in the usage record changes; nothing here can reach an order or the ledger.
 */
export async function askTutor(ctx: TutorContext, deps: AskDeps): Promise<TutorAnswer> {
  const early = offlineAnswer(ctx, deps);
  if (early !== null || deps.provider === null) return early ?? fallback(ctx, deps, 'no_key');
  const model = modelInfo(deps.model);
  if (model === null) return fallback(ctx, deps, 'provider_error');
  const prompt = buildPrompt(ctx);
  const worst = costPaise(model, estimateInputTokens(prompt.system, prompt.user), MAX_OUTPUT_TOKENS);
  if (!withinLimit(deps.usage, worst, deps.limitRupees)) return fallback(ctx, deps, 'limit_reached');
  const reply = await callWithRetry(deps.provider, { system: prompt.system, user: prompt.user, model: model.id, maxTokens: MAX_OUTPUT_TOKENS });
  if (reply === 'error') return fallback(ctx, deps, 'provider_error');
  const usage = addSpend(deps.usage, costPaise(model, reply.inputTokens, reply.outputTokens));
  const withUsage = { ...deps, usage };
  if (reply.refused === true) return fallback(ctx, withUsage, 'refused');
  const filled = fillPlaceholders(reply.text, ctx.facts);
  const verdict = verifyAnswer(filled.text, ctx, deps.knownTerms);
  const reasons = filled.unknown.length > 0 ? [...verdict.reasons, 'unknown_placeholder'] : verdict.reasons;
  if (reasons.length > 0) return fallback(ctx, withUsage, 'verifier_failed');
  const provenance: Provenance = { model: model.id, templateVersion: prompt.templateVersion, contextHash: prompt.contextHash, verifier: { ok: true, reasons: [] } };
  return { feature: ctx.feature, source: 'ai', text: filled.text.trim(), reason: null, facts: filled.used, provenance, usage };
}
