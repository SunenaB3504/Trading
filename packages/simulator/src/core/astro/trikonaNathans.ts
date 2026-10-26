/**
 * packages/simulator/src/core/astro/trikonaNathans.ts
 * Derives the Lagna Trikona Nathans (Lords of 1H, 5H, and 9H).
 * Enforces strict modularity (< 150 LOC, functions < 60 LOC, complexity <= 10).
 */

import { SIGN_LORDS, SIGN_NAMES } from './constants';
import type { PlanetKey } from './types';

export interface TrikonaNathansResult {
  lagnaSignId: number;
  lagnaSignName: string;
  lagnaLord: PlanetKey;
  h5SignId: number;
  h5SignName: string;
  h5Lord: PlanetKey;
  h9SignId: number;
  h9SignName: string;
  h9Lord: PlanetKey;
  trikonaLords: readonly PlanetKey[];
}

export function deriveTrikonaNathans(lagnaSignId: number): TrikonaNathansResult {
  const normLagna = ((lagnaSignId % 12) + 12) % 12;
  const h5Id = (normLagna + 4) % 12;
  const h9Id = (normLagna + 8) % 12;

  const lagnaLord = SIGN_LORDS[normLagna] ?? 'mars';
  const h5Lord = SIGN_LORDS[h5Id] ?? 'sun';
  const h9Lord = SIGN_LORDS[h9Id] ?? 'jupiter';

  const lagnaSignName = SIGN_NAMES[normLagna] ?? 'Aries';
  const h5SignName = SIGN_NAMES[h5Id] ?? 'Leo';
  const h9SignName = SIGN_NAMES[h9Id] ?? 'Sagittarius';

  const uniqueLords = Array.from(new Set([lagnaLord, h5Lord, h9Lord]));

  return {
    lagnaSignId: normLagna,
    lagnaSignName,
    lagnaLord,
    h5SignId: h5Id,
    h5SignName,
    h5Lord,
    h9SignId: h9Id,
    h9SignName,
    h9Lord,
    trikonaLords: uniqueLords,
  };
}
