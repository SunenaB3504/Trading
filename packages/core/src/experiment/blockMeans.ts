import { studentTTwoSidedP } from './distributions';
import type { DateAggregates } from './panel';

export interface BlockMeansResult {
  /** Signal-on mean minus signal-off mean over the dates used. */
  difference: number;
  se: number;
  t: number;
  /** Two-sided p from Student's t with (blocks - 1) degrees of freedom. */
  p: number;
  blocks: number;
}

/**
 * Batch-means test of the on-minus-off difference. The dates are cut into contiguous blocks, each
 * block's influence on the difference is computed by linearising the two ratios, and the spread of
 * those influences gives the standard error. With blocks longer than the dependence (at least 2H)
 * it is correctly sized where the plain date-block bootstrap p-value is not.
 */
export function blockMeansTest(a: DateAggregates, blockLength: number): BlockMeansResult | null {
  const blocks = Math.floor(a.cntOn.length / blockLength);
  if (blocks < 3) return null;
  const used = blocks * blockLength;
  let sOn = 0,
    cOn = 0,
    sOff = 0,
    cOff = 0;
  for (let t = 0; t < used; t += 1) {
    sOn += a.sumOn[t] as number;
    cOn += a.cntOn[t] as number;
    sOff += a.sumOff[t] as number;
    cOff += a.cntOff[t] as number;
  }
  if (cOn === 0 || cOff === 0) return null;
  const muOn = sOn / cOn;
  const muOff = sOff / cOff;
  let ss = 0;
  for (let b = 0; b < blocks; b += 1) {
    let bsOn = 0,
      bcOn = 0,
      bsOff = 0,
      bcOff = 0;
    for (let t = b * blockLength; t < (b + 1) * blockLength; t += 1) {
      bsOn += a.sumOn[t] as number;
      bcOn += a.cntOn[t] as number;
      bsOff += a.sumOff[t] as number;
      bcOff += a.cntOff[t] as number;
    }
    const u = (bsOn - muOn * bcOn) / cOn - (bsOff - muOff * bcOff) / cOff;
    ss += u * u;
  }
  const se = Math.sqrt((ss * blocks) / (blocks - 1));
  const difference = muOn - muOff;
  const t = se === 0 ? 0 : difference / se;
  return { difference, se, t, p: se === 0 ? 1 : studentTTwoSidedP(t, blocks - 1), blocks };
}
