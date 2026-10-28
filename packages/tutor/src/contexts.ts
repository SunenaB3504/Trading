import { lessonById, plainText } from '@trading/content';
import type { Block } from '@trading/content';
import type { Fact, Material, TutorContext } from './types';

/**
 * Builders for what each feature sends (SSD v4.1 §7.4). They take plain data, so they can be tested without the app,
 * and they send only practice data, journal text and lesson text: never a person's name, a PIN or a key.
 */
const MAX_TEXT = 1000;
const MAX_LESSON = 3000;

/** Journal text with the profile names and anything that looks like an API key taken out, and cut short. */
export function scrub(text: string, names: readonly string[]): string {
  let out = text.replace(/\bsk-[A-Za-z0-9_-]{8,}\b/g, '[key]').replace(/\bAIza[A-Za-z0-9_-]{10,}\b/g, '[key]');
  for (const n of names.map((x) => x.trim()).filter((x) => x.length >= 2))
    out = out.replace(new RegExp(n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[name]');
  return out.slice(0, MAX_TEXT);
}

const blockText = (b: Block): string => {
  if (b.t === 'h' || b.t === 'p') return plainText(b.spans);
  if (b.t === 'table') return [b.head, ...b.rows].map((r) => r.map(plainText).join(' | ')).join('\n');
  return b.items.map((i) => `- ${plainText(i)}`).join('\n');
};

/** The lesson as plain text with its title, cut to a length the prompt can carry, with its facts date. */
export function lessonMaterial(id: string): Material | null {
  const l = lessonById(id);
  if (l === null) return null;
  return { title: `Lesson: ${l.title} (facts checked ${l.factsAsOf})`, text: l.blocks.map(blockText).join('\n').slice(0, MAX_LESSON) };
}

const lessons = (ids: readonly string[]): Material[] => ids.map(lessonMaterial).filter((m): m is Material => m !== null);

export interface JournalText {
  why: string;
  target: string;
  exitPlan: string;
  confidence: number | null;
  what?: string;
  learned?: string;
}

function journalMaterial(j: JournalText | null, names: readonly string[]): Material[] {
  if (j === null) return [];
  const lines = [
    `Why: ${scrub(j.why, names) || 'not written'}`,
    `Target: ${scrub(j.target, names) || 'not written'}`,
    `Exit if wrong: ${scrub(j.exitPlan, names) || 'not written'}`,
    `Confidence: ${j.confidence === null ? 'not given' : `${String(j.confidence)} of 5`}`,
  ];
  if (j.what !== undefined) lines.push(`What happened: ${scrub(j.what, names) || 'not written'}`);
  if (j.learned !== undefined) lines.push(`What I learned: ${scrub(j.learned, names) || 'not written'}`);
  return [{ title: 'Journal', text: lines.join('\n') }];
}

export function learningGuide(i: { done: number; total: number; nextLessonId: string | null; quizzes: Array<{ title: string; right: number; total: number }> }): TutorContext {
  const facts: Fact[] = [
    { key: 'lessons_done', label: 'lessons done', value: `${String(i.done)} of ${String(i.total)}` },
    ...i.quizzes.map((q, n): Fact => ({ key: `quiz_${String(n + 1)}`, label: q.title, value: `${String(q.right)} of ${String(q.total)} right` })),
  ];
  const ids = i.nextLessonId === null ? [] : [i.nextLessonId];
  return { feature: 'learning_guide', facts, material: lessons(ids), symbols: [], lessonIds: ids };
}

export function askScreen(i: { screen: string; screenText: string; lessonId: string | null; facts: Fact[]; symbols: string[]; question: string }): TutorContext {
  const ids = i.lessonId === null ? [] : [i.lessonId];
  return {
    feature: 'ask_screen',
    facts: i.facts,
    material: [{ title: `Screen: ${i.screen}`, text: i.screenText.slice(0, MAX_TEXT) }, ...lessons(ids)],
    symbols: i.symbols,
    lessonIds: ids,
    question: i.question.slice(0, 300),
  };
}

export function preTrade(i: { order: string; facts: Fact[]; flags: string[]; journal: JournalText | null; symbols: string[]; names: string[]; lessonIds: string[] }): TutorContext {
  const flags: Material[] = i.flags.length === 0 ? [] : [{ title: 'Coach flags so far', text: i.flags.map((f) => `- ${f}`).join('\n') }];
  return {
    feature: 'pre_trade',
    facts: i.facts,
    material: [{ title: 'The order', text: i.order }, ...journalMaterial(i.journal, i.names), ...flags, ...lessons(i.lessonIds)],
    symbols: i.symbols,
    lessonIds: i.lessonIds,
  };
}

export function tradeReview(i: { trade: string; facts: Fact[]; journal: JournalText | null; symbols: string[]; names: string[] }): TutorContext {
  const ids = ['habits-that-help'];
  return {
    feature: 'trade_review',
    facts: i.facts,
    material: [{ title: 'The trade', text: i.trade }, ...journalMaterial(i.journal, i.names), ...lessons(ids)],
    symbols: i.symbols,
    lessonIds: ids,
  };
}

export function weeklyReview(i: { facts: Fact[]; flags: string[]; entries: JournalText[]; symbols: string[]; names: string[] }): TutorContext {
  const journal = i.entries.slice(0, 8).flatMap((e, n) => journalMaterial(e, i.names).map((m) => ({ ...m, title: `Journal entry ${String(n + 1)}` })));
  const flags: Material[] = i.flags.length === 0 ? [] : [{ title: 'Coach flags this week', text: i.flags.map((f) => `- ${f}`).join('\n') }];
  const ids = ['behavioural-traps'];
  return { feature: 'weekly_review', facts: i.facts, material: [...journal, ...flags, ...lessons(ids)], symbols: i.symbols, lessonIds: ids };
}

export function quizFeedback(i: { question: string; modelAnswer: string; lessonIds: string[] }): TutorContext {
  return {
    feature: 'quiz_feedback',
    facts: [],
    material: [{ title: 'Quiz question', text: `${i.question}\nModel answer: ${i.modelAnswer}` }, ...lessons(i.lessonIds)],
    symbols: [],
    lessonIds: i.lessonIds,
  };
}

export function scenarioDebrief(i: { title: string; goalText: string; goalMet: boolean; facts: Fact[]; actions: string[]; followed: string; symbols: string[]; lessonIds: string[] }): TutorContext {
  const did = i.actions.length === 0 ? 'No orders were placed.' : i.actions.slice(0, 40).map((a) => `- ${a}`).join('\n');
  return {
    feature: 'scenario_debrief',
    facts: i.facts,
    material: [
      { title: 'Scenario', text: `${i.title}\nGoal: ${i.goalText}\nGoal met: ${i.goalMet ? 'yes' : 'no'}` },
      { title: 'What the person did', text: did },
      { title: 'What followed after the scenario ended', text: i.followed },
      ...lessons(i.lessonIds),
    ],
    symbols: i.symbols,
    lessonIds: i.lessonIds,
  };
}
