import fs from 'node:fs';
import readline from 'node:readline';
const OUT = process.env.OUT; const WS_ = process.env.WS || "2010-01-02";
const dayNo = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000;
const S = new Map(); let first = true;
for await (const line of readline.createInterface({ input: fs.createReadStream(`${OUT}/eq_daily.csv`) })) {
  if (first) { first = false; continue; }
  const c = line.split(','); const close = +c[3]; if (!(close > 0)) continue;
  let s = S.get(c[0]); if (!s) { s = { dt: [], d: [], c: [], v: [], sr: [] }; S.set(c[0], s); }
  const L = s.dt.length - 1;
  if (L >= 0 && s.dt[L] === c[1]) { if (s.sr[L] === 'BE' && c[2] === 'EQ') { s.c[L] = close; s.v[L] = +c[5]; s.sr[L] = 'EQ'; } continue; }
  s.dt.push(c[1]); s.d.push(dayNo(c[1])); s.c.push(close); s.v.push(+c[5]); s.sr.push(c[2]);
}
console.log('symbols', S.size);
// ---- heuristic split/bonus detector on raw closes
const CAND = [1/2, 1/3, 1/4, 1/5, 1/10, 1/20, 2/3, 3/4, 3/5, 2/5, 4/5, 3/8, 1/8, 1/6, 2, 3, 5, 10];
const med = (a) => { const b = a.filter((x) => x >= 0).sort((x, y) => x - y); return b.length ? b[b.length >> 1] : NaN; };
const RULES = { N: () => false, A: (e) => e.factor <= 0.55 || e.factor >= 1.8, B: (e) => e.factor <= 0.45 || e.factor >= 1.8 || (e.vr >= 0.8 / e.factor), C: (e) => e.vr >= 0.8 / e.factor || e.vr >= 0.8 * e.r * 0 + (e.factor <= 0.3 ? 1.5 / e.factor / 2 : 99), D: (e) => (e.factor <= 0.55 && e.vr >= 0.5 / e.factor) || (e.factor > 0.55 && e.factor < 1 && e.vr >= 0.9 / e.factor) || e.factor >= 1.8 };
const RULE = RULES[process.env.RULE || "B"];
function heuristic(s) {
  const ev = [];
  for (let i = 1; i < s.c.length; i++) {
    if (s.d[i] - s.d[i - 1] > 7) continue;
    const r = s.c[i] / s.c[i - 1];
    if (!(r < 0.78 || r > 1.28)) continue;
    let best = null;
    for (const k of CAND) { const e = Math.abs(r / k - 1); if (e < 0.06 && (best === null || e < best.e)) best = { k, e }; }
    if (best) { const vb = med(s.v.slice(Math.max(0, i - 20), i)), va = med(s.v.slice(i, i + 20)); ev.push({ i, dt: s.dt[i], factor: best.k, r, vr: vb > 0 ? va / vb : NaN }); }
  }
  return ev;
}
// ---- PR actions
const acts = JSON.parse(fs.readFileSync(`${OUT}/actions_pr.json`, 'utf8'));
const pr = new Map(); for (const a of acts) { if ((a.type === 'split' || a.type === 'bonus') && a.ratio) { (pr.get(a.symbol) ?? pr.set(a.symbol, []).get(a.symbol)).push({ dt: a.exDate, factor: a.ratio.denominator / a.ratio.numerator, type: a.type }); } }
const other = new Map(); for (const a of acts) if (['merger', 'demerger', 'arrangement', 'capital_reduction'].includes(a.type)) (other.get(a.symbol) ?? other.set(a.symbol, []).get(a.symbol)).push(a.exDate);
const apiActs = fs.existsSync(OUT + "/actions_api.json") ? JSON.parse(fs.readFileSync(OUT + "/actions_api.json", "utf8")) : [];
const api = new Map(); for (const a of apiActs) if ((a.type === "split" || a.type === "bonus") && a.ratio && a.exDate >= "2006-01-02" && a.exDate < "2010-01-02") (api.get(a.symbol) ?? api.set(a.symbol, []).get(a.symbol)).push({ dt: a.exDate, factor: a.ratio.denominator / a.ratio.numerator });
const anyDates = new Map(); for (const a of [...acts, ...apiActs]) (anyDates.get(a.symbol) ?? anyDates.set(a.symbol, new Set()).get(a.symbol)).add(a.exDate);
// coverage test: share of strong one-day price drops (factor <= 0.55) that have ANY action recorded within 3 days, by year
const cov = {}; for (const [sym, s] of S) for (const e of heuristic(s)) { if (!(e.factor <= 0.55)) continue; const y = e.dt.slice(0, 4); if (y < "2003" || y > "2013") continue; const c = (cov[y] ??= { strong: 0, explained: 0 }); c.strong++; if ([...(anyDates.get(sym) ?? [])].some((d) => Math.abs(dayNo(d) - dayNo(e.dt)) <= 3)) c.explained++; }
console.log("coverage of strong price drops by recorded actions:", Object.entries(cov).map(([y, c]) => y + ":" + c.explained + "/" + c.strong).join(" "));
// ---- validation of the heuristic rules on 2010+ against PR (ground truth)
const allActDates = new Map(); for (const a of acts) { (allActDates.get(a.symbol) ?? allActDates.set(a.symbol, new Set()).get(a.symbol)).add(a.exDate); }
const cache = new Map(); for (const [sym, s] of S) cache.set(sym, heuristic(s));
for (const [rn, rf] of Object.entries({ ALL: () => true, A: RULES.A, B: RULES.B, D: RULES.D })) {
  let tp = 0, fp = 0, fn = 0, other_ = 0;
  for (const [sym] of S) {
    const h = cache.get(sym).filter((e) => e.dt >= WS_ && rf(e)); const truth = (pr.get(sym) ?? []).filter((e) => e.dt >= WS_ && (e.factor <= 0.78 || e.factor >= 1.28)); const used = new Set();
    for (const e of h) { const t = truth.find((x) => Math.abs(dayNo(x.dt) - dayNo(e.dt)) <= 3 && Math.abs(x.factor / e.factor - 1) < 0.08); if (t) { tp++; used.add(t); } else if ([...(allActDates.get(sym) ?? [])].some((d) => Math.abs(dayNo(d) - dayNo(e.dt)) <= 3)) other_++; else fp++; }
    for (const t of truth) if (!used.has(t)) fn++;
  }
  console.log('rule', rn, 'TP', tp, 'FP', fp, 'sameDayOtherAction', other_, 'FN', fn, '| precision', (tp / (tp + fp + other_)).toFixed(3), 'recall', (tp / (tp + fn)).toFixed(3));
}
// ---- final adjustment: PR for >= 2010-01-02, heuristic for earlier
let nPr = 0, nHeur = 0, nApi = 0;
for (const [sym, s] of S) {
  const n = s.c.length; const f = new Array(n).fill(1);
  const place = (dt, factor) => { let i = s.dt.findIndex((x) => x >= dt); if (i > 0) f[i] *= factor; return i > 0; };
  for (const e of pr.get(sym) ?? []) if (e.dt >= WS_ && place(e.dt, e.factor)) nPr++;
  for (const e of api.get(sym) ?? []) if (place(e.dt, e.factor)) nApi++;
  for (const e of cache.get(sym).filter(RULE)) if (e.dt < WS_) { f[e.i] *= e.factor; nHeur++; }
  s.a = new Array(n); let cum = 1; for (let i = n - 1; i >= 0; i--) { s.a[i] = s.c[i] * cum; cum *= f[i]; }
  s.f = f;
}
if (process.env.WIN) { for (const s of S.values()) { const k = s.dt.findIndex((x) => x >= WS_); if (k < 0) { for (const key of ['dt','d','c','v','a','sr']) s[key] = []; continue; } for (const key of ['dt','d','c','v','a','sr']) s[key] = s[key].slice(k); } }
console.log('applied: API splits/bonuses 2006-09', nApi, '| PR splits/bonuses', nPr, '| heuristic (pre-2010)', nHeur);
// known cases
const show = (sym, a, b) => { const s = S.get(sym); if (!s) return; const out = []; for (let i = 0; i < s.dt.length; i++) if (s.dt[i] >= a && s.dt[i] <= b && out.length < 3) out.push(`${s.dt[i]} raw=${(s.c[i]/100).toFixed(2)} adj=${(s.a[i]/100).toFixed(2)}`); console.log(sym, out.join(' | ')); };
show('RELIANCE', '2017-09-06', '2017-09-08'); show('WIPRO', '1995-01-02', '1995-01-05'); show('INFY', '1998-01-02', '1998-01-05'); show('HDFCBANK', '1996-06-03', '1996-06-05');
// ---- stocks with a suspected pre-2010 split/bonus (any one-day move beyond -22%/+28%, unexplained) are set aside
const suspect = new Set();
for (const [sym, s] of S) if (!process.env.WS) for (let i = 1; i < s.c.length; i++) { if (s.dt[i] >= WS_) break; if (s.d[i] - s.d[i - 1] > 7) continue; const r = s.c[i] / s.c[i - 1]; if (r < 0.78 || r > 1.28) { suspect.add(sym); break; } }
console.log('stocks set aside for a suspected pre-2010 split/bonus:', suspect.size);
// ---- downfall count (absolute, price only)
const rows = []; let cens = 0;
for (const [sym, s] of S) {
  const n = s.c.length; if (n < 250 || suspect.has(sym)) continue;
  let pk = 0, pki = 0, best = { dd: 0 };
  for (let i = 0; i < n; i++) { if (s.a[i] > pk) { pk = s.a[i]; pki = i; } const dd = 1 - s.a[i] / pk; if (dd > best.dd) best = { dd, pki, ti: i }; }
  if (best.dd < 0.7) continue;
  if (best.pki < 60 && s.dt[0] <= '1994-12-31') { cens++; continue; }
  // unrecovered: after the trough never regained 50% of the peak, and last price still <= 40% of peak
  let maxAfter = 0; for (let i = best.ti; i < n; i++) maxAfter = Math.max(maxAfter, s.a[i]); const unrec = maxAfter < 0.5 * pk && s.a[n - 1] <= 0.4 * pk;
  let maxDrop = 0; for (let i = 1; i < n; i++) if (s.d[i] - s.d[i - 1] <= 7) maxDrop = Math.min(maxDrop, s.a[i] / s.a[i - 1] - 1);
  rows.push({ sym, first: s.dt[0], last: s.dt.at(-1), peak: s.dt[best.pki], trough: s.dt[best.ti], dd: +best.dd.toFixed(3), unrec, maxDrop: +maxDrop.toFixed(2), other: (other.get(sym) ?? []).length, n });
}
const eligible = [...S].filter(([sym, s]) => s.c.length >= 250 && !suspect.has(sym)).length; console.log('left-censored peaks dropped', cens);
console.log('eligible', eligible, '| fell >=70%:', rows.length, '| unrecovered:', rows.filter((r) => r.unrec).length, '| unrecovered and no unexplained one-day drop worse than -35%:', rows.filter((r) => r.unrec && r.maxDrop > -0.35).length);
const byPeak = {}; for (const r of rows.filter((r) => r.unrec)) { const y = r.peak.slice(0, 4); byPeak[y] = (byPeak[y] ?? 0) + 1; } console.log('unrecovered by peak year', JSON.stringify(byPeak));
const delisted = rows.filter((r) => r.unrec && r.last < '2026-09-01').length; console.log('of unrecovered, stopped trading before Sep 2026:', delisted);
for (const k of ['ABAN', 'RELCAPITAL', 'DHFL', 'YESBANK', 'RPOWER', 'JISLJALEQS', 'RAYMOND', 'SIEMENS']) console.log(k, JSON.stringify(rows.find((r) => r.sym === k) ?? 'not a downfall'));
fs.writeFileSync(`${OUT}/downfalls_v2.json`, JSON.stringify(rows));
