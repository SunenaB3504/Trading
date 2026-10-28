import { GLOSSARY_FILE, LESSON_FILES, QUIZ_FILES } from './generated';
import { parseGlossary, parseLesson, parseQuiz } from './parse';
import type { GlossaryEntry, Lesson, Quiz } from './parse';

export type { Block, Span } from './markdown';
export { plainText } from './markdown';
export type { GlossaryEntry, Lesson, Quiz, QuizQuestion } from './parse';
export { parseBlocks } from './markdown';
export { EMPTY_PROGRESS, levelStatus, markLesson, nextStep, recordQuiz } from './progress';
export type { LevelStatus, NextStep, Progress, QuizResult } from './progress';
export { HINTS, hintFor } from './hints';
export type { Hint } from './hints';

export const LESSONS: readonly Lesson[] = Object.entries(LESSON_FILES)
  .map(([name, text]) => parseLesson(text, name))
  .sort((a, b) => a.level - b.level || a.order - b.order);

export const QUIZZES: readonly Quiz[] = Object.entries(QUIZ_FILES)
  .map(([name, text]) => parseQuiz(text, name))
  .sort((a, b) => a.level - b.level);

export const GLOSSARY: readonly GlossaryEntry[] = parseGlossary(GLOSSARY_FILE).sort((a, b) =>
  a.term.toLowerCase() < b.term.toLowerCase() ? -1 : 1,
);

export const LEVEL_TITLES: Readonly<Record<number, string>> = {
  1: 'Level 1: Foundations',
  2: 'Level 2: Trading, costs and habits',
  3: 'Level 3: Charts and rules',
  4: 'Level 4: Futures and options',
};

export interface Level {
  level: number;
  title: string;
  lessons: Lesson[];
  quiz: Quiz | null;
}

export const LEVELS: readonly Level[] = [...new Set(LESSONS.map((l) => l.level))].map((level) => ({
  level,
  title: LEVEL_TITLES[level] ?? `Level ${String(level)}`,
  lessons: LESSONS.filter((l) => l.level === level),
  quiz: QUIZZES.find((q) => q.level === level) ?? null,
}));

export const lessonById = (id: string): Lesson | null => LESSONS.find((l) => l.id === id) ?? null;

/** The glossary entries a lesson explains. */
export const glossaryFor = (lessonId: string): GlossaryEntry[] => GLOSSARY.filter((g) => g.lessons.includes(lessonId));

/** Entries whose term or meaning contains the text, ignoring case; all of them for an empty search. */
export function searchGlossary(query: string): GlossaryEntry[] {
  const q = query.trim().toLowerCase();
  return q === '' ? [...GLOSSARY] : GLOSSARY.filter((g) => g.term.toLowerCase().includes(q) || g.meaning.toLowerCase().includes(q));
}

/** The levels in the shape `nextStep` takes. */
export const PATH = LEVELS.map((l) => ({ lessons: l.lessons.map((x) => x.id), quiz: l.quiz?.id ?? null }));
export { SAMPLES } from './samples';
export { SCENARIOS, scenarioById } from './scenarios';
export type { Checkpoint, Scenario, ScenarioGoal } from './scenarios';
export { FNO_SCENARIOS, fnoScenarioById } from './fnoScenarios';
export type { FnoGoal, FnoScenario } from './fnoScenarios';
