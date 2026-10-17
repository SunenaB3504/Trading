/**
 * Spaces requests at least `minIntervalMs` apart (FR-D5). Time and sleeping are injected so tests
 * run on simulated time. Calls are reserved in order, so concurrent callers queue fairly.
 */
export class RateLimiter {
  private next = 0;

  constructor(
    private readonly minIntervalMs: number,
    private readonly now: () => number,
    private readonly sleep: (ms: number) => Promise<void>,
  ) {}

  async wait(): Promise<void> {
    const t = this.now();
    const start = Math.max(t, this.next);
    this.next = start + this.minIntervalMs;
    if (start > t) await this.sleep(start - t);
  }
}
