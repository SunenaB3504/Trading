const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '../data/derived/jathakam-dasha-study/phase1_universe.csv');
const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += char;
  }
  result.push(current.trim());
  return result;
}

const pure = [];
const legacy = [];

for (let i = 1; i < lines.length; i++) {
  const cols = parseCSVLine(lines[i]);
  const isPure = cols[6] === 'TRUE';
  if (isPure) pure.push(cols);
  else legacy.push(cols);
}

console.log('TOTAL_RECORDS:', lines.length - 1);
console.log('PURE_NSE_IPOS:', pure.length);
console.log('LEGACY_ADMISSIONS:', legacy.length);
console.log('DATE_START:', pure[0][4]);
console.log('DATE_END:', pure[pure.length - 1][4]);

const mcap = {};
for (const p of pure) {
  mcap[p[5]] = (mcap[p[5]] || 0) + 1;
}
console.log('MCAP_BREAKDOWN:', JSON.stringify(mcap));

const decades = { '1994-1999': 0, '2000-2009': 0, '2010-2019': 0, '2020-2026': 0 };
for (const p of pure) {
  const y = parseInt(p[4].substring(0, 4), 10);
  if (y <= 1999) decades['1994-1999']++;
  else if (y <= 2009) decades['2000-2009']++;
  else if (y <= 2019) decades['2010-2019']++;
  else decades['2020-2026']++;
}
console.log('DECADES:', JSON.stringify(decades));

console.log('\nEARLIEST_10:');
for (const p of pure.slice(0, 10)) {
  console.log(`- **${p[0]}** (${p[1]}): Listed on ${p[4]} | ${p[5]}`);
}

const medIdx = Math.floor(pure.length / 2) - 5;
console.log('\nMEDIAN_10:');
for (const p of pure.slice(medIdx, medIdx + 10)) {
  console.log(`- **${p[0]}** (${p[1]}): Listed on ${p[4]} | ${p[5]}`);
}

console.log('\nRECENT_10:');
for (const p of pure.slice(-10)) {
  console.log(`- **${p[0]}** (${p[1]}): Listed on ${p[4]} | ${p[5]}`);
}
