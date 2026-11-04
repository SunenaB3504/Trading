/**
 * packages/simulator/src/ui/components/screener/DailyActionFeed.tsx
 * Prioritized daily action feed aggregating market-wide execution directives.
 * Supports interactive Buy/Sell filter tabs, multi-metric sorting, and holding alerts.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useMemo, useState } from 'react';
import type { CorporateRegistryRecord, QuarterlyFundamental } from '../../../core/data/types';
import { scanUniverse, type UniverseStockScanItem } from '../../../core/engine/universeScanner';
import { useStrategyStore } from '../../../state/strategyStore';
import { usePortfolioStore } from '../../../state/portfolioStore';

export type FilterTab = 'ALL' | 'BUY' | 'SELL' | 'INGRESS' | 'HOLDINGS';
export type SortOption = 'URGENCY' | 'PROFIT' | 'SCORE' | 'FINANCIAL';

export interface DailyActionFeedProps {
  activeDate: string;
  onSelectStock: (symbol: string) => void;
  registry: Record<string, CorporateRegistryRecord>;
  fundamentalsMap?: Record<string, QuarterlyFundamental[]>;
}

function formatCuspDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${day}-${months[d.getMonth()]}`;
  } catch {
    return dateStr;
  }
}

function TabBtn({
  active,
  label,
  color,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string | undefined;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: active ? 800 : 600,
        backgroundColor: active ? (color ? `${color}25` : '#1E293B') : 'transparent',
        color: active ? (color || '#F8FAFC') : '#94A3B8',
        border: active ? `1px solid ${color || '#64748B'}` : '1px solid transparent',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export const DailyActionFeed: React.FC<DailyActionFeedProps> = ({
  activeDate,
  onSelectStock,
  registry,
  fundamentalsMap = {},
}) => {
  const effectiveDate = activeDate && activeDate.length >= 10 ? activeDate : '2005-01-01';
  const strategyParams = useStrategyStore((s) => s.parameters);
  const { ledger } = usePortfolioStore();

  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [sortOption, setSortOption] = useState<SortOption>('URGENCY');

  const heldPositions = ledger.positions;
  const heldSymbols = useMemo(() => new Set(Object.keys(heldPositions)), [heldPositions]);

  const summary = useMemo(
    () => scanUniverse(registry, effectiveDate, fundamentalsMap, strategyParams),
    [registry, effectiveDate, fundamentalsMap, strategyParams]
  );

  const buyCount = useMemo(
    () => summary.items.filter((i) => i.action === 'BUY' && !i.isBlocked).length,
    [summary.items]
  );
  const sellCount = useMemo(
    () => summary.items.filter((i) => i.action === 'SELL').length,
    [summary.items]
  );
  const ingressCount = summary.upcomingIngressCount ?? 0;
  const holdingsCount = useMemo(
    () => summary.items.filter((i) => heldSymbols.has(i.symbol)).length,
    [summary.items, heldSymbols]
  );

  const displayItems = useMemo(() => {
    let list = summary.items;
    if (filterTab === 'BUY') {
      list = list.filter((i) => i.action === 'BUY' && !i.isBlocked);
    } else if (filterTab === 'SELL') {
      list = list.filter((i) => i.action === 'SELL');
    } else if (filterTab === 'INGRESS') {
      list = list.filter((i) => i.upcomingIngress && i.upcomingIngress.isAuspicious && i.upcomingIngress.daysUntil <= 14);
    } else if (filterTab === 'HOLDINGS') {
      list = list.filter((i) => heldSymbols.has(i.symbol));
    } else {
      list = list.filter((i) => (i.action === 'BUY' && !i.isBlocked) || i.action === 'SELL' || heldSymbols.has(i.symbol));
    }

    return [...list].sort((a, b) => {
      if (filterTab === 'INGRESS') {
        const dA = a.upcomingIngress?.daysUntil ?? 999;
        const dB = b.upcomingIngress?.daysUntil ?? 999;
        if (dA !== dB) return dA - dB;
        return (b.upcomingIngress?.isPureTrikona ? 1 : 0) - (a.upcomingIngress?.isPureTrikona ? 1 : 0);
      }

      const aHeldSell = heldSymbols.has(a.symbol) && a.action === 'SELL';
      const bHeldSell = heldSymbols.has(b.symbol) && b.action === 'SELL';
      if (aHeldSell !== bHeldSell) return aHeldSell ? -1 : 1;

      if (sortOption === 'URGENCY') {
        return a.daysToCusp - b.daysToCusp || b.confluenceScore - a.confluenceScore;
      }
      if (sortOption === 'PROFIT') {
        return (b.targetReturnPct || 0) - (a.targetReturnPct || 0) || b.confluenceScore - a.confluenceScore;
      }
      if (sortOption === 'SCORE') {
        return b.confluenceScore - a.confluenceScore || b.phiFinancial - a.phiFinancial;
      }
      if (sortOption === 'FINANCIAL') {
        return b.phiFinancial - a.phiFinancial || b.confluenceScore - a.confluenceScore;
      }
      return 0;
    });
  }, [summary.items, filterTab, sortOption, heldSymbols]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '12px',
        borderRadius: '8px',
        backgroundColor: '#0B0E14',
        border: '1px solid #1E2638',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#D4AF37', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Daily Action Directives ({activeDate})
        </span>
        <select
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          style={{
            backgroundColor: '#1E293B',
            color: '#CBD5E1',
            border: '1px solid #334155',
            borderRadius: '4px',
            fontSize: '10px',
            padding: '2px 6px',
            cursor: 'pointer',
          }}
        >
          <option value="URGENCY">Urgency (Nearest Cusp)</option>
          <option value="PROFIT">Profit Potential</option>
          <option value="SCORE">Astro Strength</option>
          <option value="FINANCIAL">Financial Quality</option>
        </select>
      </div>

      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', borderBottom: '1px solid #1E2638', paddingBottom: '6px' }}>
        <TabBtn active={filterTab === 'ALL'} label={`All (${buyCount + sellCount})`} onClick={() => setFilterTab('ALL')} />
        <TabBtn active={filterTab === 'BUY'} label={`Buy (${buyCount})`} color="#10B981" onClick={() => setFilterTab('BUY')} />
        <TabBtn active={filterTab === 'SELL'} label={`Sell (${sellCount})`} color="#F59E0B" onClick={() => setFilterTab('SELL')} />
        <TabBtn active={filterTab === 'INGRESS'} label={`⚡ Ingress (${ingressCount})`} color="#38BDF8" onClick={() => setFilterTab('INGRESS')} />
        {holdingsCount > 0 && (
          <TabBtn active={filterTab === 'HOLDINGS'} label={`My Holdings (${holdingsCount})`} color="#818CF8" onClick={() => setFilterTab('HOLDINGS')} />
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '250px', overflowY: 'auto' }}>
        {displayItems.length === 0 ? (
          <div style={{ padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '11px' }}>
            No directives matching filter.
          </div>
        ) : (
          displayItems.map((item) => (
            <ActionFeedRow
              key={item.symbol}
              item={item}
              onSelect={onSelectStock}
              heldShares={heldPositions[item.symbol]?.shares}
              isIngressTab={filterTab === 'INGRESS'}
            />
          ))
        )}
      </div>
    </div>
  );
};

function ActionFeedRow({
  item,
  onSelect,
  heldShares,
  isIngressTab = false,
}: {
  item: UniverseStockScanItem;
  onSelect: (sym: string) => void;
  heldShares?: number | undefined;
  isIngressTab?: boolean;
}): React.ReactElement {
  const badgeStyle = getActionBadgeStyle(item);
  const isHeld = (heldShares ?? 0) > 0;
  const isUrgent = item.daysToCusp <= 7;
  const cuspDateFormatted = formatCuspDate(item.cuspExitDate);
  const hasUpcomingIngress = Boolean(item.upcomingIngress && item.upcomingIngress.isAuspicious && item.upcomingIngress.daysUntil <= 14);

  return (
    <div
      onClick={() => onSelect(item.symbol)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '7px 10px',
        borderRadius: '5px',
        backgroundColor: isIngressTab ? '#082F49' : (isHeld && item.action === 'SELL' ? '#3B0707' : '#111827'),
        border: `1px solid ${isIngressTab ? '#0284C7' : (isHeld && item.action === 'SELL' ? '#DC2626' : '#1E2638')}`,
        cursor: 'pointer',
        fontSize: '11px',
        gap: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
        <span style={{ fontWeight: 800, color: '#F8FAFC', width: '65px' }}>
          {item.symbol}
          {hasUpcomingIngress && !isIngressTab && (
            <span title="Upcoming Auspicious Ingress" style={{ color: '#38BDF8', marginLeft: '3px', fontSize: '9px' }}>⚡</span>
          )}
        </span>
        <span style={{ color: '#94A3B8', fontSize: '10px', fontWeight: 600, width: '55px' }}>
          ₹{item.cmp.toFixed(item.cmp < 100 ? 1 : 0)}
        </span>
        <span style={{ fontFamily: 'monospace', color: isIngressTab ? '#94A3B8' : '#00F2FE', fontSize: '10px', fontWeight: 700 }}>
          {item.triadCode}
        </span>
        {isIngressTab ? (
          <span style={{ backgroundColor: '#0369A1', color: '#E0F2FE', border: '1px solid #38BDF8', padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 800 }}>
            ⚡ INGRESS
          </span>
        ) : (
          <span style={{ ...badgeStyle, padding: '2px 6px', borderRadius: '3px', fontSize: '9px', fontWeight: 800 }}>
            {item.isBlocked ? 'VETO' : item.action}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
        {isIngressTab && item.upcomingIngress ? (
          <span style={{ fontSize: '10px', color: '#E0F2FE', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#64748B' }}>Next: </span>
            <span style={{ color: '#38BDF8', fontWeight: 800, fontFamily: 'monospace' }}>{item.upcomingIngress.triadCode}</span>
            <span style={{ color: '#94A3B8', fontSize: '9px', marginLeft: '4px' }}>
              ({item.upcomingIngress.lords.md[0]?.toUpperCase()}-{item.upcomingIngress.lords.ad[0]?.toUpperCase()}-{item.upcomingIngress.lords.pd[0]?.toUpperCase()})
            </span>
          </span>
        ) : item.action === 'BUY' && !item.isBlocked ? (
          <span style={{ fontSize: '10px', color: '#94A3B8', whiteSpace: 'nowrap' }}>
            <span style={{ color: '#34D399', fontWeight: 700 }}>+{item.targetReturnPct}%</span>
            <span style={{ color: '#64748B' }}> / </span>
            <span style={{ color: '#F87171', fontWeight: 600 }}>{item.stopLossPct}%</span>
          </span>
        ) : (
          <span style={{ fontSize: '10px', color: item.action === 'SELL' ? '#FBBF24' : '#94A3B8', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {item.action === 'SELL' ? 'EXIT DIRECTIVE' : 'VETOED'}
          </span>
        )}

        {isHeld && (
          <span
            style={{
              padding: '1px 5px',
              borderRadius: '3px',
              fontSize: '9px',
              fontWeight: 700,
              backgroundColor: item.action === 'SELL' ? '#7F1D1D' : '#1E1B4B',
              color: item.action === 'SELL' ? '#FECACA' : '#C7D2FE',
              border: `1px solid ${item.action === 'SELL' ? '#DC2626' : '#4338CA'}`,
              whiteSpace: 'nowrap',
            }}
          >
            HELD ({heldShares} shs)
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
        {item.hasVry && <span style={{ color: '#A855F7', fontSize: '9px', fontWeight: 700 }}>VRY</span>}
        {item.hasNbry && <span style={{ color: '#EC4899', fontSize: '9px', fontWeight: 700 }}>NBRY</span>}
        {isIngressTab && item.upcomingIngress ? (
          <span
            style={{
              color: '#38BDF8',
              fontSize: '10px',
              fontWeight: 800,
              whiteSpace: 'nowrap',
            }}
          >
            in {item.upcomingIngress.daysUntil}d ({formatCuspDate(item.upcomingIngress.startDate)})
          </span>
        ) : (
          <span
            style={{
              color: isUrgent ? '#F87171' : '#94A3B8',
              fontSize: '10px',
              fontWeight: isUrgent ? 800 : 500,
              whiteSpace: 'nowrap',
            }}
          >
            {Math.round(item.daysToCusp)}d ({cuspDateFormatted})
          </span>
        )}
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
