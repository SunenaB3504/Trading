import { dayNumber } from '../calendar';

/**
 * Portfolio Builder (SSD v4.1 §5.7): mix shares, funds, bonds and cash, and see what the mix would have done over a
 * past period: total and yearly return, the worst fall, how long it took to recover, and what rebalancing changed.
 * A learning tool on past prices, not a forecast. Analytics only, so plain numbers are used, not integer paise.
 */
export interface PricePoint {
  date: string;
  /** A price or NAV adjusted for splits, bonuses and dividends, so that its ratio between dates is the return. */
  value: number;
}

export interface Allocation {
  id: string;
  weightPct: number;
}

export type Rebalance = 'none' | 'yearly' | 'quarterly';

export interface BuilderInput {
  allocations: readonly Allocation[];
  /** Price history by allocation id. Cash and bonds are made with `accrualSeries`. */
  series: Readonly<Record<string, readonly PricePoint[]>>;
  start: string;
  end: string;
  rebalance: Rebalance;
}

export interface BuilderResult {
  /** Dates actually used: the first is the start day and the last the end day, both with prices. */
  from: string;
  to: string;
  /** Portfolio value per date, starting at 1. */
  curve: PricePoint[];
  totalReturnBps: number;
  /** Compound yearly return in hundredths of a percent. */
  yearlyReturnBps: number;
  /** The biggest fall from a high to a later low, as a negative number in hundredths of a percent. */
  worstFallBps: number;
  peakDate: string;
  troughDate: string;
  /** Calendar days from the low until the old high was regained, or null if it was not regained by the end. */
  recoveryDays: number | null;
}

export interface BuilderComparison {
  chosen: BuilderResult;
  /** The same mix never rebalanced. */
  withoutRebalancing: BuilderResult;
  /** Chosen minus never-rebalanced total return, in hundredths of a percent. */
  rebalancingEffectBps: number;
}

export class BuilderError extends Error {}

/** A made-up series that grows at a fixed yearly rate, for cash (a savings rate) and bonds (a yield). Not real prices. */
export function accrualSeries(dates: readonly string[], yearlyPct: number): PricePoint[] {
  const first = dates[0];
  if (first === undefined) return [];
  const d0 = dayNumber(first);
  return dates.map((date) => ({ date, value: (1 + yearlyPct / 100) ** ((dayNumber(date) - d0) / 365) }));
}

const sum = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0);

function validate(i: BuilderInput): void {
  if (i.allocations.length === 0) throw new BuilderError('Choose at least one holding.');
  if (i.allocations.some((a) => !(a.weightPct > 0))) throw new BuilderError('Every holding needs a weight above zero.');
  if (Math.abs(sum(i.allocations.map((a) => a.weightPct)) - 100) > 1e-9) throw new BuilderError('The weights must add up to 100.');
  if (new Set(i.allocations.map((a) => a.id)).size !== i.allocations.length) throw new BuilderError('A holding is listed twice.');
  if (i.end <= i.start) throw new BuilderError('The end date must be after the start date.');
}

/** Each asset's value on each date, carrying the last price over days it did not trade. Null before its first price. */
function aligned(i: BuilderInput, dates: readonly string[]): Map<string, Array<number | null>> {
  const out = new Map<string, Array<number | null>>();
  for (const a of i.allocations) {
    const pts = i.series[a.id] ?? [];
    let k = 0;
    let last: number | null = null;
    out.set(
      a.id,
      dates.map((d) => {
        while (k < pts.length && (pts[k] as PricePoint).date <= d) last = (pts[k++] as PricePoint).value;
        return last;
      }),
    );
  }
  return out;
}

const rebalanceKey = (date: string, mode: Rebalance): string => (mode === 'yearly' ? date.slice(0, 4) : `${date.slice(0, 4)}q${String(Math.floor((Number(date.slice(5, 7)) - 1) / 3))}`);

function simulate(i: BuilderInput, mode: Rebalance): { curve: PricePoint[] } {
  const dates = [...new Set(i.allocations.flatMap((a) => (i.series[a.id] ?? []).map((p) => p.date)))].filter((d) => d >= i.start && d <= i.end).sort();
  const first = dates[0];
  if (first === undefined) throw new BuilderError('There are no prices in that period.');
  const vals = aligned(i, dates);
  for (const a of i.allocations) {
    if (vals.get(a.id)?.[0] == null) throw new BuilderError(`${a.id} has no price on ${first}; start later or leave it out.`);
  }
  const price = (id: string, t: number): number => vals.get(id)?.[t] ?? 0;
  let units = new Map(i.allocations.map((a) => [a.id, a.weightPct / 100 / price(a.id, 0)]));
  let held = first;
  const curve: PricePoint[] = [];
  dates.forEach((date, t) => {
    let value = sum(i.allocations.map((a) => (units.get(a.id) ?? 0) * price(a.id, t)));
    if (mode !== 'none' && t > 0 && rebalanceKey(date, mode) !== rebalanceKey(held, mode)) {
      units = new Map(i.allocations.map((a) => [a.id, (value * a.weightPct) / 100 / price(a.id, t)]));
      held = date;
      value = sum(i.allocations.map((a) => (units.get(a.id) ?? 0) * price(a.id, t)));
    }
    curve.push({ date, value });
  });
  return { curve };
}

function measure(curve: readonly PricePoint[]): BuilderResult {
  const first = curve[0] as PricePoint;
  const last = curve[curve.length - 1] as PricePoint;
  let peak = first;
  let worst = 0;
  let worstPeak = first;
  let trough = first;
  for (const p of curve) {
    if (p.value > peak.value) peak = p;
    const fall = p.value / peak.value - 1;
    if (fall < worst) {
      worst = fall;
      worstPeak = peak;
      trough = p;
    }
  }
  const regained = worst < 0 ? curve.find((p) => p.date > trough.date && p.value >= worstPeak.value) : undefined;
  const years = Math.max((dayNumber(last.date) - dayNumber(first.date)) / 365.25, 1 / 365.25);
  return {
    from: first.date,
    to: last.date,
    curve: [...curve],
    totalReturnBps: Math.round((last.value / first.value - 1) * 10_000),
    yearlyReturnBps: Math.round(((last.value / first.value) ** (1 / years) - 1) * 10_000),
    worstFallBps: Math.round(worst * 10_000),
    peakDate: worstPeak.date,
    troughDate: trough.date,
    recoveryDays: worst < 0 && regained !== undefined ? dayNumber(regained.date) - dayNumber(trough.date) : worst < 0 ? null : 0,
  };
}

/** Runs the mix as chosen and never rebalanced, so the effect of rebalancing can be shown. Pure. */
export function buildPortfolio(i: BuilderInput): BuilderComparison {
  validate(i);
  const chosen = measure(simulate(i, i.rebalance).curve);
  const without = i.rebalance === 'none' ? chosen : measure(simulate(i, 'none').curve);
  return { chosen, withoutRebalancing: without, rebalancingEffectBps: chosen.totalReturnBps - without.totalReturnBps };
}
