import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generatedSource } from './build';
import { HINTS } from './hints';
import { parseBlocks, spansOf } from './markdown';
import { parseGlossary, parseLesson, parseQuiz } from './parse';
import type { Lesson, Quiz } from './parse';
import { EMPTY_PROGRESS, levelStatus, markLesson, nextStep, recordQuiz } from './progress';
import type { Level } from './index';
import { GLOSSARY, LEVELS, LESSONS, PATH, QUIZZES, glossaryFor, lessonById, searchGlossary } from './index';

const L1 = LEVELS[0] as Level;
const L2 = LEVELS[1] as Level;
const ROOT = join(import.meta.dirname, '..');
const read = (dir: string): Record<string, string> =>
  Object.fromEntries(
    readdirSync(join(ROOT, dir))
      .filter((n) => n.endsWith('.md'))
      .sort()
      .map((n) => [n, readFileSync(join(ROOT, dir, n), 'utf8').replace(/\r\n/g, '\n')]),
  );

describe('content files (MIP v4.1 Stage 4)', () => {
  it('generated.ts matches the Markdown files: run pnpm content:build after editing a lesson', () => {
    const want = generatedSource({ lessons: read('lessons'), quizzes: read('quizzes'), glossary: readFileSync(join(ROOT, 'glossary.md'), 'utf8').replace(/\r\n/g, '\n') });
    expect(readFileSync(join(ROOT, 'src', 'generated.ts'), 'utf8').replace(/\r\n/g, '\n')).toBe(want);
  });

  it('has two levels of lessons with unique ids and a self-check for each', () => {
    expect(LEVELS.map((l) => [l.level, l.lessons.length, l.quiz?.questions.length])).toEqual([[1, 8, 8], [2, 7, 6]]);
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
    for (const l of LEVELS) expect(l.lessons.map((x) => x.order)).toEqual(l.lessons.map((_, i) => i + 1));
  });

  it('every lesson shows when its facts were checked and every glossary, quiz and hint link points at a lesson', () => {
    for (const l of LESSONS) expect(l.factsAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const ids = new Set(LESSONS.map((l) => l.id));
    for (const g of GLOSSARY) for (const id of g.lessons) expect(ids.has(id)).toBe(true);
    for (const q of QUIZZES) for (const x of q.questions) for (const id of x.lessons) expect(ids.has(id)).toBe(true);
    for (const h of Object.values(HINTS)) if (h.lesson !== undefined) expect(ids.has(h.lesson)).toBe(true);
  });

  it('has unique glossary terms, each with a meaning', () => {
    const terms = GLOSSARY.map((g) => g.term.toLowerCase());
    expect(new Set(terms).size).toBe(terms.length);
    expect(GLOSSARY.every((g) => g.meaning.length > 3)).toBe(true);
    expect(glossaryFor('order-types').map((g) => g.term)).toContain('Limit order');
    expect(searchGlossary('slippage')[0]?.term).toBe('Slippage');
    expect(searchGlossary('')).toHaveLength(GLOSSARY.length);
  });

  it('has no astrology in any lesson, glossary entry or quiz (decision D42)', () => {
    const all = JSON.stringify([LESSONS, GLOSSARY, QUIZZES]).toLowerCase();
    expect(all).not.toMatch(/astrolog|kundli|dasha|horoscope|nakshatra/);
  });

  it('reads lessons by id and no lesson is marked reviewed until the owner reads it', () => {
    expect(lessonById('order-types')?.title).toBe('Order types');
    expect(lessonById('nope')).toBeNull();
    expect(LESSONS.every((l) => !l.reviewed)).toBe(true);
  });
});

describe('Markdown subset', () => {
  it('reads bold and italic spans', () => {
    expect(spansOf('a **b** and *c*')).toEqual([{ text: 'a ' }, { text: 'b', bold: true }, { text: ' and ' }, { text: 'c', italic: true }]);
    expect(spansOf('5x leverage * 2')).toEqual([{ text: '5x leverage * 2' }]);
  });

  it('reads headings, paragraphs, lists and tables', () => {
    const b = parseBlocks('### Title\n\nOne line\nsecond line\n\n- a\n- b\n\n1. x\n2. y\n\n| H1 | H2 |\n| --- | --- |\n| 1 | **2** |\n');
    expect(b.map((x) => x.t)).toEqual(['h', 'p', 'ul', 'ol', 'table']);
    expect(b[1]).toMatchObject({ spans: [{ text: 'One line second line' }] });
    expect(b[4]).toMatchObject({ head: [[{ text: 'H1' }], [{ text: 'H2' }]], rows: [[[{ text: '1' }], [{ text: '2', bold: true }]]] });
  });

  it('turns every lesson into blocks, with tables where the guides have them', () => {
    expect(lessonById('costs-of-trading')?.blocks.some((b) => b.t === 'table')).toBe(true);
    expect(LESSONS.every((l) => l.blocks.length > 2)).toBe(true);
  });
});

describe('parsers refuse broken files', () => {
  const head = (extra = ''): string => `---\nid: x\ntitle: T\nlevel: 1\norder: 1\nsource: s\nfacts_as_of: 2026-01-01\nreviewed: false\n${extra}---\nbody\n`;
  it('lessons', () => {
    expect(parseLesson(head(), 'x.md').id).toBe('x');
    expect(() => parseLesson('no header', 'x.md')).toThrow(/front matter/);
    expect(() => parseLesson(head().replace('2026-01-01', 'soon'), 'x.md')).toThrow(/facts_as_of/);
    expect(() => parseLesson(head().replace('reviewed: false', 'reviewed: maybe'), 'x.md')).toThrow(/reviewed/);
    expect(() => parseLesson(head().replace('id: x', 'id: Bad Id'), 'x.md')).toThrow(/bad id/);
    expect(() => parseLesson(head().replace('body', ''), 'x.md')).toThrow(/empty/);
  });
  it('glossary and quizzes', () => {
    expect(() => parseGlossary('| A | only two |')).toThrow(/bad row/);
    expect(parseGlossary('| Term | M | L |\n| --- | --- | --- |\n| A | meaning | l1, l2 |')).toEqual([{ term: 'A', meaning: 'meaning', lessons: ['l1', 'l2'] }]);
    expect(() => parseQuiz('---\nid: q\ntitle: T\nlevel: 1\n---\n## Q1 | lessons: a\nno answer\n', 'q.md')).toThrow(/form/);
  });
});

describe('learning path and progress', () => {
  const first = LESSONS[0]?.id ?? '';
  it('starts at the first lesson and moves on as lessons are marked done', () => {
    expect(nextStep(EMPTY_PROGRESS, PATH)).toEqual({ kind: 'lesson', id: first });
    const p = markLesson(EMPTY_PROGRESS, first, true, 5);
    expect(nextStep(p, PATH)).toEqual({ kind: 'lesson', id: LESSONS[1]?.id });
    expect(nextStep(markLesson(p, first, false, 6), PATH)).toEqual({ kind: 'lesson', id: first });
  });

  it('asks for the self-check after the last lesson of a level, then goes to the next level', () => {
    const ids = L1.lessons.map((l) => l.id);
    const questions = (L1.quiz as Quiz).questions.map((x) => x.id);
    let p = EMPTY_PROGRESS;
    for (const id of ids) p = markLesson(p, id, true, 1);
    expect(nextStep(p, PATH)).toEqual({ kind: 'quiz', id: 'level-1' });
    expect(levelStatus(p, ids, 'level-1')).toMatchObject({ complete: false, quizDone: false, lessonsDone: 8 });
    p = recordQuiz(p, 'level-1', questions, { [questions[0] as string]: true }, 9);
    expect(p.quizzes['level-1']).toMatchObject({ right: 1, total: 8, at: 9 });
    expect(levelStatus(p, ids, 'level-1').complete).toBe(true);
    expect(nextStep(p, PATH)).toEqual({ kind: 'lesson', id: (L2.lessons[0] as Lesson).id });
  });

  it('says done when everything is finished', () => {
    let p = EMPTY_PROGRESS;
    for (const l of LEVELS) {
      for (const x of l.lessons) p = markLesson(p, x.id, true, 1);
      p = recordQuiz(p, l.quiz?.id ?? '', l.quiz?.questions.map((x) => x.id) ?? [], {}, 2);
    }
    expect(nextStep(p, PATH)).toEqual({ kind: 'done' });
  });
});
