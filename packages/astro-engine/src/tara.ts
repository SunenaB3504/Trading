/**
 * Tara Bala (FR-P7, D30): count inclusively from the trader's janma nakshatra (count 1) to the other
 * nakshatra, wrapping at 27, then take it mod 9. The direction matters: the reverse count gives a
 * different category. Nakshatras are 0-based here (0 = Ashwini).
 */
export const TARA_NAMES = [
  'Janma',
  'Sampat',
  'Vipat',
  'Kshema',
  'Pratyak',
  'Sadhana',
  'Naidhana',
  'Mitra',
  'Parama Mitra',
] as const;

export type TaraName = (typeof TARA_NAMES)[number];
export type TaraGroup = 'good' | 'bad' | 'mixed';

export interface Tara {
  /** 1 to 27: the inclusive count from the trader's star to the other one. */
  count: number;
  /** 1 to 9. */
  number: number;
  name: TaraName;
  /** Classical grouping: 2, 4, 6, 8, 9 good; 3, 5, 7 bad; Janma mixed. */
  group: TaraGroup;
}

export function taraBala(traderNakshatra: number, otherNakshatra: number): Tara {
  for (const n of [traderNakshatra, otherNakshatra]) {
    if (!Number.isInteger(n) || n < 0 || n > 26)
      throw new Error(`Nakshatra must be 0 to 26, got ${n}`);
  }
  const count = ((otherNakshatra - traderNakshatra + 27) % 27) + 1;
  const number = count % 9 === 0 ? 9 : count % 9;
  const group: TaraGroup =
    number === 1 ? 'mixed' : [2, 4, 6, 8, 9].includes(number) ? 'good' : 'bad';
  return { count, number, name: TARA_NAMES[number - 1] as TaraName, group };
}
