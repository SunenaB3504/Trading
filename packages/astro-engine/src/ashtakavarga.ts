import { BAV_BENEFIC_PLACES } from './tables';
import type { PlanetKey } from './tables';

const SEVEN: PlanetKey[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];

export interface Ashtakavarga {
  /** Points per sign for each of the seven planets (the nodes have none). */
  bav: Record<PlanetKey, number[]>;
  /** Sum of the seven, per sign. */
  sav: number[];
}

/** Bhinna and Samudaya Ashtakavarga from the sign of each planet and of the ascendant. */
export function ashtakavarga(signs: Record<PlanetKey, number>, lagnaSign: number): Ashtakavarga {
  const bav = {} as Record<PlanetKey, number[]>;
  const sav = new Array<number>(12).fill(0);
  for (const target of SEVEN) {
    const table = new Array<number>(12).fill(0);
    for (const [donor, houses] of Object.entries(BAV_BENEFIC_PLACES[target])) {
      const from = donor === 'lagna' ? lagnaSign : signs[donor as PlanetKey];
      for (const h of houses) {
        const s = (from + h - 1) % 12;
        table[s] = (table[s] ?? 0) + 1;
      }
    }
    bav[target] = table;
    table.forEach((n, s) => (sav[s] = (sav[s] ?? 0) + n));
  }
  bav.rahu = new Array<number>(12).fill(0);
  bav.ketu = new Array<number>(12).fill(0);
  return { bav, sav };
}
