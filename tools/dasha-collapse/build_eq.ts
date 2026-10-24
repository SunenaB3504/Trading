import fs from 'node:fs';
import { FileRawStore } from 'C:/Users/Admin/Sunil/Trading/packages/data-service/src/store/rawStore';
import { parseBhavcopyLegacy, parseBhavcopyUdiff } from 'C:/Users/Admin/Sunil/Trading/packages/data-service/src/providers/bhavcopy';
import { unzipFirst } from 'C:/Users/Admin/Sunil/Trading/packages/data-service/src/providers/zip';
(async () => {
  const store = new FileRawStore('data/raw/nse-bars');
  const recs = (await store.list()).filter((r) => (r.urlClass === 'bhavcopy-legacy' || r.urlClass === 'bhavcopy-udiff') && r.status === 200 && r.bytes > 0);
  const byDate = new Map<string, (typeof recs)[number]>();
  for (const r of recs) { const d = r.params.date as string; const have = byDate.get(d); if (have === undefined || (have.urlClass === 'bhavcopy-udiff' && r.urlClass === 'bhavcopy-legacy')) byDate.set(d, r); }
  const dates = [...byDate.keys()].sort();
  const out = fs.createWriteStream(`${process.env.OUT}/eq_daily.csv`);
  out.write('symbol,date,series,close,prev,volume,isin\n');
  const dec = new TextDecoder(); let n = 0, skippedTotal = 0;
  for (const d of dates) {
    const r = byDate.get(d)!; const body = await store.get(r.checksum); if (body === null) continue;
    const text = dec.decode(unzipFirst(body).data);
    const p = r.urlClass === 'bhavcopy-legacy' ? parseBhavcopyLegacy(text) : parseBhavcopyUdiff(text);
    skippedTotal += p.skipped.length;
    for (const row of p.rows) if (row.series === 'EQ' || row.series === 'BE') { out.write(`${row.symbol},${d},${row.series},${row.close},${row.prevClose ?? ''},${row.volume},${row.isin ?? ''}\n`); n++; }
    if (++ (globalThis as any).k % 500 === 0 || false) console.log(d, n);
  }
  out.end(); console.log('done', dates.length, 'sessions', n, 'rows', 'skipped', skippedTotal);
})();
(globalThis as any).k = 0;
