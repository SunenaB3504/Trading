/**
 * An evaluation panel (SSD §11.3): for each of `instruments` and each of `dates` start sessions, the
 * forward H-day return and whether the rule's signal was on at that start. H-day windows from
 * adjacent dates overlap, which is why the tests below work on dates, not on individual rows.
 */
export interface Panel {
  instruments: number;
  /** Number of start dates with a defined forward return. */
  dates: number;
  /** Holding horizon H in sessions. */
  horizon: number;
  /** Forward returns, index `i * dates + t`. */
  ret: Float64Array;
  /** 1 when the signal is on, same indexing. */
  on: Uint8Array;
}

export function makePanel(instruments: number, dates: number, horizon: number): Panel {
  return {
    instruments,
    dates,
    horizon,
    ret: new Float64Array(instruments * dates),
    on: new Uint8Array(instruments * dates),
  };
}

/**
 * Observations that may enter the comparison (§11.3 step 3): every signal-on row, and every
 * signal-off row whose H-day window does not overlap any signal-on window of the same instrument.
 */
export function embargoMask(p: Panel): Uint8Array {
  const use = new Uint8Array(p.on.length);
  const h = p.horizon;
  for (let i = 0; i < p.instruments; i += 1) {
    const base = i * p.dates;
    const blocked = new Int32Array(p.dates + 1);
    for (let t = 0; t < p.dates; t += 1) {
      if (p.on[base + t] === 1) {
        const from = Math.max(0, t - h + 1);
        blocked[from] = (blocked[from] as number) + 1;
        const to = Math.min(p.dates, t + h);
        blocked[to] = (blocked[to] as number) - 1;
      }
    }
    let open = 0;
    for (let t = 0; t < p.dates; t += 1) {
      open += blocked[t] as number;
      use[base + t] = p.on[base + t] === 1 || open === 0 ? 1 : 0;
    }
  }
  return use;
}

/** Per-date sums and counts of signal-on and signal-off returns. */
export interface DateAggregates {
  sumOn: Float64Array;
  cntOn: Float64Array;
  sumOff: Float64Array;
  cntOff: Float64Array;
}

export function aggregateByDate(p: Panel, use: Uint8Array, on: Uint8Array = p.on): DateAggregates {
  const a: DateAggregates = {
    sumOn: new Float64Array(p.dates),
    cntOn: new Float64Array(p.dates),
    sumOff: new Float64Array(p.dates),
    cntOff: new Float64Array(p.dates),
  };
  for (let i = 0; i < p.instruments; i += 1) {
    for (let t = 0; t < p.dates; t += 1) {
      const k = i * p.dates + t;
      if (use[k] === 0) continue;
      if (on[k] === 1) {
        a.sumOn[t] = (a.sumOn[t] as number) + (p.ret[k] as number);
        a.cntOn[t] = (a.cntOn[t] as number) + 1;
      } else {
        a.sumOff[t] = (a.sumOff[t] as number) + (p.ret[k] as number);
        a.cntOff[t] = (a.cntOff[t] as number) + 1;
      }
    }
  }
  return a;
}

/** Signal-on mean minus signal-off mean over the given dates; null if either side is empty. */
export function pooledDifference(a: DateAggregates, dates: Iterable<number>): number | null {
  let sOn = 0,
    cOn = 0,
    sOff = 0,
    cOff = 0;
  for (const t of dates) {
    sOn += a.sumOn[t] as number;
    cOn += a.cntOn[t] as number;
    sOff += a.sumOff[t] as number;
    cOff += a.cntOff[t] as number;
  }
  return cOn === 0 || cOff === 0 ? null : sOn / cOn - sOff / cOff;
}

/** For each date with both sides present: mean(on) - mean(off). The date is the unit of analysis. */
export function dateDifferences(a: DateAggregates, dates: Iterable<number>): number[] {
  const out: number[] = [];
  for (const t of dates) {
    const n1 = a.cntOn[t] as number;
    const n0 = a.cntOff[t] as number;
    if (n1 > 0 && n0 > 0) out.push((a.sumOn[t] as number) / n1 - (a.sumOff[t] as number) / n0);
  }
  return out;
}
