/**
 * What a locked user sees where the paid layer would be: a general description and nothing derived from
 * any astro output, so no count, score, amount or name (FR-P10, D34). Wording stays free of prices and
 * store text until the legal review (D32).
 */
export const LOCKED_TITLE = 'Astrological analysis layer';
export const LOCKED_TEXT = 'This optional layer is not unlocked on this device.';

export function lockedNotice(): { title: string; text: string } {
  return { title: LOCKED_TITLE, text: LOCKED_TEXT };
}
