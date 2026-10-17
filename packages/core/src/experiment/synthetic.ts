import type { Rng } from '../random';
import { makePanel } from './panel';
import type { Panel } from './panel';

export interface SyntheticOptions {
  instruments: number;
  /** Start dates with a defined forward return. */
  dates: number;
  horizon: number;
  /** Daily idiosyncratic volatility, as a fraction (0.01 = 1%). */
  dailyVol: number;
  /** Daily volatility of the common market factor. */
  marketVol: number;
  /** Chance per date, while the signal is off, that an episode begins. */
  startProbability: number;
  /** Sessions each signal episode lasts. */
  episodeLength: number;
}

function normal(rng: Rng): number {
  const u1 = 1 - rng.nextFloat();
  const u2 = rng.nextFloat();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function dailyReturns(o: SyntheticOptions, rng: Rng): Float64Array[] {
  const days = o.dates + o.horizon - 1;
  const market = Array.from({ length: days }, () => normal(rng) * o.marketVol);
  return Array.from({ length: o.instruments }, () => {
    const r = new Float64Array(days);
    for (let t = 0; t < days; t += 1) r[t] = (market[t] as number) + normal(rng) * o.dailyVol;
    return r;
  });
}

/** Signal episodes with a fixed run length, started at random while the signal is off. */
function fillSignal(p: Panel, i: number, o: SyntheticOptions, rng: Rng): void {
  let left = 0;
  for (let t = 0; t < p.dates; t += 1) {
    if (left === 0 && rng.nextFloat() < o.startProbability) left = o.episodeLength;
    if (left > 0) {
      p.on[i * p.dates + t] = 1;
      left -= 1;
    }
  }
}

/**
 * A synthetic panel with NO relationship between signal and returns, built from overlapping
 * H-day sums of daily returns (so the rows are autocorrelated like real forward returns) and a
 * common market factor (so instruments are cross-sectionally correlated). Used for the null
 * control; add an effect with `plantEffect` for the positive control.
 */
export function syntheticPanel(o: SyntheticOptions, rng: Rng): Panel {
  const p = makePanel(o.instruments, o.dates, o.horizon);
  const daily = dailyReturns(o, rng.fork('returns'));
  const signalRng = rng.fork('signal');
  for (let i = 0; i < o.instruments; i += 1) {
    const r = daily[i] as Float64Array;
    for (let t = 0; t < o.dates; t += 1) {
      let sum = 0;
      for (let k = 0; k < o.horizon; k += 1) sum += r[t + k] as number;
      p.ret[i * o.dates + t] = sum;
    }
    fillSignal(p, i, o, signalRng.fork(`i${String(i)}`));
  }
  return p;
}
