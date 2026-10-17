import type { AdjustOptions, BarAdj, BarUnadj, CorporateAction } from '@trading/core';
import { buildAdjusted } from './adjusted';

/**
 * Canonical daily series per instrument, with the unadjusted and adjusted series kept apart
 * (FR-D3). Unadjusted bars are stored once and returned as copies; the adjusted series is derived
 * on demand from them and the corporate-action table, so it can never drift from them.
 */
export class SeriesStore {
  private readonly unadj = new Map<string, readonly BarUnadj[]>();
  private readonly actions = new Map<string, readonly CorporateAction[]>();

  putUnadjusted(instrumentId: string, bars: readonly BarUnadj[]): void {
    this.unadj.set(
      instrumentId,
      bars.map((b) => ({ ...b })),
    );
  }

  putActions(instrumentId: string, actions: readonly CorporateAction[]): void {
    this.actions.set(instrumentId, [...actions]);
  }

  unadjusted(instrumentId: string): BarUnadj[] {
    return (this.unadj.get(instrumentId) ?? []).map((b) => ({ ...b }));
  }

  /** Adjusted series as of `options.asOf` (all actions when omitted). */
  adjusted(instrumentId: string, options: AdjustOptions): BarAdj[] {
    return buildAdjusted(
      this.unadjusted(instrumentId),
      this.actions.get(instrumentId) ?? [],
      options,
    );
  }

  corporateActions(instrumentId: string): CorporateAction[] {
    return (this.actions.get(instrumentId) ?? []).map((a) => ({ ...a }));
  }

  instruments(): string[] {
    return [...this.unadj.keys()].sort();
  }
}
