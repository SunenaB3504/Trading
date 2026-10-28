import { GLOSSARY, SAMPLES } from '@trading/content';
import { describe, expect, it } from 'vitest';
import { askTutor } from './engine';
import type { AskDeps } from './engine';
import { askScreen, learningGuide, lessonMaterial, preTrade, quizFeedback, scenarioDebrief, scrub, tradeReview, weeklyReview } from './contexts';
import { buildPrompt, fillPlaceholders, SYSTEM_PROMPT } from './prompt';
import { FEATURES, ProviderError } from './types';
import type { Fact, ModelProvider, ProviderReply, ProviderRequest, TutorContext } from './types';
import { addSpend, costPaise, currentUsage, emptyUsage, estimateInputTokens, modelInfo, monthOf, withinLimit } from './usage';
import { DECLINE_TEXT, isTipRequest, verifyAnswer } from './verifier';

const NOW = Date.UTC(2026, 9, 28, 6, 0, 0);
const cash: Fact = { key: 'cash', label: 'cash in the practice account', value: '₹9,90,000.00' };
const known = new Set(GLOSSARY.map((g) => g.term.toUpperCase()));

const ctx = (over: Partial<TutorContext> = {}): TutorContext => ({ feature: 'pre_trade', facts: [cash], material: [{ title: 'The order', text: 'Buy 10 AAA at market.' }], symbols: ['AAA'], lessonIds: ['order-types'], ...over });

/** A provider that answers with fixed text and records what it was asked. */
function fake(text: string, over: Partial<ProviderReply> = {}): ModelProvider & { calls: ProviderRequest[] } {
  const calls: ProviderRequest[] = [];
  return { id: 'fake', calls, complete: (req) => { calls.push(req); return Promise.resolve({ text, inputTokens: 500, outputTokens: 200, ...over }); } };
}

const deps = (over: Partial<AskDeps> = {}): AskDeps => ({ mode: 'on', provider: fake('Why this order? Where is your exit?'), model: 'claude-haiku-5-5', featureOn: true, usage: emptyUsage(NOW), limitRupees: 200, sample: 'Sample text.', knownTerms: known, ...over });

describe('prompt (SSD v4.1 §7.6)', () => {
  it('has a fixed system prompt that teaches and never tips', () => {
    expect(SYSTEM_PROMPT).toMatch(/never tip/i);
    expect(buildPrompt(ctx()).system).toBe(SYSTEM_PROMPT);
  });
  it('lists facts by placeholder with their value and date, symbols and material', () => {
    const p = buildPrompt(ctx({ facts: [{ ...cash, asOf: '2026-10-26' }], question: 'What is this?' }));
    expect(p.user).toContain('{{fact:cash}} = ₹9,90,000.00 (cash in the practice account, as of 2026-10-26)');
    expect(p.user).toContain('Symbols: AAA');
    expect(p.user).toContain('## The order\nBuy 10 AAA at market.');
    expect(p.user).toContain('Question: What is this?');
  });
  it('fingerprints the context: same context same hash, any change another', () => {
    const a = buildPrompt(ctx()).contextHash;
    expect(buildPrompt(ctx()).contextHash).toBe(a);
    expect(buildPrompt(ctx({ question: 'x' })).contextHash).not.toBe(a);
  });
  it('fills placeholders from the facts and reports unknown ones', () => {
    expect(fillPlaceholders('You have {{fact:cash}} left.', [cash])).toMatchObject({ text: 'You have ₹9,90,000.00 left.', unknown: [], used: [cash] });
    expect(fillPlaceholders('Gain {{fact:gain}}.', [cash])).toMatchObject({ unknown: ['gain'], text: 'Gain {{fact:gain}}.' });
  });
});

describe('verifier', () => {
  const ok = (a: string, c = ctx()) => verifyAnswer(a, c, known);
  it('accepts a teaching answer with known terms and figures from the context', () => {
    expect(ok('Think about your exit. A stop-loss (SL) limits the loss. You have ₹9,90,000.00 in cash.').ok).toBe(true);
  });
  it('refuses advice, with or without a named security', () => {
    expect(ok('You should buy AAA now.').reasons).toContain('advice');
    expect(ok('I recommend selling this.').reasons).toContain('advice');
    expect(ok('AAA looks strong, so holding it is wise.').reasons).toContain('named_security');
    expect(ok('Target price is high.').ok).toBe(false);
  });
  it('refuses predictions about a named security but allows general teaching', () => {
    expect(ok('AAA will rise next week.').ok).toBe(false);
    expect(ok('Prices can rise or fall, so plan for both.').ok).toBe(true);
  });
  it('refuses a ticker that is not known and accepts glossary terms and listed symbols', () => {
    expect(ok('Look at ZOMBIE for ideas.').reasons.join()).toContain('unknown_ticker:ZOMBIE');
    expect(ok('A SIP in an ETF uses NAV; AAA is the example.').ok).toBe(true);
  });
  it('refuses rupee figures that are not in the context, and accepts those that are', () => {
    expect(ok('You lost ₹5,000.').reasons).toContain('figure_not_in_context');
    expect(ok('Cash is ₹9,90,000.00.').ok).toBe(true);
    expect(ok('A 10% fall is common.').ok).toBe(true);
    expect(ok('Your cash is 990000 rupees.', ctx({ facts: [{ ...cash, value: '990000 rupees' }] })).ok).toBe(true);
  });
  it('refuses empty, over-long and unfilled answers', () => {
    expect(ok('   ').reasons).toContain('empty');
    expect(ok('a '.repeat(2000)).reasons).toContain('too_long');
    expect(ok('Cash {{fact:cash}}').reasons).toContain('unfilled_placeholder');
  });
});

describe('tip requests are declined', () => {
  it.each([
    'give me a stock tip',
    'Which stock should I buy?',
    'what should I buy today',
    'Should I sell my shares now?',
    'best stocks for diwali',
    'will AAA go up tomorrow?',
    'what is the target price of AAA',
  ])('declines "%s"', (q) => expect(isTipRequest(q)).toBe(true));
  it.each(['What is a stop-loss order?', 'Why did my order fill at the open?', 'How do I read a P/E ratio?', 'Explain the contract note'])('lets "%s" through', (q) => expect(isTipRequest(q)).toBe(false));
  it('does not call the provider and says so, even with the AI on', async () => {
    const p = fake('Buy AAA.');
    const a = await askTutor(ctx({ feature: 'ask_screen', question: 'give me a stock tip' }), deps({ provider: p }));
    expect(a).toMatchObject({ source: 'declined', reason: 'tip_request', text: DECLINE_TEXT });
    expect(p.calls).toHaveLength(0);
  });
});

describe('modes', () => {
  it('Off gives the coach answer, with the lesson to read, and no call', async () => {
    const p = fake('x');
    const a = await askTutor(ctx(), deps({ mode: 'off', provider: p }));
    expect(a).toMatchObject({ source: 'coach', reason: 'mode_off' });
    expect(a.text).toContain('The AI is off.');
    expect(a.text).toContain('Order types');
    expect(a.text).toContain('Pre-trade check would add');
    expect(p.calls).toHaveLength(0);
  });
  it('Preview shows the bundled sample for each feature, offline, with no call and no cost', async () => {
    const p = fake('x');
    for (const f of FEATURES) {
      const a = await askTutor(ctx({ feature: f }), deps({ mode: 'preview', provider: p, sample: SAMPLES[f] ?? null }));
      expect(a).toMatchObject({ source: 'preview', text: SAMPLES[f], usage: { spentPaise: 0, calls: 0 } });
      expect(SAMPLES[f]).toMatch(/^Sample answer\./);
    }
    expect(p.calls).toHaveLength(0);
  });
  it('a switched-off feature and a missing key give the coach answer', async () => {
    expect((await askTutor(ctx(), deps({ featureOn: false }))).reason).toBe('feature_off');
    expect((await askTutor(ctx(), deps({ provider: null }))).reason).toBe('no_key');
  });
});

describe('live answers', () => {
  it('sends the prompt to the chosen model, fills figures by code and stores provenance', async () => {
    const p = fake('Your cash is {{fact:cash}}. What is your exit if this is wrong?');
    const a = await askTutor(ctx(), deps({ provider: p }));
    expect(p.calls[0]).toMatchObject({ model: 'claude-haiku-5-5', system: SYSTEM_PROMPT });
    expect(a).toMatchObject({ source: 'ai', text: 'Your cash is ₹9,90,000.00. What is your exit if this is wrong?', facts: [cash], reason: null });
    expect(a.provenance).toMatchObject({ model: 'claude-haiku-5-5', templateVersion: 'tutor-v1', verifier: { ok: true, reasons: [] } });
    expect(a.provenance?.contextHash).toBe(buildPrompt(ctx()).contextHash);
    expect(a.usage.calls).toBe(1);
    expect(a.usage.spentPaise).toBeGreaterThan(0);
  });
  it('retries a passing failure once and then answers', async () => {
    let n = 0;
    const p: ModelProvider = { id: 'flaky', complete: () => (++n === 1 ? Promise.reject(new ProviderError('busy', true)) : Promise.resolve({ text: 'Plan your exit first.', inputTokens: 10, outputTokens: 10 })) };
    expect((await askTutor(ctx(), deps({ provider: p }))).source).toBe('ai');
    expect(n).toBe(2);
  });
  it('gives up after one retry, and at once for a failure that will not pass (bad key, no network)', async () => {
    let n = 0;
    const busy: ModelProvider = { id: 'busy', complete: () => { n += 1; return Promise.reject(new ProviderError('busy', true)); } };
    expect(await askTutor(ctx(), deps({ provider: busy }))).toMatchObject({ source: 'coach', reason: 'provider_error' });
    expect(n).toBe(2);
    let m = 0;
    const badKey: ModelProvider = { id: 'bad', complete: () => { m += 1; return Promise.reject(new ProviderError('401', false)); } };
    expect((await askTutor(ctx(), deps({ provider: badKey }))).reason).toBe('provider_error');
    expect(m).toBe(1);
  });
  it('treats a thrown non-provider error as a failure, not a crash', async () => {
    const boom: ModelProvider = { id: 'boom', complete: () => Promise.reject(new Error('network down')) };
    expect((await askTutor(ctx(), deps({ provider: boom }))).source).toBe('coach');
  });
  it('shows the coach answer when the model refuses, and still counts the spend', async () => {
    const a = await askTutor(ctx(), deps({ provider: fake('', { refused: true }) }));
    expect(a).toMatchObject({ source: 'coach', reason: 'refused' });
    expect(a.usage.calls).toBe(1);
  });
  it('shows the coach answer when the verifier fails, never the bad answer', async () => {
    for (const bad of ['You should buy AAA today.', 'Your loss was {{fact:loss}}.', 'You lost ₹1,234.', 'Try ZOMBIE.']) {
      const a = await askTutor(ctx(), deps({ provider: fake(bad) }));
      expect(a).toMatchObject({ source: 'coach', reason: 'verifier_failed' });
      expect(a.text).not.toContain('AAA today');
      expect(a.provenance).toBeNull();
    }
  });
});

describe('monthly limit (SSD v4.1 §7.5)', () => {
  it('prices a call from the model and rounds up', () => {
    const haiku = modelInfo('claude-haiku-5-5');
    expect(haiku).not.toBeNull();
    // 1,000,000 in-tokens at 10 cents = 10 cents = ₹9 = 900 paise at 9000 paise a dollar
    expect(costPaise(haiku ?? { id: '', label: '', inCentsPerMTok: 0, outCentsPerMTok: 0 }, 1_000_000, 0)).toBe(900);
    expect(costPaise(haiku ?? { id: '', label: '', inCentsPerMTok: 0, outCentsPerMTok: 0 }, 1, 0)).toBe(1);
    expect(estimateInputTokens('abc', 'defghi')).toBe(3);
  });
  it('stops at the cap before calling, and gives the coach answer', async () => {
    const p = fake('Plan your exit.');
    const full = { ...emptyUsage(NOW), spentPaise: 20_000 };
    const a = await askTutor(ctx(), deps({ provider: p, usage: full, limitRupees: 200 }));
    expect(a).toMatchObject({ source: 'coach', reason: 'limit_reached' });
    expect(p.calls).toHaveLength(0);
    expect(a.usage).toEqual(full);
  });
  it('lets a call through while the estimate fits and counts it afterwards', async () => {
    const a = await askTutor(ctx(), deps({ limitRupees: 200 }));
    expect(a.usage.spentPaise).toBeLessThan(200 * 100);
    expect(withinLimit(emptyUsage(NOW), 100, 1)).toBe(true);
    expect(withinLimit({ ...emptyUsage(NOW), spentPaise: 1 }, 100, 1)).toBe(false);
  });
  it('a zero limit blocks every call, and a dearer model hits the cap sooner', async () => {
    expect((await askTutor(ctx(), deps({ limitRupees: 0 }))).reason).toBe('limit_reached');
    const nearly = { ...emptyUsage(NOW), spentPaise: 19_800 };
    expect((await askTutor(ctx(), deps({ usage: nearly, model: 'claude-haiku-5-5' }))).source).toBe('ai');
    expect((await askTutor(ctx(), deps({ usage: nearly, model: 'claude-opus-5-5' }))).reason).toBe('limit_reached');
  });
  it('rejects an unknown model without calling', async () => {
    const p = fake('x');
    expect((await askTutor(ctx(), deps({ provider: p, model: 'gpt-x' }))).reason).toBe('provider_error');
    expect(p.calls).toHaveLength(0);
  });
  it('starts a new month from zero, in Indian time', () => {
    expect(monthOf(Date.UTC(2026, 9, 31, 18, 29))).toBe('2026-10');
    expect(monthOf(Date.UTC(2026, 9, 31, 18, 31))).toBe('2026-11'); // already 1 November in India
    const old = addSpend(emptyUsage(Date.UTC(2026, 8, 5)), 500);
    expect(currentUsage(old, NOW)).toEqual(emptyUsage(NOW));
    expect(currentUsage(addSpend(emptyUsage(NOW), 7), NOW).spentPaise).toBe(7);
    expect(currentUsage(null, NOW).calls).toBe(0);
  });
});

describe('what each feature sends (SSD v4.1 §7.4)', () => {
  const journal = { why: 'Results looked steady, said Sunil', target: '1500', exitPlan: 'Sell below 1300', confidence: 4, what: 'Stopped out', learned: 'Size was big' };
  it('learning guide: progress and the next lesson, nothing about the person', () => {
    const c = learningGuide({ done: 3, total: 15, nextLessonId: 'equity-shares', quizzes: [{ title: 'Level 1 self-check', right: 5, total: 8 }] });
    expect(c.facts.map((f) => f.value)).toEqual(['3 of 15', '5 of 8 right']);
    expect(c.material[0]?.title).toContain('Equity shares');
    expect(c.lessonIds).toEqual(['equity-shares']);
  });
  it('ask about this screen: the screen text, its lesson and the question', () => {
    const c = askScreen({ screen: 'Trade', screenText: 'Order form', lessonId: 'order-types', facts: [cash], symbols: ['AAA'], question: 'What is a limit order?' });
    expect(c.material.map((m) => m.title)).toEqual(['Screen: Trade', expect.stringContaining('Order types')]);
    expect(c.question).toBe('What is a limit order?');
  });
  it('pre-trade: the order, journal text, flags and cash', () => {
    const c = preTrade({ order: 'Buy 10 AAA at market', facts: [cash], flags: ['No exit plan'], journal, symbols: ['AAA'], names: ['Sunil'], lessonIds: ['habits-that-help'] });
    const text = c.material.map((m) => m.text).join('\n');
    expect(text).toContain('Buy 10 AAA at market');
    expect(text).toContain('Exit if wrong: Sell below 1300');
    expect(text).toContain('- No exit plan');
    expect(c.facts).toEqual([cash]);
  });
  it('trade review: the trade and the journal with the after-note', () => {
    const c = tradeReview({ trade: 'Bought 10 AAA, sold 10 AAA', facts: [], journal, symbols: ['AAA'], names: [] });
    expect(c.material.map((m) => m.text).join('\n')).toMatch(/What happened: Stopped out[\s\S]*What I learned: Size was big/);
  });
  it('weekly review: entries, flags and at most eight journal entries', () => {
    const c = weeklyReview({ facts: [], flags: ['Overtrading'], entries: Array.from({ length: 12 }, () => journal), symbols: [], names: [] });
    expect(c.material.filter((m) => m.title.startsWith('Journal entry'))).toHaveLength(8);
    expect(c.material.some((m) => m.text.includes('- Overtrading'))).toBe(true);
  });
  it('scenario debrief: the goal and whether it was met, what was done, what followed and the lesson', () => {
    const c = scenarioDebrief({ title: 'The 2020 recovery', goalText: 'Beat the index', goalMet: false, facts: [], actions: ['buy 1000 NIFTYBEES'], followed: 'The benchmark rose after.', symbols: ['NIFTYBEES'], lessonIds: ['behavioural-traps'] });
    expect(c.feature).toBe('scenario_debrief');
    expect(c.material[0]?.text).toContain('Goal met: no');
    expect(c.material[1]?.text).toBe('- buy 1000 NIFTYBEES');
    expect(scenarioDebrief({ title: 't', goalText: 'g', goalMet: true, facts: [], actions: [], followed: 'f', symbols: [], lessonIds: [] }).material[1]?.text).toBe('No orders were placed.');
  });
  it('quiz feedback: the question, the model answer and the lesson', () => {
    const c = quizFeedback({ question: 'Where does a stop fill?', modelAnswer: 'Near the open.', lessonIds: ['order-types'] });
    expect(c.material[0]?.text).toBe('Where does a stop fill?\nModel answer: Near the open.');
    expect(c.material).toHaveLength(2);
  });
  it('never sends a name, a PIN or a key', () => {
    expect(scrub('Sunil said sk-ant-api03-abcdef123456 and AIzaSyA1234567890abc', ['Sunil'])).toBe('[name] said [key] and [key]');
    const c = preTrade({ order: 'Buy', facts: [], flags: [], journal: { ...journal, why: 'Neil told me; my key is sk-ant-xyz123456789' }, symbols: [], names: ['Neil', 'Sunil'], lessonIds: [] });
    const sent = buildPrompt(c).user;
    expect(sent).not.toMatch(/Neil|Sunil|sk-ant/);
  });
  it('cuts long journal text and long lessons', () => {
    expect(scrub('x'.repeat(5000), [])).toHaveLength(1000);
    expect((lessonMaterial('costs-of-trading')?.text.length ?? 0)).toBeLessThanOrEqual(3000);
    expect(lessonMaterial('nope')).toBeNull();
    expect(lessonMaterial('order-types')?.title).toContain('facts checked 2026-10-24');
  });
  it('every feature has a task in the prompt', () => {
    for (const f of FEATURES) expect(buildPrompt(ctx({ feature: f })).user).toMatch(/^Task: \S/);
  });
});
