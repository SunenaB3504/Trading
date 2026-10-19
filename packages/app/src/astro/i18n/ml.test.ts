import {
  chandrashtamaBanner,
  computeProfile,
  findPlaces,
  findStars,
  freezeConventions,
  starIndex,
  stockStar,
  taraForStock,
  DEFAULT_CONVENTIONS,
} from '@trading/astro-engine';
import { describe, expect, it } from 'vitest';
import { toProfileView } from '../profileView';
import { bannerView, taraView } from '../shieldsView';
import { ENGLISH, allSpellings, tr } from './index';
import { MALAYALAM } from './ml';

const place = (q: string) => {
  const p = findPlaces(q, 1)[0];
  if (p === undefined) throw new Error(q);
  return p;
};
const conv = freezeConventions(1);
const profile = computeProfile(
  { date: '1975-08-15', time: '10:30', place: place('Mumbai, IN') },
  conv,
  '2026-10-19',
); // Virgo rising, Scorpio Moon, Anuradha pada 3, Sun/Moon period
const row = (v: ReturnType<typeof toProfileView>, label: string) =>
  v.rows.find((r) => r.label === label)?.value;

describe('the profile in Malayalam', () => {
  const v = toProfileView(profile, null, MALAYALAM);

  it('uses the Malayalam names for the sign, the Moon sign and the star', () => {
    expect(row(v, 'ലഗ്നം')).toBe('കന്നി 26°11′');
    expect(row(v, 'ചന്ദ്രരാശി')).toBe('വൃശ്ചികം');
    expect(row(v, 'ജന്മനക്ഷത്രം')).toBe('അനിഴം, പാദം 3');
  });

  it('names the planets of the running periods in Malayalam and keeps the dates as numbers', () => {
    expect(row(v, 'നടപ്പ് ദശ')).toBe('സൂര്യൻ, 2026-04-01 മുതൽ 2032-03-31 വരെ');
    expect(row(v, 'ഭുക്തി (ഉപദശ)')).toBe('ചന്ദ്രൻ, 2026-07-19 മുതൽ 2027-01-18 വരെ');
  });

  it('keeps times, zone names and coordinates in Latin digits', () => {
    expect(row(v, 'ഉപയോഗിച്ച ക്ലോക്ക് സമയം')).toBe(
      '1975-08-15T05:00 UTC, Asia/Kolkata സമയമേഖല, +05:30',
    );
    expect(row(v, 'ഉപയോഗിച്ച ജനന സ്ഥലം')).toBe('Mumbai, IN (19.07°, 72.88°)');
    expect(row(v, 'ഇന്ദു ലഗ്നം')).toBe('സ്ഥിരീകരണം ബാക്കി');
  });

  it('shows the same facts as English: only the words differ', () => {
    const en = toProfileView(profile, null, ENGLISH);
    expect(v.rows).toHaveLength(en.rows.length);
    expect(v.moonSign).toBe(en.moonSign);
    expect(v.moonNakshatra).toBe(en.moonNakshatra);
  });
});

describe('a typed-in birth star in Malayalam', () => {
  it('is understood in Malayalam script, in English, and in a regional Latin spelling', () => {
    const all = allSpellings();
    expect(starIndex('അനിഴം', all)).toBe(16);
    expect(starIndex('Anuradha', all)).toBe(16);
    expect(starIndex('Anizham', all)).toBe(16);
    expect(starIndex('തിരുവോണം', all)).toBe(21);
    expect(starIndex('അനുരാധ', all)).toBe(16);
  });

  it('is suggested as it is typed, from the first two letters, in the script typed', () => {
    const names = findStars('അനി', 6, allSpellings()).map((m) => m.name);
    expect(names).toContain('Anuradha');
    expect(findStars('തിരു', 6, allSpellings()).map((m) => m.index)).toEqual(
      expect.arrayContaining([5, 21]),
    );
  });

  it('is compared with the computed star and the answer is given in Malayalam', () => {
    const match = toProfileView(profile, { text: 'അനിഴം', index: 16 }, MALAYALAM);
    expect(row(match, 'നൽകിയ ജന്മനക്ഷത്രം')).toBe('അനിഴം (ഒത്തുവരുന്നു)');
    expect(match.warnings).toEqual([]);
    const differs = toProfileView(profile, { text: 'രോഹിണി', index: 3 }, MALAYALAM);
    expect(row(differs, 'നൽകിയ ജന്മനക്ഷത്രം')).toBe('രോഹിണി (വ്യത്യാസമുണ്ട്)');
    expect(differs.warnings.join(' ')).toContain('രോഹിണി');
    expect(differs.warnings.join(' ')).toContain('അനിഴം');
    const unknown = toProfileView(profile, { text: 'zzz', index: null }, MALAYALAM);
    expect(row(unknown, 'നൽകിയ ജന്മനക്ഷത്രം')).toBe('zzz (തിരിച്ചറിഞ്ഞില്ല)');
  });

  it('is remembered by its English name and shows in the language chosen', () => {
    expect(ENGLISH.names.stars[16]).toBe('Anuradha');
    expect(MALAYALAM.names.stars[16]).toBe('അനിഴം');
  });
});

describe('the shields in Malayalam', () => {
  it('words the Chandrashtama banner in Malayalam, with the tag and IST kept', () => {
    const banner = chandrashtamaBanner(7, Date.UTC(2026, 9, 19), DEFAULT_CONVENTIONS);
    const v = bannerView(banner, MALAYALAM);
    expect(v.headline).toBe('ചന്ദ്രാഷ്ടമം ഇപ്പോൾ ഇല്ല');
    expect(v.lines[0]?.label).toBe('അടുത്ത കാലയളവ് തുടങ്ങുന്നത്');
    expect(v.lines[0]?.value).toBe('2026-10-29 22:07 IST');
    expect(v.footnote.startsWith('[H] PH-11 ')).toBe(true);
    expect(v.footnote).toContain('ഉപദേശമല്ല');
  });

  it('gives the Tara class and group in Malayalam, with no score', () => {
    const first = Date.UTC(1995, 10, 3, 3, 45);
    const v = taraView(taraForStock(16, first, false, conv), MALAYALAM);
    expect(v.headline).toBe('പരമമിത്രം (ശുഭ വിഭാഗം)');
    expect(v.lines[0]?.value).toBe('പൂരുരുട്ടാതി, പാദം 3');
    expect(v.lines[1]?.value).toBe('9 (9-ൽ 9-ാം വിഭാഗം)');
    expect(v.footnote.startsWith('[M] [V] PH-12 ')).toBe(true);
    expect(stockStar(first, conv).nakshatra).toBe(24);
    expect(v.warning).toBeNull();
    expect(taraView(taraForStock(16, first, true, conv), MALAYALAM).warning).toContain('ഊഹിച്ച');
  });
});

describe('Malayalam sentences with values', () => {
  it('fills the placeholders in the order the Malayalam needs', () => {
    expect(tr(MALAYALAM, 'val.starPada', { name: 'അനിഴം', pada: 3 })).toBe('അനിഴം, പാദം 3');
    expect(tr(MALAYALAM, 'form.notReal', { date: '2020-02-30', time: '10:00' })).toBe(
      'ഇത് യഥാർത്ഥ തീയതിയും സമയവും അല്ല: 2020-02-30 10:00',
    );
  });

  it('keeps the disclaimer in every place English has one: not advice, no score', () => {
    expect(MALAYALAM.text['cs.foot']).toContain('ഉപദേശമല്ല');
    expect(MALAYALAM.text['tara.foot']).toContain('ഉപദേശമോ');
    expect(MALAYALAM.text['protection.notice']).toContain('എൻക്രിപ്റ്റ്');
  });
});
