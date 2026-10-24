import fs from 'node:fs';
import { classify } from 'C:/Users/Admin/Sunil/Trading/packages/data-service/src/corporate/nseActions';
const D = `${process.env.OUT}/ca`; const MON: Record<string, string> = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };
const iso = (t: string): string | null => { const m = /^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/.exec((t ?? '').trim()); return m && MON[m[2] as string] ? `${m[3]}-${MON[m[2] as string]}-${(m[1] as string).padStart(2, '0')}` : null; };
const out: any[] = []; const perYear: Record<string, { rows: number; splitBonus: number; undated: number }> = {}; const types: Record<string, number> = {}; const subjectsUnread: Record<string, number> = {};
for (let y = 1995; y <= 2010; y++) {
  const rows = JSON.parse(fs.readFileSync(`${D}/test_${y}.json`, 'utf8')) as any[]; const e = (perYear[y] = { rows: rows.length, splitBonus: 0, undated: 0 });
  for (const r of rows) {
    const c = classify(String(r.subject ?? '')); if (!c) { if (/split|bonus|spl|bon/i.test(r.subject)) subjectsUnread[r.subject] = (subjectsUnread[r.subject] ?? 0) + 1; continue; }
    types[c.type] = (types[c.type] ?? 0) + 1;
    if (c.type !== 'split' && c.type !== 'bonus' && !['merger', 'demerger', 'arrangement', 'capital_reduction', 'rights'].includes(c.type)) continue;
    const ex = iso(r.exDate); if (!ex) { e.undated++; continue; }
    out.push({ symbol: r.symbol, isin: r.isin, exDate: ex, type: c.type, ratio: c.ratio, subject: r.subject }); if (c.type === 'split' || c.type === 'bonus') e.splitBonus++;
  }
}
console.log('per year', JSON.stringify(perYear)); console.log('types', JSON.stringify(types));
console.log('unreadable split/bonus-like subjects', Object.entries(subjectsUnread).sort((a, b) => b[1] - a[1]).slice(0, 12));
fs.writeFileSync(`${process.env.OUT}/actions_api.json`, JSON.stringify(out));
// cross-check 2010 against PR files
const pr = JSON.parse(fs.readFileSync(`${process.env.OUT}/actions_pr.json`, 'utf8')) as any[];
const prSet = pr.filter((a) => (a.type === 'split' || a.type === 'bonus') && a.exDate >= '2010-01-02' && a.exDate <= '2010-12-31');
const apiSet = out.filter((a) => (a.type === 'split' || a.type === 'bonus') && a.exDate >= '2010-01-02' && a.exDate <= '2010-12-31');
const key = (a: any) => `${a.symbol}|${a.exDate}`; const A = new Map(apiSet.map((a) => [key(a), a]));
let both = 0, ratioOk = 0; for (const p of prSet) { const a = A.get(key(p)); if (a) { both++; if (a.ratio && p.ratio && Math.abs(a.ratio.numerator / a.ratio.denominator / (p.ratio.numerator / p.ratio.denominator) - 1) < 0.01) ratioOk++; } }
console.log('2010: PR split/bonus', prSet.length, 'API', apiSet.length, 'same symbol+exdate in both', both, 'with same ratio', ratioOk);
