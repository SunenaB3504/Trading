import { describe, expect, it } from 'vitest';
import { colors } from './colors';

// WCAG 2.1 AA: normal text needs a contrast ratio of at least 4.5 to 1 against its background.
function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (lin[0] as number) + 0.7152 * (lin[1] as number) + 0.0722 * (lin[2] as number);
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

// Every foreground and background pair the screens use. Greens and reds are the pass/fail colours.
const PAIRS: Array<[string, string, string]> = [
  ['body text on page', colors.text, colors.background],
  ['muted text on page', colors.muted, colors.background],
  ['links and accents on page', colors.accent, colors.background],
  ['warnings on page', colors.warn, colors.background],
  ['accent text on selected chip', colors.accent, '#e8f0fe'],
  ['white text on accent button', '#ffffff', colors.accent],
  ['online green on page', '#0a7d33', colors.background],
  ['pass or profit green on page', '#0a7d33', colors.background],
  ['fail or loss red on page', '#b00020', colors.background],
];

describe('colour contrast (NFR-9, WCAG AA)', () => {
  it.each(PAIRS)('%s is at least 4.5 to 1', (_name, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it('computes the ratio correctly on known values', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#ffffff', '#ffffff')).toBeCloseTo(1, 5);
    expect(contrast('#767676', '#ffffff')).toBeCloseTo(4.54, 2); // the classic AA grey
  });
});
