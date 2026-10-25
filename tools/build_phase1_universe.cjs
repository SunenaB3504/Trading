const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 1. Load AMFI market cap classifications
const amfiMap = new Map();
const amfiPath = path.join(__dirname, '../data/amfi/avg_mcap_2026H1.csv');
if (fs.existsSync(amfiPath)) {
  const amfiLines = fs.readFileSync(amfiPath, 'utf8').trim().split('\n');
  for (let i = 1; i < amfiLines.length; i++) {
    const parts = amfiLines[i].split(',');
    if (parts.length >= 7) {
      const isin = parts[2].trim();
      const nseSym = parts[4].trim().toUpperCase();
      const cat = parts[6].trim();
      if (isin) amfiMap.set(isin, cat);
      if (nseSym && nseSym !== '-') amfiMap.set('SYM:' + nseSym, cat);
    }
  }
}

// 2. Load IPO verified records
const ipoMap = new Map();
const ipoDir = path.join(__dirname, '../data/raw/nse-ipo-lists');

// Load ipo_verified.json
const verifiedPath = path.join(ipoDir, 'ipo_verified.json');
if (fs.existsSync(verifiedPath)) {
  const verified = JSON.parse(fs.readFileSync(verifiedPath, 'utf8'));
  for (const v of verified) {
    if (v.sym) {
      ipoMap.set(v.sym.trim().toUpperCase(), {
        source: v.src || 'ipo_verified',
        listingDate: v.listing
      });
    }
  }
}

// Load api_2016.json to api_2026.json
for (let y = 2016; y <= 2026; y++) {
  const f = path.join(ipoDir, `api_${y}.json`);
  if (fs.existsSync(f)) {
    const data = JSON.parse(fs.readFileSync(f, 'utf8'));
    const arr = Array.isArray(data) ? data : Object.values(data);
    for (const item of arr) {
      if (item && item.symbol) {
        const sym = item.symbol.trim().toUpperCase();
        if (!ipoMap.has(sym)) {
          ipoMap.set(sym, {
            source: `api_${y}`,
            listingDate: item.listingDate
          });
        }
      }
    }
  }
}

// Helper date converter: '06-OCT-2008' -> '2008-10-06'
const months = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12'
};

function parseDate(str) {
  if (!str) return '';
  const parts = str.trim().split('-');
  if (parts.length === 3) {
    const d = parts[0].padStart(2, '0');
    const m = months[parts[1].toUpperCase()];
    const y = parts[2];
    if (m && y) return `${y}-${m}-${d}`;
  }
  return str;
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// 3. Process EQUITY_L.csv
const equityPath = path.join(ipoDir, 'EQUITY_L.csv');
const equityLines = fs.readFileSync(equityPath, 'utf8').trim().split('\n');

const outRows = [];
let pureIpoCount = 0;
let legacyCount = 0;

for (let i = 1; i < equityLines.length; i++) {
  const line = equityLines[i].trim();
  if (!line) continue;
  const cols = parseCSVLine(line);
  const symbol = cols[0];
  const companyName = cols[1];
  const series = cols[2];
  const listingDateRaw = cols[3];
  const isin = cols[6];

  const listingDateIso = parseDate(listingDateRaw);
  const ipoInfo = ipoMap.get(symbol.toUpperCase());
  const isPureNseIpo = Boolean(ipoInfo);

  if (isPureNseIpo) {
    pureIpoCount++;
  } else {
    legacyCount++;
  }

  const mcapCat = amfiMap.get(isin) || amfiMap.get('SYM:' + symbol.toUpperCase()) || 'Unclassified';
  const ipoSource = ipoInfo ? ipoInfo.source : 'legacy_admission';

  outRows.push({
    symbol,
    company_name: companyName,
    isin,
    series,
    listing_date: listingDateIso,
    market_cap_bucket: mcapCat,
    is_pure_nse_ipo: isPureNseIpo ? 'TRUE' : 'FALSE',
    ipo_source: ipoSource
  });
}

// Sort chronologically by listing_date, then symbol
outRows.sort((a, b) => {
  if (a.listing_date !== b.listing_date) {
    return a.listing_date.localeCompare(b.listing_date);
  }
  return a.symbol.localeCompare(b.symbol);
});

// 4. Write output files
const outDir = path.join(__dirname, '../data/derived/jathakam-dasha-study');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const csvHeader = 'symbol,company_name,isin,series,listing_date,market_cap_bucket,is_pure_nse_ipo,ipo_source';
const csvContent = [
  csvHeader,
  ...outRows.map(r => 
    `"${r.symbol}","${r.company_name.replace(/"/g, '""')}","${r.isin}","${r.series}","${r.listing_date}","${r.market_cap_bucket}","${r.is_pure_nse_ipo}","${r.ipo_source}"`
  )
].join('\n') + '\n';

const outCsvPath = path.join(outDir, 'phase1_universe.csv');
fs.writeFileSync(outCsvPath, csvContent, 'utf8');

// SHA-256
const hash = crypto.createHash('sha256').update(csvContent).digest('hex');
const outHashPath = path.join(outDir, 'phase1_universe.sha256');
fs.writeFileSync(outHashPath, `${hash}  phase1_universe.csv\n`, 'utf8');

console.log('Successfully generated phase1_universe.csv');
console.log('Total records:', outRows.length);
console.log('Pure NSE IPOs:', pureIpoCount);
console.log('Legacy / Secondary admissions:', legacyCount);
console.log('SHA-256:', hash);
