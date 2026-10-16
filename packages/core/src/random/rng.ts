import { sha256Bytes } from '../hash/sha256';
import { utf8Encode } from '../hash/utf8';

/** Seeded, platform-independent PRNG: xoshiro128** over 32-bit integers only (RB R8). */
export interface Rng {
  /** The seed text this generator was created from (record it with every run). */
  readonly seed: string;
  nextU32(): number;
  /** Uniform in [0, 1) with 53 random bits. */
  nextFloat(): number;
  /** Uniform integer in [0, maxExclusive), unbiased. `maxExclusive` in [1, 2^32]. */
  nextInt(maxExclusive: number): number;
  /** In-place Fisher-Yates shuffle. */
  shuffle<T>(items: T[]): T[];
  /** An independent stream derived from this seed and a label, regardless of draws so far. */
  fork(label: string): Rng;
}

function rotl(x: number, k: number): number {
  return (x << k) | (x >>> (32 - k));
}

/** State words from the first 16 bytes of SHA-256(seed); never all zero. */
function seedState(seed: string): Uint32Array {
  const view = new DataView(sha256Bytes(utf8Encode(seed)).buffer);
  const s = Uint32Array.from([0, 4, 8, 12].map((o) => view.getUint32(o)));
  if (s.every((w) => w === 0)) s[0] = 1;
  return s;
}

class Xoshiro128 implements Rng {
  private readonly s: Uint32Array;

  constructor(readonly seed: string) {
    this.s = seedState(seed);
  }

  nextU32(): number {
    const s = this.s as Uint32Array & { [i: number]: number };
    const result = Math.imul(rotl(Math.imul(s[1] as number, 5), 7), 9) >>> 0;
    const t = (s[1] as number) << 9;
    s[2] = (s[2] as number) ^ (s[0] as number);
    s[3] = (s[3] as number) ^ (s[1] as number);
    s[1] = (s[1] as number) ^ (s[2] as number);
    s[0] = (s[0] as number) ^ (s[3] as number);
    s[2] = (s[2] as number) ^ t;
    s[3] = rotl(s[3] as number, 11);
    return result;
  }

  nextFloat(): number {
    const high = this.nextU32() >>> 5;
    const low = this.nextU32() >>> 6;
    return (high * 67_108_864 + low) / 9_007_199_254_740_992;
  }

  nextInt(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive < 1 || maxExclusive > 4_294_967_296) {
      throw new RangeError('maxExclusive must be an integer in [1, 2^32]');
    }
    const limit = Math.floor(4_294_967_296 / maxExclusive) * maxExclusive;
    for (;;) {
      const r = this.nextU32();
      if (r < limit) return r % maxExclusive;
    }
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = this.nextInt(i + 1);
      [items[i], items[j]] = [items[j] as T, items[i] as T];
    }
    return items;
  }

  fork(label: string): Rng {
    return new Xoshiro128(`${this.seed}|${label}`);
  }
}

export function createRng(seed: string): Rng {
  if (seed.length === 0) throw new RangeError('seed must not be empty');
  return new Xoshiro128(seed);
}
