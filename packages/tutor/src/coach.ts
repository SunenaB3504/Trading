import { lessonById } from '@trading/content';
import { FEATURE_LABELS } from './types';
import type { FallbackReason, Feature, TutorContext } from './types';

/** What the live tutor would add for each feature, said under a coach answer (SSD v4.1 §7.1). */
const ADDS: Readonly<Record<Feature, string>> = {
  learning_guide: 'a plan for what to learn next, from your own progress',
  ask_screen: 'an answer to your own question about this screen',
  pre_trade: 'questions about your reason, exit and size for this order',
  trade_review: 'a review of how this trade went, using your journal',
  weekly_review: 'a look at the patterns in your week',
  quiz_feedback: 'the idea behind the answer, explained another way',
  scenario_debrief: 'a debrief of what you did and what followed',
};

export const REASON_TEXT: Readonly<Record<FallbackReason, string>> = {
  mode_off: 'The AI is off.',
  feature_off: 'This AI feature is switched off.',
  no_key: 'No API key is saved, or the key was refused.',
  limit_reached: 'The monthly AI limit is reached.',
  provider_error: 'The AI could not be reached.',
  refused: 'The AI declined to answer.',
  verifier_failed: 'The AI answer failed the safety check, so it is not shown.',
  tip_request: 'Questions about what to buy or sell are not answered.',
};

/**
 * The built-in coach answer: fixed text from the context. It names the lesson to read, lists any flags in the
 * material, and says what the AI would add. It needs no network and costs nothing.
 */
export function coachAnswer(ctx: TutorContext, reason: FallbackReason | null): string {
  const lessons = ctx.lessonIds.map((id) => lessonById(id)?.title).filter((t): t is string => t !== undefined);
  const lines = [
    lessons.length > 0 ? `Read next in Learn: ${lessons.join('; ')}.` : 'Open Learn to read the lesson that matches this.',
    `With the AI on, ${FEATURE_LABELS[ctx.feature]} would add ${ADDS[ctx.feature]}.`,
  ];
  if (reason !== null) lines.unshift(REASON_TEXT[reason]);
  return lines.join('\n');
}
