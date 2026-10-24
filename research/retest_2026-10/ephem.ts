import fs from 'node:fs';
import { tropicalPositions } from 'C:/Users/Admin/Sunil/Trading/packages/astro-engine/src/ephemeris';
import { ayanamsaFor, DEFAULT_CONVENTIONS } from 'C:/Users/Admin/Sunil/Trading/packages/astro-engine/src/conventions';
const C = DEFAULT_CONVENTIONS;
const K = ['sun','moon','mercury','venus','mars','jupiter','saturn','rahu','ketu'] as const;
const lon = (utc: string, lat: number, lo: number) => {
  const t = tropicalPositions({ utc, latitude: lat, longitude: lo }, C);
  const ay = ayanamsaFor(C, t.julianDay);
  const n = (x: number) => (((x - ay) % 360) + 360) % 360;
  return { t, n, ay };
};
// 1. daily sidereal longitudes at 09:15 IST (03:45 UTC) and 15:30 IST (10:00 UTC)
const out = ['date,' + K.map((k) => k + '_0915').join(',') + ',moon_1530'];
for (let ms = Date.UTC(2006, 10, 1); ms <= Date.UTC(2026, 10, 30); ms += 86400000) {
  const d = new Date(ms).toISOString().slice(0, 10);
  const a = lon(d + 'T03:45', 18.9322, 72.8333);
  const b = lon(d + 'T10:00', 18.9322, 72.8333);
  out.push([d, ...K.map((k) => a.n(a.t.longitudes[k]).toFixed(4)), b.n(b.t.longitudes.moon).toFixed(4)].join(','));
}
fs.writeFileSync('C:/Users/Admin/AppData/Local/Temp/claude/C--Users-Admin--claude-spares-spare-Kc48ZJ/2aba0b3a-4f48-4373-869f-8bd2a54a2a16/scratchpad/rt/daily_ephem.csv', out.join('\n'));
// 2. listing charts for verified stocks at three times
const ipo = JSON.parse(fs.readFileSync('C:/Users/Admin/Sunil/Trading/data/raw/nse-ipo-lists/ipo_verified.json', 'utf8'));
const rows = ['sym,listing,first,time,lagnaSign,' + K.map((k) => k + 'Lon').join(',')];
for (const r of ipo) {
  for (const [tag, hhmm] of [['0915','03:45'],['1000','04:30'],['1530','10:00']] as const) {
    const a = lon(r.listing + 'T' + hhmm, 18.9322, 72.8333);
    rows.push([r.sym, r.listing, r.first, tag, Math.floor(a.n(a.t.ascendant) / 30), ...K.map((k) => a.n(a.t.longitudes[k]).toFixed(4))].join(','));
  }
}
fs.writeFileSync('C:/Users/Admin/AppData/Local/Temp/claude/C--Users-Admin--claude-spares-spare-Kc48ZJ/2aba0b3a-4f48-4373-869f-8bd2a54a2a16/scratchpad/rt/charts.csv', rows.join('\n'));
console.log('done', out.length, rows.length);
