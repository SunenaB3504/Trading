import { tropicalPositions } from '../../packages/astro-engine/src/ephemeris';
import { ayanamsaFor, DEFAULT_CONVENTIONS } from '../../packages/astro-engine/src/conventions';
const C = DEFAULT_CONVENTIONS;
const K = ['sun','moon','mercury','venus','mars','jupiter','saturn','rahu','ketu'] as const;
const out: any[] = [];
for (const date of ['1988-08-29','2006-08-18']) {
  for (const [tag, hhmm] of [['0915','03:45'],['1000','04:30'],['1530','10:00']] as const) {
    const t = tropicalPositions({ utc: date + 'T' + hhmm, latitude: 18.9322, longitude: 72.8333 }, C);
    const ay = ayanamsaFor(C, t.julianDay);
    const n = (x: number) => (((x - ay) % 360) + 360) % 360;
    out.push({ date, tag, lagn: n(t.ascendant), ...Object.fromEntries(K.map((k) => [k, n(t.longitudes[k])])) });
  }
}
console.log(JSON.stringify(out));
