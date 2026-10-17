import type { BucketInputs, InstrumentFacts, RuleId } from '@trading/core';
import type { UniverseEntry, UniverseSource } from './types';

/**
 * A seeded universe of 16 real NSE names as they stood on 2025-10-16: series, price band and GSM stage
 * from NSE's security list, AMFI rank from the list for the six months to 2025-06-30, the sector tag
 * from the registered table, and that day's traded value from the exchange bhavcopy. History length,
 * missing sessions, provider coverage and mergers are NOT measured here and are assumed; volatility and
 * beta need price history and are unknown. The real universe arrives with WP-2.9.
 */
const AS_OF = '2025-10-16';

interface Row {
  symbol: string;
  name: string;
  isin: string | null;
  series: string;
  band: number | null;
  gsm: number | null;
  rank: number | null;
  turnoverLakh: number;
  sector: string | null;
}

const ROWS: Row[] = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries',
    isin: 'INE002A01018',
    series: 'EQ',
    band: null,
    gsm: null,
    rank: 1,
    turnoverLakh: 170846.36,
    sector: 'oil_gas_upstream_refining',
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank',
    isin: 'INE040A01034',
    series: 'EQ',
    band: null,
    gsm: null,
    rank: 2,
    turnoverLakh: 226906.16,
    sector: null,
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services',
    isin: 'INE467B01029',
    series: 'EQ',
    band: null,
    gsm: null,
    rank: 3,
    turnoverLakh: 96308.76,
    sector: null,
  },
  {
    symbol: 'INFY',
    name: 'Infosys',
    isin: 'INE009A01021',
    series: 'EQ',
    band: null,
    gsm: null,
    rank: 6,
    turnoverLakh: 117552.33,
    sector: null,
  },
  {
    symbol: 'AADHARHFC',
    name: 'Aadhar Housing Finance',
    isin: 'INE883F01010',
    series: 'EQ',
    band: 10,
    gsm: null,
    rank: 349,
    turnoverLakh: 2316.94,
    sector: null,
  },
  {
    symbol: '20MICRONS',
    name: '20 Microns',
    isin: 'INE144J01027',
    series: 'EQ',
    band: 20,
    gsm: null,
    rank: 1554,
    turnoverLakh: 91.04,
    sector: null,
  },
  {
    symbol: 'AXISCADES',
    name: 'Axiscades Technologies',
    isin: 'INE555B01013',
    series: 'BE',
    band: 5,
    gsm: null,
    rank: 834,
    turnoverLakh: 874.01,
    sector: null,
  },
  {
    symbol: 'BHARATGEAR',
    name: 'Bharat Gears',
    isin: 'INE561C01019',
    series: 'BE',
    band: 5,
    gsm: null,
    rank: 2610,
    turnoverLakh: 47.39,
    sector: null,
  },
  {
    symbol: 'CEREBRAINT',
    name: 'Cerebra Integrated Technologies',
    isin: 'INE345B01019',
    series: 'BZ',
    band: 5,
    gsm: null,
    rank: 2981,
    turnoverLakh: 23.16,
    sector: null,
  },
  {
    symbol: 'BLUECOAST',
    name: 'Blue Coast Hotels',
    isin: 'INE472B01011',
    series: 'BE',
    band: 5,
    gsm: null,
    rank: 3309,
    turnoverLakh: 2.44,
    sector: null,
  },
  {
    symbol: 'FEL',
    name: 'Future Enterprises',
    isin: 'INE623B01027',
    series: 'BZ',
    band: 2,
    gsm: 0,
    rank: 3328,
    turnoverLakh: 2.88,
    sector: null,
  },
  {
    symbol: 'CURAA',
    name: 'Cura Technologies',
    isin: 'INE117B01020',
    series: 'BE',
    band: 2,
    gsm: 0,
    rank: 4921,
    turnoverLakh: 0.53,
    sector: null,
  },
  {
    symbol: 'ACCENTMIC',
    name: 'Accent Microcell',
    isin: null,
    series: 'ST',
    band: 5,
    gsm: null,
    rank: null,
    turnoverLakh: 119.0,
    sector: null,
  },
  {
    symbol: 'KCK',
    name: 'KCK Industries',
    isin: null,
    series: 'ST',
    band: 5,
    gsm: null,
    rank: null,
    turnoverLakh: 157.64,
    sector: null,
  },
  {
    symbol: 'ACCORD',
    name: 'Accord Synergy',
    isin: null,
    series: 'SM',
    band: 5,
    gsm: null,
    rank: null,
    turnoverLakh: 0.42,
    sector: null,
  },
  {
    symbol: 'BOSS',
    name: 'Boss Packaging Solutions',
    isin: null,
    series: 'SM',
    band: 5,
    gsm: null,
    rank: null,
    turnoverLakh: 2.41,
    sector: null,
  },
];

/** The rules whose inputs are assumed here, not measured. */
const ASSUMED: RuleId[] = ['E2', 'E3', 'E6', 'E7'];

/** Rs lakh to paise: one lakh is 100,000 rupees. */
const lakhToPaise = (lakh: number): number => Math.round(lakh * 100_000 * 100);

function factsOf(r: Row): InstrumentFacts {
  return {
    instrumentId: r.isin === null ? r.symbol : `${r.symbol}:${r.isin}`,
    series: r.series,
    listingDate: null,
    firstSeen: '2020-04-01',
    dataStart: '2020-04-01',
    sessionsBeforeStart: 500,
    medianTradedValuePaise: lakhToPaise(r.turnoverLakh),
    missingSessions: 0,
    knownMergerInWindow: false,
    providerCoverage: 0.99,
  };
}

function bucketOf(r: Row, instrumentId: string): BucketInputs {
  return {
    instrumentId,
    asOf: AS_OF,
    amfiRank: r.rank,
    lowVolatility: null,
    beta: null,
    gsmStage: r.gsm,
    asmStage: null,
    asmKnown: false,
    bandPct: r.band,
    bandKnown: true,
    sector: r.sector,
  };
}

export function seedEntries(): UniverseEntry[] {
  return ROWS.map((r) => {
    const facts = factsOf(r);
    return {
      symbol: r.symbol,
      name: r.name,
      isin: r.isin,
      facts,
      bucket: bucketOf(r, facts.instrumentId),
      status: {
        series: r.series,
        bandPct: r.band,
        tradeForTrade: r.series === 'BE' || r.series === 'BZ',
        gsmStage: r.gsm,
      },
      assumed: ASSUMED,
    };
  });
}

export const seededUniverse: UniverseSource = {
  asOf: AS_OF,
  description:
    'Demo universe: 16 real NSE names on 2025-10-16. Series, band and GSM stage come from NSE, AMFI rank from the list to June 2025, and traded value is that one day, not a 60-session median. History length, missing sessions, provider coverage and mergers are assumed; volatility and beta are unknown, so buckets are partial.',
  load: () => Promise.resolve(seedEntries()),
};
