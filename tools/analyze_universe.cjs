const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../data/derived/jathakam-dasha-study/phase1_universe.csv');
const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');

function parseLine(line) {
  const result = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') inQ = !inQ;
    else if (line[i] === ',' && !inQ) { result.push(cur.trim()); cur = ''; }
    else cur += line[i];
  }
  result.push(cur.trim());
  return result;
}

const pure = [];
for (let i = 1; i < lines.length; i++) {
  const cols = parseLine(lines[i]);
  if (cols[6] === 'TRUE') pure.push(cols);
}

// 1. By Year
const byYear = {};
const bySeries = {};
const byMcap = {};
const largeNames = [];
const midNames = [];

for (const r of pure) {
  const sym = r[0];
  const name = r[1];
  const series = r[3];
  const date = r[4];
  const yr = date.substring(0, 4);
  const mcap = r[5];

  byYear[yr] = (byYear[yr] || 0) + 1;
  bySeries[series] = (bySeries[series] || 0) + 1;
  byMcap[mcap] = (byMcap[mcap] || 0) + 1;

  if (mcap === 'Large Cap') largeNames.push(`${sym} (${name}, ${yr})`);
  if (mcap === 'Mid Cap') midNames.push(`${sym} (${name}, ${yr})`);
}

console.log('--- SUMMARY STATS ---');
console.log('TOTAL_PURE_IPOS:', pure.length);
console.log('EARLIEST_IPO:', pure[0][4], `(${pure[0][0]})`);
console.log('LATEST_IPO:', pure[pure.length - 1][4], `(${pure[pure.length - 1][0]})`);

console.log('\n--- BY MARKET CAP ---');
for (const [k, v] of Object.entries(byMcap)) {
  const pct = ((v / pure.length) * 100).toFixed(1);
  console.log(`- ${k}: ${v} (${pct}%)`);
}

console.log('\n--- BY TRADING SERIES ---');
for (const [k, v] of Object.entries(bySeries)) {
  console.log(`- Series ${k}: ${v}`);
}

console.log('\n--- BY YEAR (ANNUAL COHORT SIZES) ---');
for (const [yr, cnt] of Object.entries(byYear)) {
  console.log(`- ${yr}: ${cnt} listings`);
}

console.log('\n--- ALL 19 LARGE CAP STOCKS ---');
for (const n of largeNames) {
  console.log(`- ${n}`);
}

console.log(`\n--- SAMPLE MID CAP STOCKS (${midNames.length} total) ---`);
for (const n of midNames.slice(0, 20)) {
  console.log(`- ${n}`);
}
