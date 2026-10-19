import {
  chandrashtamaBanner,
  computeProfile,
  findPlaces,
  freezeConventions,
  starIndex,
  taraForStock,
  DEFAULT_CONVENTIONS,
} from '@trading/astro-engine';
import { describe, expect, it } from 'vitest';
import { toProfileView } from '../profileView';
import { bannerView, taraView } from '../shieldsView';
import { allSpellings, tr } from './index';
import { HINDI } from './hi';

const place = findPlaces('Mumbai, IN', 1)[0];
if (place === undefined) throw new Error('Mumbai');
const conv = freezeConventions(1);
const profile = computeProfile({ date: '1975-08-15', time: '10:30', place }, conv, '2026-10-19');
const row = (v: ReturnType<typeof toProfileView>, label: string) =>
  v.rows.find((r) => r.label === label)?.value;

describe('the profile in Hindi', () => {
  const v = toProfileView(profile, null, HINDI);

  it('uses the Hindi names for the sign, the Moon sign, the star and the periods', () => {
    expect(row(v, 'लग्न')).toBe('कन्या 26°11′');
    expect(row(v, 'चंद्र राशि')).toBe('वृश्चिक');
    expect(row(v, 'जन्म नक्षत्र')).toBe('अनुराधा, चरण 3');
    expect(row(v, 'वर्तमान दशा')).toBe('सूर्य, 2026-04-01 से 2032-03-31 तक');
    expect(row(v, 'भुक्ति (अंतर्दशा)')).toBe('चंद्र, 2026-07-19 से 2027-01-18 तक');
  });

  it('keeps times, zone names and coordinates in Latin digits', () => {
    expect(row(v, 'प्रयुक्त घड़ी का समय')).toBe(
      '1975-08-15T05:00 UTC, Asia/Kolkata समय क्षेत्र, +05:30',
    );
  });
});

describe('a typed-in birth star in Hindi', () => {
  it('is understood in Devanagari, English and a regional spelling', () => {
    const all = allSpellings();
    expect(starIndex('अनुराधा', all)).toBe(16);
    expect(starIndex('श्रवण', all)).toBe(21);
    expect(starIndex('ज्येष्ठ', all)).toBe(17);
    expect(starIndex('Anuradha', all)).toBe(16);
  });

  it('is compared with the computed star and answered in Hindi', () => {
    const match = toProfileView(profile, { text: 'अनुराधा', index: 16 }, HINDI);
    expect(row(match, 'दिया गया जन्म नक्षत्र')).toBe('अनुराधा (मेल खाता है)');
    expect(match.warnings).toEqual([]);
    const differs = toProfileView(profile, { text: 'रोहिणी', index: 3 }, HINDI);
    expect(differs.warnings.join(' ')).toContain('अनुराधा');
  });
});

describe('the shields in Hindi', () => {
  it('words the Chandrashtama banner and Tara result in Hindi with the tags kept', () => {
    const banner = bannerView(
      chandrashtamaBanner(7, Date.UTC(2026, 9, 19), DEFAULT_CONVENTIONS),
      HINDI,
    );
    expect(banner.headline).toBe('चंद्राष्टम अभी नहीं है');
    expect(banner.lines[0]?.value).toBe('2026-10-29 22:07 IST');
    expect(banner.footnote.startsWith('[H] PH-11 ')).toBe(true);
    const tara = taraView(taraForStock(16, Date.UTC(1995, 10, 3, 3, 45), false, conv), HINDI);
    expect(tara.headline).toBe('अतिमित्र (शुभ वर्ग)');
    expect(tara.footnote.startsWith('[M] [V] PH-12 ')).toBe(true);
    expect(tara.footnote).toContain('कोई अंक या सलाह नहीं');
  });

  it('fills placeholders and keeps the not-advice wording', () => {
    expect(tr(HINDI, 'val.starPada', { name: 'अनुराधा', pada: 3 })).toBe('अनुराधा, चरण 3');
    expect(HINDI.text['cs.foot']).toContain('सलाह नहीं');
  });
});
