/** Divisional charts that have a settled rule: D9 Navamsha and D10 Dasamsha (Parasara). */
export function navamshaSign(sign: number, degreesInSign: number): number {
  const pada = Math.floor(degreesInSign / (30 / 9));
  const start = [sign, (sign + 8) % 12, (sign + 4) % 12][sign % 3] as number; // movable, fixed, dual
  return (start + pada) % 12;
}

export function dasamshaSign(sign: number, degreesInSign: number): number {
  const part = Math.floor(degreesInSign / 3);
  const start = sign % 2 === 0 ? sign : (sign + 8) % 12; // odd signs from themselves, even from the 9th
  return (start + part) % 12;
}
