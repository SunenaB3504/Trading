import { tropicalPositions } from 'C:/Users/Admin/Sunil/Trading/packages/astro-engine/src/ephemeris';
import { ayanamsaFor, DEFAULT_CONVENTIONS } from 'C:/Users/Admin/Sunil/Trading/packages/astro-engine/src/conventions';
for (const [n,d] of [['TCS','2004-08-25'],['DIXON','2017-09-18'],['POLYCAB','2019-04-16'],['NAZARA','2021-03-26']]) for (const t of ['03:45','04:30','10:00']) {
  const x = tropicalPositions({utc:d+'T'+t,latitude:18.9322,longitude:72.8333},DEFAULT_CONVENTIONS);
  const ay = ayanamsaFor(DEFAULT_CONVENTIONS,x.julianDay);
  const m=(((x.longitudes.moon-ay)%360)+360)%360, l=(((x.ascendant-ay)%360)+360)%360;
  console.log(n,d,t,'moonSign',Math.floor(m/30),'moonDeg',m.toFixed(2),'lagna',Math.floor(l/30));
}
