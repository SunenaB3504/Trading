/**
 * packages/simulator/src/ui/components/screener/DailyActionFeed.tsx
 * Prioritized daily action feed aggregating market-wide execution directives.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useMemo } from 'react';
import type { CorporateRegistryRecord, QuarterlyFundamental } from '../../../core/data/types';
import { scanUniverse, getPrioritizedDailyActionFeed, type UniverseStockScanItem } from '../../../core/engine/universeScanner';

export interface DailyActionFeedProps {
  activeDate: string;
  onSelectStock: (symbol: string) => void;
  registry: Record<string, CorporateRegistryRecord>;
  fundamentalsMap?: Record<string, QuarterlyFundamental[]>;
}

export const DailyActionFeed: React.FC<DailyActionFeedProps> = ({
  activeDate,
  onSelectStock,
  registry,
  fundamentalsMap = {},
}) => {
  const effectiveDate = activeDate && activeDate.length >= 10 ? activeDate : '2005-01-01';
  const summary = useMemo(
    () => scanUniverse(registry, effectiveDate, fundamentalsMap),
    [registry, effectiveDate, fundamentalsMap]
  );

  const prioritized = useMemo(
    () => getPrioritizedDailyActionFeed(summary.items).slice(0, 10),
    [summary.items]
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '12px',
        borderRadius: '6px',
        backgroundColor: '#0B0E14',
        border: '1px solid #1E2638',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#D4AF37', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          DAILY ACTION DIRECTIVES ({activeDate})
        </span>
        <span style={{ color: '#94A3B8', fontSize: '10px' }}>
          Active: <strong style={{ color: '#10B981' }}>{summary.strongBuyCount + summary.turnaroundBuyCount} Buy</strong> |{' '}
          <strong style={{ color: '#F59E0B' }}>{summary.defensiveExitCount} Sell</strong>
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
        {prioritized.map((item) => (
          <ActionFeedRow key={item.symbol} item={item} onSelect={onSelectStock} />
        ))}
      </div>
    </div>
  );
};

function ActionFeedRow({ item, onSelect }: { item: UniverseStockScanItem; onSelect: (sym: string) => void }) {
  const badgeStyle = getActionBadgeStyle(item);
  return (
    <div
      onClick={() => onSelect(item.symbol)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        borderRadius: '4px',
        backgroundColor: '#111827',
        border: '1px solid #1E2638',
        cursor: 'pointer',
        fontSize: '11px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontWeight: 800, color: '#F8FAFC', width: '65px' }}>{item.symbol}</span>
        <span style={{ fontFamily: 'monospace', color: '#00F2FE', fontSize: '10px', fontWeight: 700 }}>{item.triadCode}</span>
        <span style={{ ...badgeStyle, padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 800 }}>
          {item.isBlocked ? 'VETO' : item.action}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {item.hasVry && <span style={{ color: '#A855F7', fontSize: '9px', fontWeight: 700 }}>VRY</span>}
        {item.hasNbry && <span style={{ color: '#EC4899', fontSize: '9px', fontWeight: 700 }}>NBRY</span>}
        <span style={{ color: '#94A3B8', fontSize: '10px' }}>{item.daysToCusp}d to cusp</span>
        <span style={{ color: '#38BDF8', fontSize: '10px', fontWeight: 700 }}>Jump ↗</span>
      </div>
    </div>
  );
}

function getActionBadgeStyle(item: UniverseStockScanItem): React.CSSProperties {
  if (item.isBlocked) {
    return { backgroundColor: '#450A0A', color: '#F87171', border: '1px solid #991B1B' };
  }
  if (item.action === 'BUY') {
    return { backgroundColor: '#064E3B', color: '#34D399', border: '1px solid #059669' };
  }
  if (item.action === 'SELL') {
    return { backgroundColor: '#451A03', color: '#FBBF24', border: '1px solid #D97706' };
  }
  return { backgroundColor: '#1E293B', color: '#94A3B8', border: '1px solid #334155' };
}

