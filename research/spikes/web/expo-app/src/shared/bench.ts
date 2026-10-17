export interface BenchResult {
  seconds: number;
  frames: number;
  meanMs: number;
  p95Ms: number;
  maxMs: number;
  /** Share of frames that took longer than 20 ms (a missed 60 fps frame). */
  slowPct: number;
}

/** Scrolls an element from top to bottom over `durationMs`, one step per animation frame. */
export function scrollBench(el: HTMLElement, durationMs = 4000): Promise<BenchResult> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    const max = Math.max(0, el.scrollHeight - el.clientHeight);
    let start = 0;
    let last = 0;
    const step = (now: number): void => {
      if (start === 0) {
        start = now;
        last = now;
      } else {
        deltas.push(now - last);
        last = now;
      }
      const progress = Math.min(1, (now - start) / durationMs);
      el.scrollTop = progress * max;
      if (progress < 1) requestAnimationFrame(step);
      else resolve(summarise(deltas, durationMs / 1000));
    };
    requestAnimationFrame(step);
  });
}

function summarise(deltas: number[], seconds: number): BenchResult {
  const sorted = [...deltas].sort((a, b) => a - b);
  const at = (q: number): number => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] ?? 0;
  const mean = deltas.reduce((a, b) => a + b, 0) / Math.max(1, deltas.length);
  return {
    seconds,
    frames: deltas.length,
    meanMs: Math.round(mean * 10) / 10,
    p95Ms: Math.round(at(0.95) * 10) / 10,
    maxMs: Math.round((sorted[sorted.length - 1] ?? 0) * 10) / 10,
    slowPct: Math.round((deltas.filter((d) => d > 20).length / Math.max(1, deltas.length)) * 1000) / 10,
  };
}
