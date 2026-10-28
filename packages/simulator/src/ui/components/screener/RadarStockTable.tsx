/**
 * packages/simulator/src/ui/components/screener/RadarStockTable.tsx
 * Tabular constituent view for Market Universe Radar.
 * Displays Dasha Triads, Special Yogas, 4-fold Vedic Confluence badges, and execution actions.
 * Supports bilingual display (English / Malayalam script).
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

import React from 'react';
import type { UniverseStockScanItem } from '../../../core/engine/universeScanner';
import { MALAYALAM_SIGN_NAMES, MALAYALAM_PLANET_NAMES } from '../../../core/astro/constants';

export interface RadarStockTableProps {
  items: UniverseStockScanItem[];
  onSelect: (sym: string) => void;
  onResetFilters: () => void;
  language?: 'ML' | 'EN';
}

export const RadarStockTable: React.FC<RadarStockTableProps> = ({
  items,
  onSelect,
  onResetFilters,
  language = 'ML',
}) => {
  if (items.length === 0) {
    return <EmptyState onResetFilters={onResetFilters} />;
  }

  const isMl = language === 'ML';

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr style={{ color: '#94A3B8', borderBottom: '1px solid #1E2638', textAlign: 'left' }}>
          <th style={{ padding: '8px' }}>Symbol</th>
          <th style={{ padding: '8px' }}>{isMl ? 'ലഗ്നം (Lagna)' : 'Lagna'}</th>
          <th style={{ padding: '8px' }}>{isMl ? 'ത്രിതയം (Triad)' : 'Triad'}</th>
          <th style={{ padding: '8px' }}>{isMl ? 'ദശാധിപന്മാർ (MD-AD-PD)' : 'Lords (MD-AD-PD)'}</th>
          <th style={{ padding: '8px' }}>{isMl ? 'വിശേഷ യോഗങ്ങൾ' : 'Special Yogas'}</th>
          <th style={{ padding: '8px' }}>{isMl ? 'സംഗമം (4-Fold)' : 'Confluence (4-Fold)'}</th>
          <th style={{ padding: '8px' }}>{isMl ? 'സന്ധി (Cusp)' : 'Cusp'}</th>
          <th style={{ padding: '8px' }}>{isMl ? 'സിഗ്നൽ (Action)' : 'Signal / Action'}</th>
          <th style={{ padding: '8px' }}>{isMl ? 'വലിപ്പം (Sizing)' : 'Sizing'}</th>
          <th style={{ padding: '8px', textAlign: 'right' }}>{isMl ? 'ടെർമിനൽ' : 'Cockpit'}</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <StockTableRow key={item.symbol} item={item} onSelect={onSelect} language={language} />
        ))}
      </tbody>
    </table>
  );
};

function EmptyState({ onResetFilters }: { onResetFilters: () => void }) {
  return (
    <div style={{ padding: '40px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{ color: '#F1F5F9', fontSize: '13px', fontWeight: 700 }}>
        No universe constituents match this exact combination of filters.
      </div>
      <div style={{ color: '#94A3B8', fontSize: '12px', maxWidth: '540px', lineHeight: 1.5 }}>
        Astrological tip: Combining restrictive filters (e.g. <strong>[T-T-T]</strong> with <strong>Viparita Raja Yoga</strong>, or <strong>★ 4/4 Confluence</strong> with rare Dasha alignments) may yield zero candidates on this session date. Try relaxing or resetting filters.
      </div>
      <button
        onClick={onResetFilters}
        style={{
          marginTop: '8px',
          padding: '6px 16px',
          borderRadius: '5px',
          backgroundColor: '#D4AF37',
          color: '#07090E',
          fontWeight: 800,
          fontSize: '12px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        ↺ Reset Filters to View All Matching Stocks
      </button>
    </div>
  );
}

function ConfluencePillGroup({ item }: { item: UniverseStockScanItem }) {
  const scoreColor = item.confluenceScore === 4 ? '#10B981' : item.confluenceScore >= 3 ? '#38BDF8' : item.confluenceScore >= 2 ? '#D4AF37' : '#64748B';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      <span
        style={{
          fontFamily: 'monospace',
          fontWeight: 800,
          color: scoreColor,
          backgroundColor: '#111827',
          padding: '2px 5px',
          borderRadius: '3px',
          border: `1px solid ${scoreColor}44`,
        }}
        title={`Confluence Score: ${item.confluenceScore}/4`}
      >
        ★ {item.confluenceScore}/4
      </span>

      {item.isKotaFortified && (
        <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', backgroundColor: '#064E3B', color: '#34D399' }} title="Kota: Fortified Citadel">
          Kota
        </span>
      )}
      {item.sbcStatus === 'SUBHA' && (
        <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', backgroundColor: '#0C4A6E', color: '#38BDF8' }} title="SBC: Subha Vedha Ray">
          SBC
        </span>
      )}
      {item.isInduLagnaActive && (
        <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', backgroundColor: '#78350F', color: '#FBBF24' }} title="Indu Lagna: Active Wealth Ray">
          Indu
        </span>
      )}
      {item.taraCategory === 'AUSPICIOUS' && (
        <span style={{ fontSize: '9px', padding: '1px 4px', borderRadius: '3px', backgroundColor: '#1E1B4B', color: '#A78BFA' }} title={`Tara Bala: ${item.taraName} (Auspicious)`}>
          {item.taraName}
        </span>
      )}
    </div>
  );
}

function StockTableRow({
  item,
  onSelect,
  language = 'ML',
}: {
  item: UniverseStockScanItem;
  onSelect: (sym: string) => void;
  language?: 'ML' | 'EN';
}) {
  const isMl = language === 'ML';
  const lagnaRashi = isMl ? (MALAYALAM_SIGN_NAMES[item.lagnaSignId] ?? item.lagnaSignName) : item.lagnaSignName;
  const lagnaLord = isMl ? (MALAYALAM_PLANET_NAMES[item.lagnaLord] ?? item.lagnaLord) : item.lagnaLord;

  const mdLord = isMl ? (MALAYALAM_PLANET_NAMES[item.mdLord] ?? item.mdLord) : item.mdLord;
  const adLord = isMl ? (MALAYALAM_PLANET_NAMES[item.adLord] ?? item.adLord) : item.adLord;
  const pdLord = isMl ? (MALAYALAM_PLANET_NAMES[item.pdLord] ?? item.pdLord) : item.pdLord;

  const actionColor = item.isBlocked ? '#EF4444' : item.action === 'BUY' ? '#10B981' : item.action === 'SELL' ? '#F59E0B' : '#64748B';

  return (
    <tr
      onClick={() => onSelect(item.symbol)}
      style={{ borderBottom: '1px solid #111827', cursor: 'pointer', transition: 'background-color 0.1s' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <td style={{ padding: '8px', fontWeight: 800, color: '#D4AF37' }}>{item.symbol}</td>
      <td style={{ padding: '8px', color: '#CBD5E1' }} title={`${item.lagnaSignName} (1L ${item.lagnaLord})`}>
        <span style={{ fontWeight: isMl ? 700 : 500, color: '#F1F5F9' }}>{lagnaRashi}</span>{' '}
        <span style={{ opacity: 0.75, fontSize: isMl ? '10px' : '11px' }}>({isMl ? `1L ${lagnaLord}` : `1L ${lagnaLord}`})</span>
      </td>
      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: '#00F2FE' }}>{item.triadCode}</td>
      <td style={{ padding: '8px', color: isMl ? '#F1F5F9' : '#94A3B8', fontFamily: isMl ? 'sans-serif' : 'monospace', fontSize: isMl ? '10px' : '11px' }}>
        {mdLord} - {adLord} - {pdLord}
      </td>
      <td style={{ padding: '8px' }}>
        {item.activeYogas.length > 0 ? (
          <span style={{ color: '#38BDF8', fontWeight: 600 }}>{item.activeYogas.slice(0, 2).join(', ')}</span>
        ) : (
          <span style={{ color: '#475569' }}>—</span>
        )}
      </td>
      <td style={{ padding: '8px' }}>
        <ConfluencePillGroup item={item} />
      </td>
      <td style={{ padding: '8px', color: '#F1F5F9' }}>{Math.round(item.daysToCusp)}d remaining</td>
      <td style={{ padding: '8px', fontWeight: 700, color: actionColor }}>
        {item.isBlocked ? 'BLOCKED (VETO)' : item.signal !== 'NONE' ? item.signal : item.action}
      </td>
      <td style={{ padding: '8px', color: '#CBD5E1', fontFamily: 'monospace' }}>{(item.sizingFraction * 100).toFixed(1)}%</td>
      <td style={{ padding: '8px', textAlign: 'right' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item.symbol);
          }}
          style={{ padding: '3px 8px', borderRadius: '4px', backgroundColor: '#1E2638', color: '#00F2FE', border: 'none', cursor: 'pointer', fontSize: '10px', fontWeight: 700 }}
        >
          {isMl ? 'ടെർമിനൽ ↗' : 'Deep Dive ↗'}
        </button>
      </td>
    </tr>
  );
}
