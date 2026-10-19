import type { Rng } from '../random';

/**
 * Synthetic-buyer placebo (FR-S6, SSD §11.3 step 5, T23 limit). A buyer-company score is only evidence if it
 * beats the same score computed for random birth data: one real buyer is a single draw and can be lucky.
 * This module is astro-blind: it makes the random birth data and counts; the caller supplies the scorer.
 */

export interface BirthDraw {
  /** YYYY-MM-DD. */
  date: string;
  /** HH:MM local clock. */
  time: string;
  /** Index into the list of places the caller supplied. */
  placeIndex: number;
}

export interface BirthRange {
  /** First and last birth year (inclusive) of the draws. */
  fromYear: number;
  toYear: number;
  places: number;
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** One random real calendar date, time and place index. Day is limited to 1..28 so every month is valid. */
export function drawBirth(rng: Rng, range: BirthRange): BirthDraw {
  const year = range.fromYear + rng.nextInt(range.toYear - range.fromYear + 1);
  return {
    date: `${String(year)}-${pad(1 + rng.nextInt(12))}-${pad(1 + rng.nextInt(28))}`,
    time: `${pad(rng.nextInt(24))}:${pad(rng.nextInt(60))}`,
    placeIndex: rng.nextInt(range.places),
  };
}

export interface SyntheticBuyerResult {
  observed: number;
  draws: number;
  /** Two-sided: (1 + #{|score| >= |observed|}) / (1 + draws). */
  p: number;
  /** The scores of the synthetic buyers, in draw order, for the report. */
  scores: number[];
}

/**
 * Builds the null from `draws` random births scored by the same function as the real buyer.
 * The draws come from a stream forked off the run seed, so the same seed gives the same null.
 */
export function syntheticBuyerNull(
  score: (birth: BirthDraw) => number,
  observed: number,
  rng: Rng,
  range: BirthRange,
  draws: number,
): SyntheticBuyerResult {
  const stream = rng.fork('synthetic-buyers');
  const scores = Array.from({ length: draws }, () => score(drawBirth(stream, range)));
  const atLeast = scores.filter((s) => Math.abs(s) >= Math.abs(observed)).length;
  return { observed, draws, p: (1 + atLeast) / (1 + draws), scores };
}
