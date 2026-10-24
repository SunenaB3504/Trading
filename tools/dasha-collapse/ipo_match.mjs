import fs from 'node:fs';
const D = process.env.OUT; const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const iso = (t) => { const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec((t || '').trim()); return m ? `${m[3]}-${String(MON[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };
const day = (d) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) / 86400000;
const norm = (n) => (n || '').toLowerCase().replace(/&amp;/g, '&').replace(/\b(limited|ltd|pvt|private|the|co|corporation|corp)\b/g, ' ').replace(/\(india\)|\bindia\b/g, ' ').replace(/[^a-z0-9]+/g, '');
const first = new Map(fs.readFileSync(`${D}/first_appearance.csv`, 'utf8').trim().split(/\r?\n/).map((l) => l.split(',')));
// name -> symbols
const names = new Map(); const addName = (nm, sym) => { const k = norm(nm); if (!k) return; (names.get(k) ?? names.set(k, new Set()).get(k)).add(sym); };
for (let y = 1995; y <= 2010; y++) for (const r of JSON.parse(fs.readFileSync(`${D}/ca/test_${y}.json`, 'utf8'))) addName(r.comp, r.symbol);
const el = fs.readFileSync(`${D}/EQUITY_L.csv`, 'utf8').trim().split(/\r?\n/).slice(1); for (const l of el) { const c = l.split(','); addName(c[1], c[0]); }
// IPO records
const recs = [];
const html = fs.readFileSync(`${D}/ipo/prior_to_2016.html`, 'utf8');
for (const m of html.matchAll(/<tr[\s\S]*?<\/tr>/g)) { const c = [...m[0].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/g)].map((x) => x[1].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim()); if (/^\d+$/.test(c[0]) && c.length >= 6) { const ld = iso(c[3]); if (ld) recs.push({ src: 'prior2016', name: c[1], listing: ld }); } }
const seen = new Set();
for (let y = 2016; y <= 2026; y++) for (const r of JSON.parse(fs.readFileSync(`${D}/ipo/api_${y}.json`, 'utf8'))) { const ld = iso(r.listingDate); if (!ld || !r.symbol) continue; const k = r.symbol + ld; if (seen.has(k)) continue; seen.add(k); recs.push({ src: 'api', name: r.company || r.companyName, symbol: r.symbol, listing: ld, type: r.securityType }); }
console.log('IPO records', recs.length, 'prior2016', recs.filter((r) => r.src === 'prior2016').length, 'api', recs.filter((r) => r.src === 'api').length, 'api SME', recs.filter((r) => r.type === 'SME').length);
const byYear = {}; for (const r of recs) byYear[r.listing.slice(0, 4)] = (byYear[r.listing.slice(0, 4)] || 0) + 1; console.log('IPO records by listing year', JSON.stringify(byYear));
// match to NSE first appearance
const verified = new Map(); let noName = 0, noDate = 0, notInData = 0;
for (const r of recs) {
  const cands = r.symbol ? [r.symbol] : [...(names.get(norm(r.name)) ?? [])];
  if (!cands.length) { noName++; continue; }
  const inData = cands.filter((s) => first.has(s)); if (!inData.length) { notInData++; continue; }
  const ok = inData.find((s) => Math.abs(day(first.get(s)) - day(r.listing)) <= 3);
  if (ok) verified.set(ok, { listing: r.listing, src: r.src, first: first.get(ok) }); else noDate++;
}
console.log('records: no name->symbol match', noName, '| symbol not in our data', notInData, '| first appearance differs >3 days', noDate, '| verified symbols', verified.size);
// apply to groups
const rows = JSON.parse(fs.readFileSync(`${D}/downfalls_v2.json`, 'utf8')); const clean = rows.filter((x) => x.unrec && x.maxDrop > -0.35); const unrec = rows.filter((x) => x.unrec);
const cnt = (arr) => arr.filter((x) => verified.has(x.sym)).length;
console.log('collapse (unrecovered)', unrec.length, 'verified', cnt(unrec), '| clean collapse', clean.length, 'verified', cnt(clean));
const early = clean.filter((x) => (first.get(x.sym) || '9') < '2007-01-05'), late = clean.filter((x) => (first.get(x.sym) || '9') >= '2007-01-05');
console.log('clean collapse first seen before window', early.length, 'verified', cnt(early), '| first seen in window', late.length, 'verified', cnt(late));
const vy = {}; for (const x of clean) if (verified.has(x.sym)) { const y = verified.get(x.sym).listing.slice(0, 4); vy[y] = (vy[y] || 0) + 1; } console.log('verified clean collapse by listing year', JSON.stringify(vy));
const ly = {}; for (const x of late) if (!verified.has(x.sym)) { const y = first.get(x.sym).slice(0, 4); ly[y] = (ly[y] || 0) + 1; } console.log('clean collapse first seen in window but NOT verified, by first-appearance year', JSON.stringify(ly));
// control: share of all in-window first-appearance stocks verified
const allLate = [...first].filter(([, d]) => d >= '2007-01-05'); console.log('all stocks first seen in window', allLate.length, 'verified', allLate.filter(([s]) => verified.has(s)).length);
fs.writeFileSync(`${D}/ipo_verified.json`, JSON.stringify([...verified].map(([s, v]) => ({ sym: s, ...v }))));
