export interface MultiplicityResult {
  adjusted: number[];
  rejected: boolean[];
}

function stepUp(pvalues: readonly number[], q: number, scale: number): MultiplicityResult {
  const m = pvalues.length;
  const order = pvalues.map((p, i) => ({ p, i })).sort((a, b) => a.p - b.p || a.i - b.i);
  const adjusted = new Array<number>(m).fill(1);
  let running = 1;
  for (let rank = m; rank >= 1; rank -= 1) {
    const item = order[rank - 1] as { p: number; i: number };
    running = Math.min(running, (item.p * m * scale) / rank);
    adjusted[item.i] = Math.min(1, running);
  }
  return { adjusted, rejected: adjusted.map((a) => a <= q) };
}

/** Benjamini-Hochberg false-discovery-rate control at level `q` (§11.3 step 7). */
export function benjaminiHochberg(pvalues: readonly number[], q = 0.05): MultiplicityResult {
  return stepUp(pvalues, q, 1);
}

/** Benjamini-Yekutieli: valid under any dependence, at the cost of a factor sum(1/j). */
export function benjaminiYekutieli(pvalues: readonly number[], q = 0.05): MultiplicityResult {
  let c = 0;
  for (let j = 1; j <= pvalues.length; j += 1) c += 1 / j;
  return stepUp(pvalues, q, c);
}
