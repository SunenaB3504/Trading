import fs from 'node:fs';
const D = process.env.OUT;
const day = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000;
// ---- the 206 verified clean-collapse stocks: only listing date and last trading date are used (no chart, no Moon, no event date)
const ver = new Map(JSON.parse(fs.readFileSync(`${D}/ipo_verified.json`, 'utf8')).map((v) => [v.sym, v]));
const stocks = JSON.parse(fs.readFileSync(`${D}/downfalls_v2.json`, 'utf8')).filter((x) => x.unrec && x.maxDrop > -0.35 && ver.has(x.sym)).map((x) => {
  const listing = ver.get(x.sym).listing; const w0 = Math.max(day(listing), day('2007-01-02')); const w1 = day(x.last);
  return { ageYears: Math.max(0, w0 - day(listing)) / 365.25, lifeYears: Math.max(0.5, (w1 - w0) / 365.25) };
});
console.log('verified clean collapse stocks', stocks.length);
const L = stocks.map((s) => s.lifeYears).sort((a, b) => a - b); const q = (p) => L[Math.floor(p * (L.length - 1))].toFixed(1);
console.log('life in window (years): min', q(0), 'p25', q(0.25), 'median', q(0.5), 'p75', q(0.75), 'max', q(1));
// ---- Vimshottari structure (the standard table; not applied to any stock)
const ORDER = ['Ketu', 'Venus', 'Sun', 'Moon', 'Mars', 'Rahu', 'Jupiter', 'Saturn', 'Mercury']; const YRS = { Ketu: 7, Venus: 20, Sun: 6, Moon: 10, Mars: 7, Rahu: 18, Jupiter: 16, Saturn: 19, Mercury: 17 };
const P1 = new Set(['Saturn', 'Rahu', 'Ketu', 'Mars']);
console.log('P1 class share of a full 120-year cycle:', ([...P1].reduce((a, p) => a + YRS[p], 0) / 120).toFixed(4));
const SIGN_LORD = ['Mars', 'Venus', 'Mercury', 'Moon', 'Sun', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Saturn', 'Jupiter'];
const p2Class = (lagna) => new Set([5, 7, 11].map((o) => SIGN_LORD[(lagna + o) % 12]));
const p2share = [...Array(12).keys()].map((l) => [...p2Class(l)].reduce((a, p) => a + YRS[p], 0) / 120);
console.log('P2 class share of a full cycle by lagna sign (Aries..Pisces):', p2share.map((x) => x.toFixed(3)).join(' '), '| mean', (p2share.reduce((a, b) => a + b, 0) / 12).toFixed(4));
// ---- coverage of a class in [t0, t0+len] years after birth, for a Moon position m in [0,27)
function coverage(m, t0, len, cls) {
  const md0 = Math.floor(m) % 9; const frac = m - Math.floor(m); let t = -frac * YRS[ORDER[md0]]; let covered = 0; const end = t0 + len;
  for (let k = 0; t < end; k++) { const A = ORDER[(md0 + k) % 9]; for (let j = 0; j < 9; j++) { const B = ORDER[(ORDER.indexOf(A) + j) % 9]; const d = (YRS[A] * YRS[B]) / 120; const a = Math.max(t, t0), b = Math.min(t + d, end); if (cls.has(B) && b > a) covered += b - a; t += d; if (t >= end) break; } }
  return covered / len;
}
let seed = 12345; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const norm = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());
function power(n, delta, kind, sims = 2000) {
  let hit = 0;
  for (let s = 0; s < sims; s++) {
    let sumDiff = 0, vari = 0;
    for (let i = 0; i < n; i++) {
      const st = stocks[Math.floor(rnd() * stocks.length)]; const m = rnd() * 27; const cls = kind === 'P1' ? P1 : p2Class(Math.floor(rnd() * 12));
      const p = coverage(m, st.ageYears, st.lifeYears, cls); const x = rnd() < Math.min(1, p + delta) ? 1 : 0; sumDiff += x - p; vari += p * (1 - p);
    }
    if (sumDiff / Math.sqrt(vari) > 1.96) hit++; // one-sided, alpha 0.025 each (Holm over two tests)
  }
  return hit / sims;
}
// typical coverage spread
const spread = []; for (let i = 0; i < 4000; i++) { const st = stocks[i % stocks.length]; spread.push(coverage(rnd() * 27, st.ageYears, st.lifeYears, P1)); } spread.sort((a, b) => a - b);
console.log('P1 coverage per stock over its own life: p5', spread[200].toFixed(2), 'median', spread[2000].toFixed(2), 'p95', spread[3800].toFixed(2));
for (const [kind, n] of [['P1', 206], ['P1', 230], ['P1', 103], ['P2', 206], ['P2', 124], ['P2', 103]]) {
  const row = []; let mde = null;
  for (const d of [0.04, 0.06, 0.08, 0.10, 0.12, 0.15]) { const pw = power(n, d, kind, 600); row.push(`${(d * 100).toFixed(0)}pt:${(pw * 100).toFixed(0)}%`); if (mde === null && pw >= 0.8) mde = d; }
  const null_ = power(n, 0, kind, 1500);
  console.log(kind, 'n=' + n, row.join(' '), '| smallest tested effect with 80% power:', mde === null ? '>15pt' : `${(mde * 100).toFixed(0)}pt`, '| false-positive rate at 0 effect', (null_ * 100).toFixed(1) + '%');
}
