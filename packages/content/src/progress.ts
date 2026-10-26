/** What one person has done in Learn: lessons marked done and self-check results. Plain data, saved per profile. */
export interface QuizResult {
  right: number;
  total: number;
  at: number;
  /** Per question: whether the person marked their own answer right. */
  marks: Record<string, boolean>;
}

export interface Progress {
  lessons: Record<string, number>;
  quizzes: Record<string, QuizResult>;
}

export const EMPTY_PROGRESS: Progress = { lessons: {}, quizzes: {} };

export function markLesson(p: Progress, id: string, done: boolean, at: number): Progress {
  const lessons = { ...p.lessons };
  if (done) lessons[id] = at;
  else delete lessons[id];
  return { ...p, lessons };
}

export function recordQuiz(p: Progress, quizId: string, questionIds: readonly string[], marks: Record<string, boolean>, at: number): Progress {
  const mine = Object.fromEntries(questionIds.map((q) => [q, marks[q] === true]));
  const right = questionIds.filter((q) => mine[q] === true).length;
  return { ...p, quizzes: { ...p.quizzes, [quizId]: { right, total: questionIds.length, at, marks: mine } } };
}

export interface LevelStatus {
  lessonsDone: number;
  lessonsTotal: number;
  quizDone: boolean;
  complete: boolean;
}

export function levelStatus(p: Progress, lessonIds: readonly string[], quizId: string | null): LevelStatus {
  const lessonsDone = lessonIds.filter((id) => p.lessons[id] !== undefined).length;
  const quizDone = quizId === null || p.quizzes[quizId] !== undefined;
  return { lessonsDone, lessonsTotal: lessonIds.length, quizDone, complete: lessonsDone === lessonIds.length && quizDone };
}

export type NextStep = { kind: 'lesson'; id: string } | { kind: 'quiz'; id: string } | { kind: 'done' };

/** What to do next: the first lesson not yet done, in order, else the self-check of that level, level by level. */
export function nextStep(p: Progress, levels: ReadonlyArray<{ lessons: readonly string[]; quiz: string | null }>): NextStep {
  for (const l of levels) {
    const lesson = l.lessons.find((id) => p.lessons[id] === undefined);
    if (lesson !== undefined) return { kind: 'lesson', id: lesson };
    if (l.quiz !== null && p.quizzes[l.quiz] === undefined) return { kind: 'quiz', id: l.quiz };
  }
  return { kind: 'done' };
}
