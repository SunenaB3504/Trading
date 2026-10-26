/**
 * packages/app/src/core/data/types.ts
 * Core data types for market time-series, corporate registry, and local storage.
 * Enforces strict modularity (< 150 LOC).
 */

export interface DailyBar {
  symbol: string;
  date: string; // YYYY-MM-DD
  close: number;
  prev_close: number;
  open?: number;
  high?: number;
  low?: number;
  volume: number;
  daily_return: number;
  adj_close_index: number;
  rolling_peak: number;
  drawdown: number;
  is_macro_crisis: boolean;
}

export interface QuarterlyFundamental {
  symbol: string;
  fiscal_quarter: string;
  period_end_date: string;
  filing_timestamp: string;
  debt_to_equity: number;
  fcf: number;
  roce: number;
  roe: number;
  pledging_pct: number;
  icr: number;
}

export interface CorporateRegistryRecord {
  symbol: string;
  company_name: string;
  listing_date: string;
  listing_time: string;
  timezone_offset_minutes: number;
  latitude: number;
  longitude: number;
  year_length_days: number;
  primary_consonant: string;
  ayanamsa: number;
  lagna_sign_id: number;
  lagna_sign: string;
  lagna_deg: number;
  moon_sign_id: number;
  moon_sign: string;
  moon_deg: number;
  moon_nakshatra: string;
  pada: number;
  birth_md_lord: string;
  starting_balance_years: number;
}

export interface PaperTradeOrder {
  id: string;
  timestamp: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  rupee_value: number;
  advisory_provenance: string;
  status: 'PENDING' | 'FILLED' | 'CANCELLED';
}

export interface PortfolioPosition {
  symbol: string;
  shares: number;
  average_cost: number;
  current_price: number;
  market_value: number;
  unrealized_pnl: number;
  unrealized_return_pct: number;
}

export interface PortfolioLedgerState {
  cash_balance: number;
  invested_equity: number;
  total_equity: number;
  realized_pnl: number;
  unrealized_pnl: number;
  positions: Record<string, PortfolioPosition>;
}
