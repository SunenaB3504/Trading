export type Verdict =
  'Supported' | 'Not supported (adequately powered)' | 'Inconclusive (underpowered)' | 'No verdict';

export interface VerdictInput {
  /** Non-overlapping dates with both signal-on and signal-off rows. */
  nonOverlapN: number;
  passesNonOverlap: boolean;
  passesBootstrap: boolean;
  passesPlacebo: boolean;
  passesMultiplicity: boolean;
  /** Whether the rule beats its calendar-matched control; null where B3 does not apply. */
  beatsCalendarControl: boolean | null;
  /** Minimum detectable effect from the positive control, or null if not run. */
  mde: number | null;
  /** Effect size the hypothesis claimed when it was registered, or null if it never did. */
  claimedEffect: number | null;
  positiveControlOk: boolean;
}

function passedAllTests(v: VerdictInput): boolean {
  const tests = [v.passesNonOverlap, v.passesBootstrap, v.passesPlacebo, v.passesMultiplicity];
  return tests.every(Boolean) && v.beatsCalendarControl !== false;
}

/**
 * §11.3 step 8. "Spurious" is never used. A rule can be called not supported only when the test was
 * strong enough to have found the effect it claimed (MDE at or below the claim).
 */
export function verdictOf(v: VerdictInput): Verdict {
  if (v.nonOverlapN < 10 || !v.positiveControlOk || v.claimedEffect === null) return 'No verdict';
  if (passedAllTests(v)) return 'Supported';
  if (v.mde !== null && v.mde <= v.claimedEffect) return 'Not supported (adequately powered)';
  return 'Inconclusive (underpowered)';
}
