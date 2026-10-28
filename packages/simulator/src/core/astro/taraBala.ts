/**
 * packages/simulator/src/core/astro/taraBala.ts
 * Classical Tara Bala (9-Star Energy Cycle) and Panchanga Micro-Timing Engine.
 * Evaluates transit Moon distance from Janma Nakshatra and lunar phase (Tithi).
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

export type TaraCategory = 'AUSPICIOUS' | 'NEUTRAL' | 'INAUSPICIOUS';

export interface TaraBalaInfo {
  taraNumber: number; // 1..9
  taraName: string;
  category: TaraCategory;
  isAuspicious: boolean;
  isFatal: boolean; // Naidhana / Vadha (Tara 7)
  cycle: number; // 1: Janma, 2: Anujanma, 3: Trijanma
  description: string;
}

export interface PanchangaState {
  tara: TaraBalaInfo;
  tithiNumber: number; // 1..30
  paksha: 'SHUKLA' | 'KRISHNA';
  isRiktaTithi: boolean; // 4th, 9th, 14th tithis
  varaDayIndex: number; // 0..6 (0=Sunday)
}

const TARA_DEFINITIONS: Record<
  number,
  { name: string; category: TaraCategory; description: string }
> = {
  1: { name: 'Janma', category: 'NEUTRAL', description: 'Body & identity; sensitive, requiring caution' },
  2: { name: 'Sampat', category: 'AUSPICIOUS', description: 'Wealth, prosperity, and financial influx' },
  3: { name: 'Vipat', category: 'INAUSPICIOUS', description: 'Perils, danger, and volatile disruption' },
  4: { name: 'Kshema', category: 'AUSPICIOUS', description: 'Safety, steady protection, and well-being' },
  5: { name: 'Pratyak', category: 'INAUSPICIOUS', description: 'Obstacles, friction, and delays' },
  6: { name: 'Sadhana', category: 'AUSPICIOUS', description: 'Achievement, fulfillment, and strategic gain' },
  7: { name: 'Naidhana', category: 'INAUSPICIOUS', description: 'Destruction, capitulation, and fatal risk' },
  8: { name: 'Mitra', category: 'AUSPICIOUS', description: 'Friendly support and favorable alliances' },
  9: { name: 'Parama Mitra', category: 'AUSPICIOUS', description: 'Supreme fortune and auspicious confluence' },
};

/**
 * Calculates Tara Bala by measuring distance from Janma Nakshatra to transit Moon Nakshatra.
 * @param janmaNakshatraIdx 0..26
 * @param transitMoonNakshatraIdx 0..26
 */
export function calculateTaraBala(
  janmaNakshatraIdx: number,
  transitMoonNakshatraIdx: number
): TaraBalaInfo {
  const normJanma = ((janmaNakshatraIdx % 27) + 27) % 27;
  const normTransit = ((transitMoonNakshatraIdx % 27) + 27) % 27;

  const distance = ((normTransit - normJanma + 27) % 27);
  const taraNumber = (distance % 9) + 1;
  const cycle = Math.floor(distance / 9) + 1;

  const def = TARA_DEFINITIONS[taraNumber] ?? {
    name: 'Janma',
    category: 'NEUTRAL',
    description: 'Neutral',
  };

  return {
    taraNumber,
    taraName: def.name,
    category: def.category,
    isAuspicious: def.category === 'AUSPICIOUS',
    isFatal: taraNumber === 7,
    cycle,
    description: def.description,
  };
}

/**
 * Computes Tithi from Sun and Moon longitudes (0..360).
 */
export function calculateTithi(
  sunLongitude: number,
  moonLongitude: number
): {
  tithiNumber: number;
  paksha: 'SHUKLA' | 'KRISHNA';
  isRiktaTithi: boolean;
} {
  const diff = ((moonLongitude - sunLongitude) % 360 + 360) % 360;
  const tithiNumber = Math.min(30, Math.floor(diff / 12) + 1);
  const paksha: 'SHUKLA' | 'KRISHNA' = tithiNumber <= 15 ? 'SHUKLA' : 'KRISHNA';

  // Rikta (empty/destructive) Tithis: 4, 9, 14 in both pakshas
  const tithiInPaksha = ((tithiNumber - 1) % 15) + 1;
  const isRiktaTithi = tithiInPaksha === 4 || tithiInPaksha === 9 || tithiInPaksha === 14;

  return { tithiNumber, paksha, isRiktaTithi };
}

/**
 * Maps corporate primary consonant sound to classical Nakshatra station (0..26)
 * for Sarvatobhadra Chakra Nama Nakshatra assignment.
 */
export function mapConsonantToNakshatra(consonant: string): number {
  const c = (consonant || '').trim();
  const CONSONANT_NAKSHATRA_MAP: Record<string, number> = {
    A: 2, // Krittika
    I: 2,
    U: 2,
    E: 2,
    O: 3, // Rohini
    Va: 3,
    Ka: 4, // Mrigashira
    Gha: 5, // Ardra
    Ha: 6, // Punarvasu
    Da: 7, // Pushya
    Ma: 8, // Ashlesha
    Ta: 9, // Magha
    Pha: 10, // Purva Phalguni
    Sha: 11, // Uttara Phalguni
    Na: 12, // Hasta
    Ra: 13, // Chitra
    Ta2: 14, // Swati
    Ya: 17, // Jyeshtha
    Bha: 18, // Mula
    Dha: 19, // Purva Ashadha
    Ja: 20, // Uttara Ashadha
    Ga: 22, // Dhanishta
    Sa: 23, // Shatabhisha
    Jha: 25, // Uttara Bhadrapada
    Cha: 26, // Revati
    La: 0, // Ashwini
    Pa: 11, // Uttara Phalguni
    Ba: 18, // Mula
  };

  return CONSONANT_NAKSHATRA_MAP[c] ?? 0;
}

