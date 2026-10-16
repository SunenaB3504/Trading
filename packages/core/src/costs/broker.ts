/** Brokerage rule: `ratePpb` of turnover, then clamped to [minPaise, capPaise]. */
export interface BrokerageRule {
  ratePpb: number;
  minPaise: number;
  capPaise: number | null;
}

/**
 * Broker-specific charges (not regulated). The default profile is an ASSUMED generic discount
 * broker, chosen because the owner has not named a broker (D-pending); every result using an
 * assumed profile is flagged.
 */
export interface BrokerProfile {
  id: string;
  /** True when the figures are assumptions, not a specific broker's published tariff. */
  assumed: boolean;
  delivery: BrokerageRule;
  intraday: BrokerageRule;
  /** Broker's own add-on to the depository charge, per scrip per delivery-sell day, in paise. */
  dpAddOnPaise: number;
}

export const GENERIC_DISCOUNT_BROKER: BrokerProfile = {
  id: 'generic-discount',
  assumed: true,
  delivery: { ratePpb: 0, minPaise: 0, capPaise: 0 },
  intraday: { ratePpb: 300_000, minPaise: 0, capPaise: 2_000 }, // 0.03%, capped at Rs 20
  dpAddOnPaise: 950,
};
