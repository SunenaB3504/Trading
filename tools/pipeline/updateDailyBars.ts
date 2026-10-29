/**
 * tools/pipeline/updateDailyBars.ts
 * Automated tool to pull latest daily market candles from Yahoo Finance (NSE)
 * and update packages/simulator/src/core/data/fixtures/historicalBars.json.
 * 
 * Computes exact daily_return, adj_close_index, rolling_peak, and drawdown metrics.
 * Safe to run multiple times: skips dates already present.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface DailyBar {
  symbol: string;
  date: string;
  close: number;
  prev_close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  daily_return: number;
  adj_close_index: number;
  rolling_peak: number;
  drawdown: number;
  is_macro_crisis: boolean;
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      meta: { symbol: string };
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: (number | null)[];
          high: (number | null)[];
          low: (number | null)[];
          close: (number | null)[];
          volume: (number | null)[];
        }>;
      };
    }> | null;
    error: unknown;
  };
}

const HISTORICAL_BARS_PATH = resolve(
  process.cwd(),
  'packages/simulator/src/core/data/fixtures/historicalBars.json'
);

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function toDateString(timestampSeconds: number): string {
  // IST offset is UTC+5:30 (19800 seconds)
  const istDate = new Date((timestampSeconds + 19800) * 1000);
  return istDate.toISOString().slice(0, 10);
}

async function fetchYahooSeries(symbol: string): Promise<{
  dates: string[];
  opens: number[];
  highs: number[];
  lows: number[];
  closes: number[];
  volumes: number[];
}> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=1mo`;
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!res.ok) {
    throw new Error(`Yahoo returned status ${res.status} for ${symbol}`);
  }
  const data = (await res.json()) as YahooChartResponse;
  const result = data.chart.result?.[0];
  if (!result || !result.timestamp || !result.indicators.quote[0]) {
    throw new Error(`Empty chart response for ${symbol}`);
  }

  const quote = result.indicators.quote[0];
  const dates: string[] = [];
  const opens: number[] = [];
  const highs: number[] = [];
  const lows: number[] = [];
  const closes: number[] = [];
  const volumes: number[] = [];

  for (let i = 0; i < result.timestamp.length; i++) {
    const o = quote.open[i];
    const h = quote.high[i];
    const l = quote.low[i];
    const c = quote.close[i];
    const v = quote.volume[i] ?? 0;

    if (c != null && c > 0) {
      const closeVal = Number(c.toFixed(2));
      const openVal = o != null && o > 0 ? Number(o.toFixed(2)) : closeVal;
      const highVal = h != null && h > 0 ? Number(h.toFixed(2)) : Math.max(openVal, closeVal);
      const lowVal = l != null && l > 0 ? Number(l.toFixed(2)) : Math.min(openVal, closeVal);

      dates.push(toDateString(result.timestamp[i]!));
      opens.push(openVal);
      highs.push(highVal);
      lows.push(lowVal);
      closes.push(closeVal);
      volumes.push(Math.round(v));
    }
  }

  return { dates, opens, highs, lows, closes, volumes };
}

export async function updateDailyBars(): Promise<{ addedTotal: number; latestDate: string }> {
  console.log(`Loading current historical bars from ${HISTORICAL_BARS_PATH}...`);
  const rawJson = readFileSync(HISTORICAL_BARS_PATH, 'utf-8');
  const marketData = JSON.parse(rawJson) as Record<string, DailyBar[]>;

  const symbols = Object.keys(marketData);
  let addedTotal = 0;
  let overallLatestDate = '';

  for (const sym of symbols) {
    const bars = marketData[sym] ?? [];
    if (bars.length === 0) continue;

    const lastBar = bars[bars.length - 1]!;
    const lastDate = lastBar.date;
    console.log(`[${sym}] Last stored date: ${lastDate} (close: ₹${lastBar.close})`);

    try {
      const yahoo = await fetchYahooSeries(sym);
      let runningLastBar = lastBar;
      let symAdded = 0;

      for (let i = 0; i < yahoo.dates.length; i++) {
        const d = yahoo.dates[i]!;
        if (d > lastDate) {
          const close = yahoo.closes[i]!;
          const prevClose = runningLastBar.close;
          const rawReturn = (close - prevClose) / prevClose;
          const dailyReturn = Number(rawReturn.toFixed(4));
          const adjCloseIndex = Number((runningLastBar.adj_close_index * (1 + rawReturn)).toFixed(4));
          const rollingPeak = Number(Math.max(runningLastBar.rolling_peak, adjCloseIndex).toFixed(4));
          const drawdown = Number(((adjCloseIndex - rollingPeak) / rollingPeak).toFixed(4));

          const newBar: DailyBar = {
            symbol: sym,
            date: d,
            close,
            prev_close: prevClose,
            open: yahoo.opens[i]!,
            high: yahoo.highs[i]!,
            low: yahoo.lows[i]!,
            volume: yahoo.volumes[i]!,
            daily_return: dailyReturn,
            adj_close_index: adjCloseIndex,
            rolling_peak: rollingPeak,
            drawdown,
            is_macro_crisis: false,
          };

          bars.push(newBar);
          runningLastBar = newBar;
          symAdded++;
          if (d > overallLatestDate) overallLatestDate = d;
        }
      }

      addedTotal += symAdded;
      const latestSymDate = bars[bars.length - 1]!.date;
      console.log(`[${sym}] Added ${symAdded} new sessions -> Up to ${latestSymDate} (close: ₹${runningLastBar.close})`);
    } catch (err) {
      console.error(`[${sym}] Failed to fetch updates:`, err instanceof Error ? err.message : err);
    }
  }

  if (addedTotal > 0) {
    console.log(`Saving ${addedTotal} new bars across ${symbols.length} symbols...`);
    writeFileSync(HISTORICAL_BARS_PATH, JSON.stringify(marketData, null, 2), 'utf-8');
    console.log(`Successfully updated historicalBars.json up to ${overallLatestDate}.`);
  } else {
    console.log('All symbols are already up-to-date. No new sessions added.');
  }

  return { addedTotal, latestDate: overallLatestDate };
}

if (process.argv[1]?.includes('updateDailyBars')) {
  updateDailyBars().catch((e) => {
    console.error('Update script failed:', e);
    process.exit(1);
  });
}

