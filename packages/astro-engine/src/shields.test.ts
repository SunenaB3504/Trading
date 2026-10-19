import { describe, expect, it } from 'vitest';
import golden from '../../../fixtures/astro/shield_golden.json';
import { DEFAULT_CONVENTIONS } from './conventions';
import { DEFAULT_RULES, freezeConventions } from './registry';
import { chandrashtamaBanner, chandrashtamaWindows, stockStar, taraForStock } from './shields';

const conv = DEFAULT_CONVENTIONS;
const frozen = freezeConventions(1);
const MIN = 60_000;
const DAY = 86_400_000;

interface WindowCase {
  natalMoonSign: number;
  fromMs: number;
  toMs: number;
  windows: Array<[number, number]>;
}
const cases = (golden as unknown as { chandrashtama: WindowCase[] }).chandrashtama;
const stars = (
  golden as unknown as { stars: Array<{ firstTradeMs: number; nakshatra: number; margin: number }> }
).stars;

describe('Chandrashtama windows against Swiss Ephemeris', () => {
  it.each(cases.map((c) => [`natal Moon sign ${c.natalMoonSign}`, c] as const))('%s', (_, c) => {
    const got = chandrashtamaWindows(c.natalMoonSign, c.fromMs, c.toMs, conv);
    expect(got).toHaveLength(c.windows.length);
    got.forEach((w, i) => {
      const [start, end] = c.windows[i] as [number, number];
      expect(Math.abs(w.startMs - start), `start ${i}`).toBeLessThanOrEqual(2 * MIN);
      expect(Math.abs(w.endMs - end), `end ${i}`).toBeLessThanOrEqual(2 * MIN);
    });
  });

  it('lasts about two and a quarter days each, and the windows never overlap', () => {
    for (const c of cases) {
      const ws = chandrashtamaWindows(c.natalMoonSign, c.fromMs, c.toMs, conv);
      ws.forEach((w, i) => {
        const days = (w.endMs - w.startMs) / DAY;
        expect(days).toBeGreaterThan(1.8);
        expect(days).toBeLessThan(2.8);
        if (i > 0) expect(w.startMs).toBeGreaterThan((ws[i - 1] as { endMs: number }).endMs);
      });
    }
  });
});

describe('the banner (FR-P6, D29)', () => {
  const c = cases[0] as WindowCase;
  const [start, end] = c.windows[0] as [number, number];

  it('is active inside a window and names when it ends and when the next one starts', () => {
    const b = chandrashtamaBanner(c.natalMoonSign, start + DAY, conv);
    expect(b.active).not.toBeNull();
    expect(Math.abs((b.active?.endMs ?? 0) - end)).toBeLessThanOrEqual(2 * MIN);
    expect(b.next?.startMs).toBeGreaterThan(end);
  });

  it('is not active outside a window, and still says when the next one starts', () => {
    const b = chandrashtamaBanner(c.natalMoonSign, start - DAY, conv);
    expect(b.active).toBeNull();
    expect(Math.abs((b.next?.startMs ?? 0) - start)).toBeLessThanOrEqual(2 * MIN);
  });

  it('is tagged a hypothesis and carries no percentage, score or advice', () => {
    const b = chandrashtamaBanner(c.natalMoonSign, start + DAY, conv);
    expect(b.tag).toBe('[H] PH-11');
    expect(Object.keys(b).sort()).toEqual(['active', 'next', 'tag']);
    expect(JSON.stringify(b)).not.toMatch(/percent|score|buffer|advice|%/i);
  });
});

describe('the stock star (D5) and Tara Bala for a stock (FR-P7, D30)', () => {
  it("is the Moon's nakshatra at the first-trade timestamp, matching Swiss Ephemeris", () => {
    for (const s of stars) {
      expect(s.margin, 'a fair comparison keeps clear of a boundary').toBeGreaterThan(0.02);
      expect(stockStar(s.firstTradeMs, frozen).nakshatra).toBe(s.nakshatra);
    }
  });

  it('gives Vipat for the worked case: trader Pushya, stock born under Mula', () => {
    const first = stars[0] as { firstTradeMs: number };
    let ms = first.firstTradeMs;
    while (stockStar(ms, frozen).nakshatra !== 18) ms += 6 * 3_600_000; // find a moment with the Moon in Mula
    const r = taraForStock(7, ms, false, frozen);
    expect(r.stock.nakshatraName).toBe('Mula');
    expect(r.tara).toMatchObject({ count: 12, name: 'Vipat', group: 'bad' });
    expect(r.tag).toBe('[M] [V] PH-12');
    expect(JSON.stringify(r)).not.toMatch(/score|percent|%|boost/i);
  });

  it('carries the assumed-time flag through unchanged', () => {
    const ms = (stars[1] as { firstTradeMs: number }).firstTradeMs;
    expect(taraForStock(3, ms, true, frozen).timeAssumed).toBe(true);
    expect(taraForStock(3, ms, false, frozen).timeAssumed).toBe(false);
  });

  it('refuses to run when the stock-star rule has not been registered', () => {
    const open = freezeConventions(1, undefined, { ...DEFAULT_RULES, stockStar: 'unregistered' });
    expect(() => stockStar((stars[0] as { firstTradeMs: number }).firstTradeMs, open)).toThrow(
      /stockStar/,
    );
  });

  it('gives a convention set a different hash now that the stock-star rule is part of it', () => {
    const other = freezeConventions(1, undefined, { ...DEFAULT_RULES, stockStar: 'unregistered' });
    expect(other.hash).not.toBe(frozen.hash);
  });
});
