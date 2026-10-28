import { DEFAULT_STRATEGY } from './rules';
import type { StrategyParams } from './rules';

/** The five Robo accounts (SSD v4.1 §6.4). Each starts with ₹10,00,000 and is run by the rules, never by the AI. */
export type RoboId = 'index' | 'sunil' | 'neil' | 'shine' | 'sandbox';

export interface RoboDef {
  id: RoboId;
  name: string;
  blurb: string;
}

export const ROBO_CAPITAL_PAISE = 100_000_000;
export const ROBO_BENCHMARK = 'NIFTYBEES';

export const ROBO_ACCOUNTS: readonly RoboDef[] = [
  { id: 'index', name: 'Index Benchmark', blurb: 'Buys the Nifty 50 ETF on the first day and keeps it. The line the others have to beat.' },
  { id: 'sunil', name: 'Sunil', blurb: 'The breakout rules with 10% of the account in each position, bought at the next open.' },
  { id: 'neil', name: 'Neil', blurb: 'The same rules with 5% in each position, bought only at or below the close of the decision day.' },
  { id: 'shine', name: 'Shine', blurb: 'The same rules, but every position is sold after 10 sessions.' },
  { id: 'sandbox', name: 'Sandbox', blurb: 'Runs whatever settings you last saved in the Strategy Lab.' },
];

/** The settings and, for the index account, the instrument it holds. */
export function roboSetup(id: RoboId, sandbox: StrategyParams = DEFAULT_STRATEGY): { params: StrategyParams; hold?: string } {
  switch (id) {
    case 'index':
      return { params: DEFAULT_STRATEGY, hold: ROBO_BENCHMARK };
    case 'sunil':
      return { params: DEFAULT_STRATEGY };
    case 'neil':
      return { params: { ...DEFAULT_STRATEGY, positionBps: 500, maxPositions: 20, entry: 'limit_prev_close' } };
    case 'shine':
      return { params: { ...DEFAULT_STRATEGY, maxHoldSessions: 10 } };
    case 'sandbox':
      return { params: sandbox };
  }
}
