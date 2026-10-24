import fs from 'node:fs';
import { FileRawStore } from 'C:/Users/Admin/Sunil/Trading/packages/data-service/src/store/rawStore';
import { loadActions } from 'C:/Users/Admin/Sunil/Trading/packages/data-service/src/jobs/barPuller';
(async () => {
  const store = new FileRawStore('data/raw/nse-bars');
  const acts = await loadActions(store);
  const by: Record<string, number> = {}; for (const a of acts) by[a.type] = (by[a.type] ?? 0) + 1;
  console.log('actions', acts.length, JSON.stringify(by));
  const dates = acts.map((a) => a.exDate).sort(); console.log('ex-date range', dates[0], dates.at(-1));
  const yr: Record<string, number> = {}; for (const a of acts) if (a.type === 'split' || a.type === 'bonus') yr[a.exDate.slice(0, 4)] = (yr[a.exDate.slice(0, 4)] ?? 0) + 1; console.log('split+bonus by year', JSON.stringify(yr));
  fs.writeFileSync(`${process.env.OUT}/actions_pr.json`, JSON.stringify(acts));
  for (const s of ['RELIANCE', 'WIPRO', 'ABAN', 'INFY']) console.log(s, JSON.stringify(acts.filter((a) => a.symbol === s && (a.type === 'split' || a.type === 'bonus')).map((a) => [a.exDate, a.type, a.ratio && `${a.ratio.numerator}:${a.ratio.denominator}`])));
})();
