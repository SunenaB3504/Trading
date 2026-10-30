/**
 * packages/simulator/scripts/syncNseBhavcopy.ts
 * Ingests official daily NSE Capital Market Bhavcopy (UDiFF format)
 * and reconciles universe closing prices with 100% authentic market data.
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRICES_PATH = path.resolve(__dirname, '../src/core/data/fixtures/nifty500Prices.json');

async function downloadBhavcopyZip(dateStr: string, destZip: string): Promise<boolean> {
  const yyyymmdd = dateStr.replace(/-/g, '');
  const url = `https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_${yyyymmdd}_F_0000.csv.zip`;

  return new Promise((resolve) => {
    const file = fs.createWriteStream(destZip);
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } }, (res) => {
      if (res.statusCode !== 200) {
        file.close();
        fs.rmSync(destZip, { force: true });
        resolve(false);
        return;
      }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve(true);
      });
    });
    req.on('error', () => {
      file.close();
      fs.rmSync(destZip, { force: true });
      resolve(false);
    });
  });
}

function getPreviousDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00+05:30`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0] ?? dateStr;
}

export async function syncNsePrices(targetDate = '2026-10-28'): Promise<void> {
  console.log(`[BhavcopySync] Starting NSE Bhavcopy ingestion for target session: ${targetDate}`);

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nse_bhavcopy_'));
  const zipPath = path.join(tempDir, 'bhavcopy.zip');

  let activeDate = targetDate;
  let downloaded = false;

  // Try target date and fallback up to 5 prior days for weekends/holidays
  for (let attempt = 0; attempt < 5; attempt++) {
    console.log(`[BhavcopySync] Attempting download for ${activeDate}...`);
    downloaded = await downloadBhavcopyZip(activeDate, zipPath);
    if (downloaded) {
      console.log(`[BhavcopySync] Successfully downloaded Bhavcopy for ${activeDate}`);
      break;
    }
    console.log(`[BhavcopySync] Session ${activeDate} not available (holiday/weekend), trying previous day...`);
    activeDate = getPreviousDate(activeDate);
  }

  if (!downloaded) {
    console.error(`[BhavcopySync] Failed to locate Bhavcopy archive for ${targetDate} or prior sessions.`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  // Extract using system tar
  try {
    execSync(`tar -xf "${zipPath}" -C "${tempDir}"`);
  } catch (err) {
    console.error(`[BhavcopySync] Extraction failed:`, err);
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  const extractedFiles = fs.readdirSync(tempDir).filter((f) => f.startsWith('BhavCopy') && f.endsWith('.csv'));
  if (extractedFiles.length === 0) {
    console.error(`[BhavcopySync] No CSV found inside zip archive.`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  const csvPath = path.join(tempDir, extractedFiles[0]!);
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const lines = csvContent.split('\n').filter((l) => l.trim().length > 0);

  const header = lines[0]!.split(',');
  const symbIdx = header.indexOf('TckrSymb');
  const srsIdx = header.indexOf('SctySrs');
  const clsIdx = header.indexOf('ClsPric');

  if (symbIdx === -1 || clsIdx === -1) {
    console.error(`[BhavcopySync] Required columns not found in Bhavcopy CSV.`);
    fs.rmSync(tempDir, { recursive: true, force: true });
    process.exit(1);
  }

  // Parse NSE closes
  const nseCloses: Record<string, number> = {};
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i]!.split(',');
    const sym = parts[symbIdx]?.trim();
    const srs = parts[srsIdx]?.trim();
    const clsStr = parts[clsIdx]?.trim();

    if (!sym || !clsStr) continue;
    // Strictly accept valid equity series (EQ preferred, followed by BE, SM, ST; reject debt/SGBs)
    const VALID_EQUITY_SERIES = ['EQ', 'BE', 'SM', 'ST'];
    if (srs && VALID_EQUITY_SERIES.includes(srs)) {
      const cls = parseFloat(clsStr);
      if (!isNaN(cls) && cls > 0) {
        if (!nseCloses[sym] || srs === 'EQ') {
          nseCloses[sym] = cls;
        }
      }
    }
  }

  console.log(`[BhavcopySync] Extracted ${Object.keys(nseCloses).length} authentic equity closes from NSE.`);

  // Load existing database
  const currentPrices = JSON.parse(fs.readFileSync(PRICES_PATH, 'utf8')) as Record<string, number>;
  let updatedCount = 0;
  const majorFixes: Array<{ symbol: string; oldPrice: number; newPrice: number }> = [];

  for (const [sym, newPrice] of Object.entries(nseCloses)) {
    if (sym in currentPrices) {
      const oldPrice = currentPrices[sym]!;
      if (Math.abs(oldPrice - newPrice) > 0.05) {
        if (Math.abs(oldPrice - newPrice) / (newPrice || 1) > 0.5) {
          majorFixes.push({ symbol: sym, oldPrice, newPrice });
        }
        currentPrices[sym] = newPrice;
        updatedCount++;
      }
    } else {
      // Add missing NSE stock
      currentPrices[sym] = newPrice;
      updatedCount++;
    }
  }

  // Write updated prices
  fs.writeFileSync(PRICES_PATH, JSON.stringify(currentPrices, null, 2) + '\n', 'utf8');

  console.log(`[BhavcopySync] Updated ${updatedCount} stock prices in nifty500Prices.json!`);
  console.log(`[BhavcopySync] Sample of prominent audit corrections:`);
  for (const fix of majorFixes.slice(0, 15)) {
    console.log(`  - ${fix.symbol.padEnd(12)}: ₹${fix.oldPrice.toFixed(2)} → ₹${fix.newPrice.toFixed(2)}`);
  }

  // Clean up temp
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`[BhavcopySync] Complete! Database successfully synchronized with official NSE closes.`);
}

// Execute when run directly
const target = process.argv[2] ?? '2026-10-28';
void syncNsePrices(target);

