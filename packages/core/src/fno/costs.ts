import { FNO_FACTS } from './facts';
import type { ContractKind } from './contracts';
import type { UnderlyingId } from './facts';

export interface FnoCosts {
  brokeragePaise: number;
  sttPaise: number;
  exchangePaise: number;
  gstPaise: number;
  stampPaise: number;
  totalPaise: number;
}

const ppm = (paise: number, parts: number): number => Math.round((paise * parts) / 1_000_000);

/**
 * Charges on one order (SSD v4.1 §5.3, rates in the facts file): a flat brokerage, STT on the sell side, the
 * exchange charge, GST on brokerage and exchange charge, and stamp duty on the buy side. `turnoverPaise` is the
 * price times the units traded.
 */
export function fnoCosts(kind: ContractKind, side: 'buy' | 'sell', turnoverPaise: number, u: UnderlyingId = 'NIFTY'): FnoCosts {
  const c = FNO_FACTS.costs;
  const fut = kind === 'FUT';
  if (u === 'USDINR') {
    const exchange = ppm(turnoverPaise, c.currencyExchangePpm);
    const gst = Math.round(((c.brokeragePaise + exchange) * c.gstPct) / 100);
    const stamp = side === 'buy' ? ppm(turnoverPaise, c.currencyStampBuyPpm) : 0;
    return { brokeragePaise: c.brokeragePaise, sttPaise: 0, exchangePaise: exchange, gstPaise: gst, stampPaise: stamp, totalPaise: c.brokeragePaise + exchange + gst + stamp };
  }
  const brokeragePaise = c.brokeragePaise;
  const sttPaise = side === 'sell' ? ppm(turnoverPaise, fut ? c.futuresSttSellPpm : c.optionsSttSellPpm) : 0;
  const exchangePaise = ppm(turnoverPaise, fut ? c.futuresExchangePpm : c.optionsExchangePpm);
  const gstPaise = Math.round(((brokeragePaise + exchangePaise) * c.gstPct) / 100);
  const stampPaise = side === 'buy' ? ppm(turnoverPaise, fut ? c.futuresStampBuyPpm : c.optionsStampBuyPpm) : 0;
  return { brokeragePaise, sttPaise, exchangePaise, gstPaise, stampPaise, totalPaise: brokeragePaise + sttPaise + exchangePaise + gstPaise + stampPaise };
}

/** STT paid by the buyer of an option that is exercised at expiry, on the intrinsic value of the position. */
export const exerciseStt = (intrinsicTotalPaise: number): number => ppm(intrinsicTotalPaise, FNO_FACTS.costs.exerciseSttPpm);
