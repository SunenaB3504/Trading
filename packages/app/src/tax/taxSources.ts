import { estimateStt, simulateFno } from '@trading/core';
import type { FnoData, Trade, TaxTrade } from '@trading/core';
import type { FnoSession } from '../fno/fnoSessions';
import type { Market } from '../trading/market';

/** Assets taxed at the slab rate rather than as equity: the gold and liquid-fund ETFs. */
export const SLAB_SYMBOLS: ReadonlySet<string> = new Set(['GOLDBEES', 'LIQUIDBEES']);

/** Closed share and ETF round trips of the practice book as tax lines. */
export function shareTaxTrades(trades: readonly Trade[], market: Market): TaxTrade[] {
  const out: TaxTrade[] = [];
  for (const t of trades) {
    if (t.closedOn === null || t.grossPnlPaise === null) continue;
    const symbol = market.symbols[t.instrumentId] ?? t.instrumentId;
    out.push({
      id: t.id,
      label: `${symbol} x ${String(t.quantity)}`,
      kind: SLAB_SYMBOLS.has(symbol) ? 'slab_asset' : 'equity',
      openedOn: t.openedOn,
      closedOn: t.closedOn,
      grossPaise: t.grossPnlPaise,
      chargesPaise: t.entryCostsPaise + t.exitCostsPaise,
      sttPaise: estimateStt(t.basisPaise, t.proceedsPaise, t.openedOn === t.closedOn),
    });
  }
  return out;
}

/** Every fill of an F&O session as a business-income line: the profit on lots closed, less that fill's charges. */
export function fnoTaxTrades(session: FnoSession, data: FnoData): TaxTrade[] {
  const run = simulateFno(data, session.orders, session.start, session.current, session.capitalPaise);
  return run.state.trades.map((t, i) => ({
    id: `${session.id}-${String(i)}`,
    label: `${session.title}: ${t.id}`,
    kind: 'derivative' as const,
    openedOn: t.date,
    closedOn: t.date,
    grossPaise: t.grossPaise ?? 0,
    chargesPaise: t.costsPaise,
    sttPaise: 0,
  }));
}
