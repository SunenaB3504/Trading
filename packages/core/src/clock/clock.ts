import { utcMillisSchema } from '../domain/primitives';
import type { UtcMillis } from '../domain/primitives';

/**
 * The only way core code learns the time (RB R6). Replay uses a simulated clock; live-paper
 * mode injects a wall-clock implementation from an adapter package, never from core.
 */
export interface Clock {
  now(): UtcMillis;
}

/** A clock that always returns the same instant. */
export class FixedClock implements Clock {
  constructor(private readonly instant: UtcMillis) {
    utcMillisSchema.parse(instant);
  }

  now(): UtcMillis {
    return this.instant;
  }
}

/** A controllable clock for replay and tests: set or advance it explicitly; it never goes back. */
export class SimulatedClock implements Clock {
  private current: UtcMillis;

  constructor(start: UtcMillis) {
    this.current = utcMillisSchema.parse(start);
  }

  now(): UtcMillis {
    return this.current;
  }

  setTo(instant: UtcMillis): void {
    const next = utcMillisSchema.parse(instant);
    if (next < this.current) throw new RangeError('SimulatedClock cannot move backwards');
    this.current = next;
  }

  advance(millis: number): void {
    if (!Number.isSafeInteger(millis) || millis < 0) {
      throw new RangeError('advance requires a non-negative safe integer');
    }
    this.setTo(this.current + millis);
  }
}
