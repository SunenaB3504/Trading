import { need, splitFrontMatter } from './frontMatter';
import { parseBlocks } from './markdown';
import type { Block } from './markdown';

export interface Lesson {
  id: string;
  title: string;
  level: number;
  order: number;
  source: string;
  /** The date the numbers and rules in the lesson were last checked. */
  factsAsOf: string;
  /** Whether the owner has read and approved the lesson. */
  reviewed: boolean;
  /** The Practise screen to open and what to do there (the "Try it" exercise). */
  tryIt: { tab: string; text: string };
  blocks: Block[];
}

export interface GlossaryEntry {
  term: string;
  meaning: string;
  lessons: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  answer: string;
  lessons: string[];
}

export interface Quiz {
  id: string;
  title: string;
  level: number;
  questions: QuizQuestion[];
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const list = (s: string): string[] => s.split(',').map((x) => x.trim()).filter((x) => x !== '');

export function parseLesson(text: string, file: string): Lesson {
  const { meta, body } = splitFrontMatter(text, file);
  const id = need(meta, 'id', file);
  const asOf = need(meta, 'facts_as_of', file);
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error(`${file}: bad id "${id}"`);
  if (!DATE.test(asOf)) throw new Error(`${file}: facts_as_of must be YYYY-MM-DD`);
  const level = Number(need(meta, 'level', file));
  const order = Number(need(meta, 'order', file));
  if (!Number.isInteger(level) || !Number.isInteger(order)) throw new Error(`${file}: level and order must be whole numbers`);
  const reviewed = need(meta, 'reviewed', file);
  if (reviewed !== 'true' && reviewed !== 'false') throw new Error(`${file}: reviewed must be true or false`);
  if (body === '') throw new Error(`${file}: empty lesson`);
  return {
    id,
    title: need(meta, 'title', file),
    level,
    order,
    source: need(meta, 'source', file),
    factsAsOf: asOf,
    reviewed: reviewed === 'true',
    tryIt: { tab: need(meta, 'try_tab', file), text: need(meta, 'try_text', file) },
    blocks: parseBlocks(body),
  };
}

export function parseGlossary(text: string): GlossaryEntry[] {
  const out: GlossaryEntry[] = [];
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (!line.startsWith('|') || /^\|\s*(Term|-+)/.test(line)) continue;
    const c = line.replace(/^\||\|$/g, '').split('|').map((x) => x.trim());
    if (c.length !== 3 || c[0] === '' || c[1] === '') throw new Error(`glossary: bad row "${line}"`);
    out.push({ term: c[0] ?? '', meaning: c[1] ?? '', lessons: list(c[2] ?? '') });
  }
  return out;
}

export function parseQuiz(text: string, file: string): Quiz {
  const { meta, body } = splitFrontMatter(text, file);
  const id = need(meta, 'id', file);
  const questions = body.split(/^## /m).slice(1).map((chunk): QuizQuestion => {
    const m = /^(Q\d+) \| lessons: ([^\n]*)\n([\s\S]*?)\n### Answer\n([\s\S]*)$/.exec(chunk);
    if (m === null) throw new Error(`${file}: a question is not in the "## Qn | lessons: ..." form`);
    return { id: `${id}:${m[1] ?? ''}`, question: (m[3] ?? '').trim(), answer: (m[4] ?? '').trim(), lessons: list(m[2] ?? '') };
  });
  if (questions.length === 0) throw new Error(`${file}: no questions`);
  return { id, title: need(meta, 'title', file), level: Number(need(meta, 'level', file)), questions };
}
