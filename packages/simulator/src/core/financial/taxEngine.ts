/**
 * packages/simulator/src/core/financial/taxEngine.ts
 * Indian Equity Delivery Statutory Transaction Charges & Capital Gains Tax Engine.
 * Formulates STT, Stamp Duty, NSE Exchange Charges, SEBI Turnover, DP Charges, GST, and STCG/LTCG.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

export interface OrderChargesBreakdown {
  stt: number;
  stampDuty: number;
  exchangeCharges: number;
  sebiTurnoverCharges: number;
  dpCharges: number;
  gst: number;
  totalCharges: number;
}

export interface TradeTaxResult {
  grossPnl: number;
  grossReturnPct: number;
  totalCharges: number;
  taxableGain: number;
  isLongTerm: boolean;
  capitalGainsTax: number;
  netPnl: number;
  netReturnPct: number;
  effectiveTaxRatePct: number;
}

// Statutory rates for Indian cash equity delivery (NSE)
export const STATUTORY_RATES = {
  sttDeliveryBps: 10, // 0.10% on both Buy and Sell
  stampDutyBuyBps: 1.5, // 0.015% on Buy only
  exchangeChargesNseBps: 0.297, // 0.00297%
  sebiTurnoverBps: 0.01, // ₹10 per crore (0.0001%)
  dpChargePerSellScrip: 13.5, // ₹13.50 base DP charge on sell leg
  gstRatePct: 18, // 18% GST on (Brokerage + Exchange + SEBI + DP)
  stcgRatePct: 20.8, // 20% STCG + 4% Cess (Section 111A)
  ltcgRatePct: 13.0, // 12.5% LTCG + 4% Cess (Section 112A)
  ltcgExemptionRupees: 125000, // ₹1.25 Lakh annual LTCG exemption
  longTermHoldingDays: 365,
};

/**
 * Calculates statutory transaction costs and taxes for a single buy or sell order.
 */
export function calculateOrderCharges(
  side: 'BUY' | 'SELL',
  price: number,
  quantity: number
): OrderChargesBreakdown {
  const turnover = price * quantity;
  if (turnover <= 0) {
    return {
      stt: 0,
      stampDuty: 0,
      exchangeCharges: 0,
      sebiTurnoverCharges: 0,
      dpCharges: 0,
      gst: 0,
      totalCharges: 0,
    };
  }

  // STT: 0.10% on both buy & sell delivery
  const stt = Math.round((turnover * STATUTORY_RATES.sttDeliveryBps) / 10000);

  // Stamp duty: 0.015% on buy leg only
  const stampDuty = side === 'BUY'
    ? Math.round(((turnover * STATUTORY_RATES.stampDutyBuyBps) / 10000) * 100) / 100
    : 0;

  // Exchange transaction charges (NSE: ~0.00297%)
  const exchangeCharges = Math.round(((turnover * STATUTORY_RATES.exchangeChargesNseBps) / 10000) * 100) / 100;

  // SEBI turnover fee: ₹10 per crore (0.0001%)
  const sebiTurnoverCharges = Math.round(((turnover * STATUTORY_RATES.sebiTurnoverBps) / 10000) * 100) / 100;

  // DP charges on delivery sell: ₹13.50
  const dpCharges = side === 'SELL' ? STATUTORY_RATES.dpChargePerSellScrip : 0;

  // GST 18% on (Exchange charges + SEBI charges + DP charges)
  const gstTaxableBase = exchangeCharges + sebiTurnoverCharges + dpCharges;
  const gst = Math.round(((gstTaxableBase * STATUTORY_RATES.gstRatePct) / 100) * 100) / 100;

  const totalCharges = Math.round((stt + stampDuty + exchangeCharges + sebiTurnoverCharges + dpCharges + gst) * 100) / 100;

  return {
    stt,
    stampDuty,
    exchangeCharges,
    sebiTurnoverCharges,
    dpCharges,
    gst,
    totalCharges,
  };
}

/**
 * Calculates net post-tax P&L for a closed round-trip equity trade.
 */
export function calculateTradeTaxAndNetPnl(
  buyPrice: number,
  sellPrice: number,
  shares: number,
  buyDate: string,
  sellDate: string
): TradeTaxResult {
  const buyCost = shares * buyPrice;
  const sellProceeds = shares * sellPrice;
  const grossPnl = Math.round((sellProceeds - buyCost) * 100) / 100;
  const grossReturnPct = buyCost > 0 ? Math.round(((grossPnl / buyCost) * 100) * 100) / 100 : 0;

  const buyCharges = calculateOrderCharges('BUY', buyPrice, shares);
  const sellCharges = calculateOrderCharges('SELL', sellPrice, shares);
  const totalCharges = Math.round((buyCharges.totalCharges + sellCharges.totalCharges) * 100) / 100;

  // Taxable capital gain after regulatory transaction friction
  const taxableGain = Math.max(0, Math.round((grossPnl - totalCharges) * 100) / 100);

  // Holding period check
  const bMs = new Date(buyDate).getTime();
  const sMs = new Date(sellDate).getTime();
  const holdingDays = Math.max(0, (sMs - bMs) / 86400000);
  const isLongTerm = holdingDays >= STATUTORY_RATES.longTermHoldingDays;

  let capitalGainsTax = 0;
  if (taxableGain > 0) {
    if (isLongTerm) {
      // LTCG: 12.5% + 4% cess (subject to annual exemption, applied if exceeded)
      capitalGainsTax = Math.round(((taxableGain * STATUTORY_RATES.ltcgRatePct) / 100) * 100) / 100;
    } else {
      // STCG: 20% + 4% cess (Section 111A)
      capitalGainsTax = Math.round(((taxableGain * STATUTORY_RATES.stcgRatePct) / 100) * 100) / 100;
    }
  }

  const netPnl = Math.round((grossPnl - totalCharges - capitalGainsTax) * 100) / 100;
  const netReturnPct = buyCost > 0 ? Math.round(((netPnl / buyCost) * 100) * 100) / 100 : 0;
  const effectiveTaxRatePct = grossPnl > 0
    ? Math.round((((totalCharges + capitalGainsTax) / grossPnl) * 100) * 100) / 100
    : 0;

  return {
    grossPnl,
    grossReturnPct,
    totalCharges,
    taxableGain,
    isLongTerm,
    capitalGainsTax,
    netPnl,
    netReturnPct,
    effectiveTaxRatePct,
  };
}
