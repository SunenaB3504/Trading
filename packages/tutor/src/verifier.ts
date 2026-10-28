import type { TutorContext } from './types';

/**
 * The deterministic check run on every answer before it is shown (SSD v4.1 §7.6, runbook R16.4). It looks for advice
 * or predictions about a named security, ticker-like words that are not known, and rupee figures that are not in the
 * context. Any failure means the coach answer is shown instead. It is code, not a model, and errs on the side of refusing.
 */
export interface Verdict {
  ok: boolean;
  reasons: string[];
}

export const MAX_ANSWER_CHARS = 2400;

/** Capitalised words that are not tickers. Glossary terms and the symbols of the context are added by the caller. */
const COMMON = [
  'SIP', 'ETF', 'ETFS', 'NAV', 'STT', 'GST', 'SEBI', 'NSE', 'BSE', 'IPO', 'KYC', 'FII', 'DII', 'GTT', 'MTF', 'DP', 'AMFI', 'REIT', 'INVIT',
  'EPS', 'ROE', 'ROCE', 'RSI', 'GDP', 'RBI', 'NIFTY', 'SENSEX', 'FIFO', 'AI', 'OK', 'USD', 'INR', 'PAN', 'UPI', 'FD', 'PPF', 'NPS', 'SL', 'SLM',
  'IST', 'MF', 'AMC', 'TER', 'CAGR', 'ASM', 'GSM', 'OHLC', 'OTP', 'PIN', 'APK', 'LTP', 'DEMAT', 'BTST', 'FOMO',
];

const TICKER = /\b[A-Z][A-Z0-9&]{2,11}\b/g;
const MONEY = /₹\s?\d[\d,]*(?:\.\d+)?|\d[\d,]*(?:\.\d+)?\s?(?:rupees|crore|lakh)\b/gi;
const SENTENCE = /[^.!?\n]+[.!?]?/g;

const ADVICE = [
  /\b(you should|i recommend|i suggest|i would|consider|worth|good time to|time to)\s+(buy|buying|sell|selling|short|shorting|hold|holding|invest|investing|add|adding|accumulate)\b/i,
  /\b(buy|sell|short|accumulate)\s+(it|this|that|these|those|now|today)\b/i,
  /\btarget price\b/i,
  /\bguarantee[sd]?\b/i,
];
const PREDICTION = /\b(will|is going to|is likely to|is set to|should|expected to|bound to)\s+(rise|fall|go up|go down|double|crash|rally|reach|hit|outperform|beat|gain|drop|jump|soar)\b/i;
const VERB_NEAR_NAME = /\b(buy|buying|sell|selling|short|hold|holding|invest in|investing in|accumulate|avoid)\b/i;

const normaliseMoney = (s: string): string => s.toLowerCase().replace(/[₹\s,]/g, '').replace(/(rupees|crore|lakh)$/, '$1');
const moneyIn = (text: string): string[] => (text.match(MONEY) ?? []).map(normaliseMoney);

function allowedMoney(ctx: TutorContext): Set<string> {
  const text = [...ctx.facts.map((f) => f.value), ...ctx.material.map((m) => m.text), ctx.question ?? ''].join('\n');
  return new Set(moneyIn(text));
}

function allowedWords(ctx: TutorContext, known: ReadonlySet<string>): Set<string> {
  const out = new Set<string>([...COMMON, ...known, ...ctx.symbols.map((s) => s.toUpperCase())]);
  for (const f of ctx.facts) for (const w of f.value.match(TICKER) ?? []) out.add(w);
  for (const m of ctx.material) for (const w of m.text.match(TICKER) ?? []) out.add(w.toUpperCase());
  return out;
}

function adviceProblems(answer: string, symbols: readonly string[]): string[] {
  const names = symbols.map((s) => s.toUpperCase());
  const flagged: string[] = [];
  for (const sentence of answer.match(SENTENCE) ?? []) {
    const upper = sentence.toUpperCase();
    const named = names.some((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(upper));
    if (ADVICE.some((r) => r.test(sentence))) flagged.push('advice');
    else if (named && (PREDICTION.test(sentence) || VERB_NEAR_NAME.test(sentence))) flagged.push('named_security');
  }
  return [...new Set(flagged)];
}

/** Checks a filled answer (placeholders already replaced) against the context it was made from. */
export function verifyAnswer(answer: string, ctx: TutorContext, knownTerms: ReadonlySet<string> = new Set()): Verdict {
  const reasons: string[] = [];
  if (answer.trim() === '') reasons.push('empty');
  if (answer.length > MAX_ANSWER_CHARS) reasons.push('too_long');
  if (/\{\{[^}]*\}\}/.test(answer)) reasons.push('unfilled_placeholder');
  reasons.push(...adviceProblems(answer, ctx.symbols));
  const words = allowedWords(ctx, new Set([...knownTerms].map((t) => t.toUpperCase())));
  const odd = (answer.match(TICKER) ?? []).filter((w) => !words.has(w.toUpperCase()));
  if (odd.length > 0) reasons.push(`unknown_ticker:${[...new Set(odd)].slice(0, 3).join(',')}`);
  const allowed = allowedMoney(ctx);
  const stray = moneyIn(answer).filter((m) => !allowed.has(m));
  if (stray.length > 0) reasons.push('figure_not_in_context');
  return { ok: reasons.length === 0, reasons };
}

const TIP = [
  /\bstock tips?\b/i,
  /\bgive me (a |some )?(stock|share|fund|etf|tip|pick|recommendation)/i,
  /\b(which|what)\b[^.?]{0,40}\b(stock|share|fund|etf|scrip)s?\b[^.?]{0,40}\b(buy|invest|pick|choose|best|good|safe|go for)\b/i,
  /\bwhat (should|can|do) i (buy|sell|invest)\b/i,
  /\bshould i (buy|sell|invest|hold|exit|short|put money)\b/i,
  /\b(best|top|safest|hot|multibagger)\s+(stock|share|fund|etf|pick)s?\b/i,
  /\b(will|is) [^.?]{0,40}\b(go up|go down|rise|fall|double|crash|be higher|be lower)\b/i,
  /\bprice target\b|\btarget price\b/i,
];

/** Whether a question asks what to buy or sell, or where a real price is going. Those are declined before any call. */
export const isTipRequest = (question: string): boolean => TIP.some((r) => r.test(question));

export const DECLINE_TEXT =
  'I teach how markets work; I cannot say what to buy or sell, or where a price is going. Nobody can tell that reliably. I can explain how to judge a company, what risk means, or how an order works.';
