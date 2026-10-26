import { contractNote } from '@trading/core';
import type { Fill, ReplayConfig } from '@trading/core';
import { formatPaise } from '../format/rupees';

/** Contract note lines for a share fill: the trade, then every charge and what it came to. Null if the charges do not add up. */
export function shareNoteLines(fill: Fill, symbol: string, cfg: ReplayConfig): Array<[string, string]> | null {
  const c = contractNote(fill, {
    ...(cfg.exchange === undefined ? {} : { exchange: cfg.exchange }),
    ...(cfg.broker === undefined ? {} : { broker: cfg.broker }),
    sttExempt: cfg.sttExempt?.includes(fill.instrumentId) === true,
  });
  if (c === null) return null;
  const turnover = fill.pricePaise * fill.quantity;
  const net = fill.side === 'buy' ? turnover + c.total : turnover - c.total;
  return [
    ['Trade', `${fill.side} ${String(fill.quantity)} ${symbol} at ${formatPaise(fill.pricePaise)} on ${fill.tradingDate}`],
    ['Turnover', formatPaise(turnover)],
    ['Brokerage', formatPaise(c.brokerage)],
    ['STT', formatPaise(c.stt)],
    ['Exchange charges', formatPaise(c.exchange)],
    ['SEBI fee', formatPaise(c.sebi)],
    ['Stamp duty', formatPaise(c.stampDuty)],
    ['Depository charge', formatPaise(c.dp)],
    ['GST', formatPaise(c.gst)],
    ['Total charges', formatPaise(c.total)],
    [fill.side === 'buy' ? 'You paid' : 'You received', formatPaise(net)],
  ];
}
