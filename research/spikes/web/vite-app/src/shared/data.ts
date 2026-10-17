export interface Row {
  id: number;
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  pnl: number;
}

export interface Bundle {
  rows: Row[];
  series: number[];
}

/** Deterministic pseudo-random generator so every run and every shell sees the same data. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function makeBundle(rowCount = 5000, points = 2500): Bundle {
  const rnd = lcg(42);
  const rows: Row[] = [];
  let close = 1000;
  for (let i = 0; i < rowCount; i += 1) {
    close = Math.max(50, close * (1 + (rnd() - 0.5) * 0.04));
    const open = close * (1 + (rnd() - 0.5) * 0.01);
    rows.push({
      id: i,
      symbol: `SYM${String(i % 100).padStart(3, '0')}`,
      date: `2024-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 27) + 1).padStart(2, '0')}`,
      open: Math.round(open * 100),
      high: Math.round(Math.max(open, close) * 1.01 * 100),
      low: Math.round(Math.min(open, close) * 0.99 * 100),
      close: Math.round(close * 100),
      volume: Math.floor(rnd() * 1_000_000),
      pnl: Math.round((rnd() - 0.45) * 500_000),
    });
  }
  const series: number[] = [];
  let v = 100;
  for (let i = 0; i < points; i += 1) {
    v *= 1 + (rnd() - 0.5) * 0.02;
    series.push(v);
  }
  return { rows, series };
}

export const fmtPaise = (p: number): string => (p / 100).toFixed(2);
