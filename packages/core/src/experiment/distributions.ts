/** Log-gamma by the Lanczos approximation (g = 7, n = 9); accurate to about 1e-14. */
const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
  -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
  1.5056327351493116e-7,
];

export function logGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  const z = x - 1;
  let sum = LANCZOS[0] as number;
  for (let i = 1; i < 9; i += 1) sum += (LANCZOS[i] as number) / (z + i);
  const t = z + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(sum);
}

/** Continued fraction for the incomplete beta function (modified Lentz). */
function betaContinuedFraction(x: number, a: number, b: number): number {
  const tiny = 1e-300;
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  d = 1 / (Math.abs(d) < tiny ? tiny : d);
  let h = d;
  for (let m = 1; m <= 300; m += 1) {
    const m2 = 2 * m;
    const even = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + even * d;
    c = 1 + even / c;
    d = 1 / (Math.abs(d) < tiny ? tiny : d);
    h *= d * (Math.abs(c) < tiny ? tiny : c);
    const odd = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + odd * d;
    c = 1 + odd / c;
    d = 1 / (Math.abs(d) < tiny ? tiny : d);
    const delta = d * (Math.abs(c) < tiny ? tiny : c);
    h *= delta;
    if (Math.abs(delta - 1) < 1e-15) break;
  }
  return h;
}

/** Regularised incomplete beta function I_x(a, b). */
export function regIncBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) return (front * betaContinuedFraction(x, a, b)) / a;
  return 1 - (front * betaContinuedFraction(1 - x, b, a)) / b;
}

/** Two-sided p-value of Student's t statistic with `df` degrees of freedom. */
export function studentTTwoSidedP(t: number, df: number): number {
  if (!Number.isFinite(t)) return 0;
  return regIncBeta(df / (df + t * t), df / 2, 0.5);
}
