import { LESSONS, PATH, QUIZZES, nextStep } from '@trading/content';
import { learningGuide } from '@trading/tutor';
import type { TutorContext } from '@trading/tutor';
import { loadProgress } from '../learn/progressStore';
import type { KeyValueStore } from '../store/kv';

/** The learning guide's context, from what this profile has done in Learn so far. */
export async function guideContext(kv: KeyValueStore): Promise<TutorContext> {
  const p = await loadProgress(kv);
  const step = nextStep(p, PATH);
  return learningGuide({
    done: LESSONS.filter((l) => p.lessons[l.id] !== undefined).length,
    total: LESSONS.length,
    nextLessonId: step.kind === 'lesson' ? step.id : null,
    quizzes: QUIZZES.flatMap((q) => {
      const r = p.quizzes[q.id];
      return r === undefined ? [] : [{ title: q.title, right: r.right, total: r.total }];
    }),
  });
}
