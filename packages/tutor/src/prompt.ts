import { canonicalJson, sha256Hex } from '@trading/core';
import type { Fact, Feature, TutorContext } from './types';

/** Bump when the system prompt or any task text changes, so a stored answer says which wording made it. */
export const TEMPLATE_VERSION = 'tutor-v1';

/** Fixed for every call, so a provider can cache it. */
export const SYSTEM_PROMPT = [
  'You are a patient tutor inside a practice app that teaches how the Indian stock market works. All money in the app is virtual.',
  'Teach; never tip. Never tell the person what real security to buy, sell or hold, never predict a price, and never promise a result. If asked, say you only teach and point to the lesson.',
  'Explain general ideas in plain, short sentences for a beginner. Keep to a few short paragraphs, or a short list.',
  'Rates, tax rules, charges and lot sizes change: say only what the Facts and Material below say about them, with their dates, and say when you do not know.',
  'To quote a figure about the person own practice account or trades, write its placeholder, such as {{fact:cash}}, exactly as listed. Never type those numbers yourself and never invent a figure.',
  'Use only the trading symbols listed under Symbols. Do not ask for personal details. Plain text only.',
].join('\n');

export const TASKS: Readonly<Record<Feature, string>> = {
  learning_guide: 'Suggest what to learn next from the progress shown, and why, in three sentences or fewer.',
  ask_screen: 'Answer the question about the screen the person is looking at, using the Material. If no question is given, explain what the screen is for.',
  pre_trade: 'The person is about to place a practice order. Ask two or three short questions that help them think it through (reason, exit, size, costs), and mention any flag listed. Do not say whether to place it.',
  trade_review: 'Review this closed practice trade: what went as planned, what did not, and one thing to try next time. Be kind and specific, and use the journal text.',
  weekly_review: 'Review the week of practice trades: patterns you notice, flags to look at, and one habit to work on. Use the journal text.',
  quiz_feedback: 'The person marked their quiz answer wrong. Explain the idea behind the right answer in a different way from the model answer, and link it to the lesson.',
  scenario_debrief: 'Debrief the scenario: what the person did, what followed in the prices, and what it teaches. Do not say what they should have bought.',
};

function factLines(facts: readonly Fact[]): string {
  if (facts.length === 0) return '(none)';
  return facts.map((f) => `- {{fact:${f.key}}} = ${f.value} (${f.label}${f.asOf === undefined ? '' : `, as of ${f.asOf}`})`).join('\n');
}

export interface Prompt {
  system: string;
  user: string;
  templateVersion: string;
  /** Fingerprint of what was sent, so a stored answer can be matched to its context. */
  contextHash: string;
}

export function buildPrompt(ctx: TutorContext): Prompt {
  const material = ctx.material.map((m) => `## ${m.title}\n${m.text}`).join('\n\n');
  const user = [
    `Task: ${TASKS[ctx.feature]}`,
    `Facts:\n${factLines(ctx.facts)}`,
    `Symbols: ${ctx.symbols.length === 0 ? '(none)' : ctx.symbols.join(', ')}`,
    `Material:\n${material === '' ? '(none)' : material}`,
    ctx.question === undefined || ctx.question.trim() === '' ? '' : `Question: ${ctx.question.trim()}`,
  ]
    .filter((s) => s !== '')
    .join('\n\n');
  return { system: SYSTEM_PROMPT, user, templateVersion: TEMPLATE_VERSION, contextHash: sha256Hex(canonicalJson({ v: TEMPLATE_VERSION, ctx })) };
}

const PLACEHOLDER = /\{\{fact:([a-z0-9_]+)\}\}/g;

/** Replaces each placeholder with the fact's value from the context. Unknown keys are reported, not guessed. */
export function fillPlaceholders(text: string, facts: readonly Fact[]): { text: string; unknown: string[]; used: Fact[] } {
  const byKey = new Map(facts.map((f) => [f.key, f]));
  const unknown: string[] = [];
  const used = new Map<string, Fact>();
  const out = text.replace(PLACEHOLDER, (whole, key: string) => {
    const f = byKey.get(key);
    if (f === undefined) {
      unknown.push(key);
      return whole;
    }
    used.set(key, f);
    return f.value;
  });
  return { text: out, unknown, used: [...used.values()] };
}
