/**
 * What the tutor may spend (SSD v4.1 §7.5). Costs are estimated before each call from the text length and the model's
 * price, and added up per calendar month in paise. Prices and the dollar rate are approximations kept in one place.
 */
export interface ModelInfo {
  id: string;
  label: string;
  /** US cents per million tokens: input and output (prompts up to 100,000 tokens). */
  inCentsPerMTok: number;
  outCentsPerMTok: number;
}

export const MODELS: readonly ModelInfo[] = [
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5 (fast, cheapest)', inCentsPerMTok: 10, outCentsPerMTok: 50 },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5 (balanced)', inCentsPerMTok: 200, outCentsPerMTok: 1000 },
  { id: 'claude-opus-5-5', label: 'Opus 5.5 (deepest, dearest)', inCentsPerMTok: 400, outCentsPerMTok: 2000 },
];
export const DEFAULT_MODEL = 'claude-haiku-5-5';

/** Prices as checked on this date; shown with the usage meter. */
export const PRICES_AS_OF = '2026-10-28';

/** About ₹90 to the dollar, in paise. An approximation: the real rate moves. */
export const PAISE_PER_USD = 9000;

/** The newest tokenizer counts about this many characters per token; estimates use fewer to stay on the safe side. */
const CHARS_PER_TOKEN = 3;

export const modelInfo = (id: string): ModelInfo | null => MODELS.find((m) => m.id === id) ?? null;

export function estimateInputTokens(system: string, user: string): number {
  return Math.ceil((system.length + user.length) / CHARS_PER_TOKEN);
}

/** Paise for a call, rounded up so a tiny call still counts. */
export function costPaise(model: ModelInfo, inputTokens: number, outputTokens: number): number {
  const cents = inputTokens * model.inCentsPerMTok + outputTokens * model.outCentsPerMTok; // cent-tokens per million
  return Math.ceil((cents * PAISE_PER_USD) / 100 / 1_000_000);
}

export interface Usage {
  /** `YYYY-MM` of the month the figures are for. */
  month: string;
  spentPaise: number;
  calls: number;
}

/** The calendar month in India (UTC+5:30) of a time in milliseconds. */
export function monthOf(ms: number): string {
  return new Date(ms + 19_800_000).toISOString().slice(0, 7);
}

export const emptyUsage = (now: number): Usage => ({ month: monthOf(now), spentPaise: 0, calls: 0 });

/** The usage to count against: last month's figures start again from zero. */
export const currentUsage = (u: Usage | null, now: number): Usage => (u === null || u.month !== monthOf(now) ? emptyUsage(now) : u);

export const withinLimit = (u: Usage, estimatePaise: number, limitRupees: number): boolean => u.spentPaise + estimatePaise <= limitRupees * 100;

export const addSpend = (u: Usage, paise: number): Usage => ({ ...u, spentPaise: u.spentPaise + paise, calls: u.calls + 1 });
