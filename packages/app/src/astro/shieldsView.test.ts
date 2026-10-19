import { describe, expect, it } from 'vitest';
import { bannerView, istText, taraView } from './shieldsView';

const base = { tag: '[H] PH-11' as const };

describe('Chandrashtama banner wording (FR-P6, D29)', () => {
  it('writes IST to the minute', () => {
    expect(istText(Date.UTC(2026, 9, 21, 3, 44))).toBe('2026-10-21 09:14 IST');
    expect(istText(Date.UTC(2026, 9, 21, 20, 0))).toBe('2026-10-22 01:30 IST'); // crosses midnight
  });

  it('says it is running, with the start and end, and when the next one comes', () => {
    const v = bannerView({
      ...base,
      active: { startMs: Date.UTC(2026, 9, 21, 3, 44), endMs: Date.UTC(2026, 9, 23, 14, 32) },
      next: { startMs: Date.UTC(2026, 10, 17, 1, 0), endMs: Date.UTC(2026, 10, 19, 9, 0) },
    });
    expect(v.headline).toBe('Chandrashtama is running now');
    expect(v.lines.map((l) => l.label)).toEqual([
      'Started',
      'Ends',
      'Next window starts',
      'Next window ends',
    ]);
    expect(v.lines[1]?.value).toBe('2026-10-23 20:02 IST');
  });

  it('says it is not running and still gives the next window', () => {
    const v = bannerView({ ...base, active: null, next: { startMs: 0, endMs: 1000 } });
    expect(v.headline).toBe('Chandrashtama is not running now');
    expect(v.lines).toHaveLength(2);
  });

  it('is tagged a hypothesis and carries no percentage, score or advice', () => {
    const v = bannerView({ ...base, active: { startMs: 0, endMs: 1 }, next: null });
    expect(v.footnote).toMatch(/^\[H\] PH-11/);
    expect(v.footnote).toMatch(/not advice/);
    expect(JSON.stringify(v)).not.toMatch(/percent|score|buffer|%|reduce|avoid|don't/i);
  });
});

describe('Tara Bala wording (FR-P7, D30)', () => {
  const result = {
    tara: { count: 12, number: 3, name: 'Vipat', group: 'bad' },
    stock: { nakshatra: 18, nakshatraName: 'Mula', pada: 2 },
    timeAssumed: false,
    tag: '[M] [V] PH-12' as const,
  } as never;

  it('gives the category name and group, the stock star and the count, and no score', () => {
    const v = taraView(result);
    expect(v.headline).toBe('Vipat (bad group)');
    expect(v.lines).toEqual([
      { label: "Stock's birth star", value: 'Mula, pada 2' },
      { label: 'Count from your star', value: '12 (class 3 of 9)' },
    ]);
    expect(v.footnote).toMatch(/^\[M\] \[V\] PH-12/);
    // the footnote may say there is no score; the headline and lines must not carry one
    expect(JSON.stringify([v.headline, v.lines])).not.toMatch(/score|percent|%|boost/i);
    expect(v.warning).toBeNull();
  });

  it('warns when the stock star rests on an assumed first-trade time', () => {
    expect(taraView({ ...(result as object), timeAssumed: true } as never).warning).toMatch(
      /assumed time/,
    );
  });
});
