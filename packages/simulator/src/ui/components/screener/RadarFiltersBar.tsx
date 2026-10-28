/**
 * packages/simulator/src/ui/components/screener/RadarFiltersBar.tsx
 * Multi-layer filter toolbar for Market Universe Radar.
 * Includes Triad buttons, Yoga selectors, Action filters, and 4-fold Vedic Confluence toggles.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

import React from 'react';

export interface RadarFiltersState {
  selectedTriad: string;
  selectedYoga: 'ALL' | 'VRY' | 'NBRY' | 'DHANA' | 'MAHAPURUSHA';
  actionFilter: 'ALL' | 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED';
  kotaFilter: 'ALL' | 'FORTIFIED' | 'BREACHED';
  sbcFilter: 'ALL' | 'SUBHA' | 'CLEAN' | 'AFFLICTED';
  induFilter: 'ALL' | 'ACTIVE' | 'NEUTRAL';
  taraFilter: 'ALL' | 'AUSPICIOUS' | 'NEUTRAL' | 'INAUSPICIOUS';
  minConfluence: number;
}

export interface RadarFiltersBarProps {
  filters: RadarFiltersState;
  onChange: <K extends keyof RadarFiltersState>(key: K, value: RadarFiltersState[K]) => void;
  onReset: () => void;
  summary: { strongBuyCount: number; turnaroundBuyCount: number; blockedCount: number };
}

export const RadarFiltersBar: React.FC<RadarFiltersBarProps> = ({
  filters,
  onChange,
  onReset,
  summary,
}) => {
  const triads = ['ALL', '[T-T-T]', '[D-T-T]', '[D-D-D]', '[T-D-T]', '[K-T-T]'];
  const hasActiveFilter =
    filters.selectedTriad !== 'ALL' ||
    filters.selectedYoga !== 'ALL' ||
    filters.actionFilter !== 'ALL' ||
    filters.kotaFilter !== 'ALL' ||
    filters.sbcFilter !== 'ALL' ||
    filters.induFilter !== 'ALL' ||
    filters.taraFilter !== 'ALL' ||
    filters.minConfluence > 0;

  return (
    <div
      style={{
        padding: '10px 18px',
        borderBottom: '1px solid #1E2638',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        backgroundColor: '#090C12',
      }}
    >
      {/* Row 1: Macro Filters (Triad, Yoga, Action, Reset) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>Triad:</span>
          {triads.map((t) => (
            <button
              key={t}
              onClick={() => onChange('selectedTriad', t)}
              style={{
                padding: '3px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 700,
                backgroundColor: filters.selectedTriad === t ? '#D4AF37' : '#111827',
                color: filters.selectedTriad === t ? '#07090E' : '#CBD5E1',
                border: '1px solid #1E2638',
                cursor: 'pointer',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>Yoga:</span>
          <select
            value={filters.selectedYoga}
            onChange={(e) => onChange('selectedYoga', e.target.value as any)}
            style={{ padding: '3px 8px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All Yogas</option>
            <option value="VRY">Viparita Raja Yoga (VRY)</option>
            <option value="NBRY">Neecha Bhanga (NBRY)</option>
            <option value="DHANA">Dhana Yogas</option>
            <option value="MAHAPURUSHA">Pancha Mahapurusha</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>Action:</span>
          <select
            value={filters.actionFilter}
            onChange={(e) => onChange('actionFilter', e.target.value as any)}
            style={{ padding: '3px 8px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All Actions</option>
            <option value="BUY">BUY Only ({summary.strongBuyCount + summary.turnaroundBuyCount})</option>
            <option value="SELL">SELL Only</option>
            <option value="BLOCKED">Risk Vetoed ({summary.blockedCount})</option>
          </select>
        </div>

        {hasActiveFilter && (
          <button
            onClick={onReset}
            style={{
              marginLeft: 'auto',
              padding: '3px 10px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#1E2638',
              color: '#38BDF8',
              border: '1px solid #0284C7',
              cursor: 'pointer',
            }}
          >
            ↺ Reset Filters
          </button>
        )}
      </div>

      {/* Row 2: Classical Confluence Filters (Indu Lagna, Kota Chakra, SBC, Tara Bala, Confluence Score) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(30, 38, 56, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#D4AF37', fontSize: '10px', fontWeight: 800 }}>☸ CONFLUENCE:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>Kota:</span>
          <select
            value={filters.kotaFilter}
            onChange={(e) => onChange('kotaFilter', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All Kota</option>
            <option value="FORTIFIED">🛡 Fortified Citadel</option>
            <option value="BREACHED">⚠️ Fortress Breached</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>SBC:</span>
          <select
            value={filters.sbcFilter}
            onChange={(e) => onChange('sbcFilter', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All SBC</option>
            <option value="SUBHA">✨ Subha Vedha (Benefic)</option>
            <option value="CLEAN">✓ Clean (No Affliction)</option>
            <option value="AFFLICTED">✖ Papa Vedha Hit</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>Indu Lagna:</span>
          <select
            value={filters.induFilter}
            onChange={(e) => onChange('induFilter', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All Indu</option>
            <option value="ACTIVE">💰 Wealth Ray Active</option>
            <option value="NEUTRAL">Neutral</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>Tara Bala:</span>
          <select
            value={filters.taraFilter}
            onChange={(e) => onChange('taraFilter', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All Tara</option>
            <option value="AUSPICIOUS">⭐ Auspicious (Sampat/Kshema/Mitra)</option>
            <option value="INAUSPICIOUS">⚠️ Inauspicious (Vipat/Naidhana)</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>Min Score:</span>
          <select
            value={filters.minConfluence}
            onChange={(e) => onChange('minConfluence', Number(e.target.value))}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value={0}>Any Confluence</option>
            <option value={4}>★ 4/4 Quad-Confluence</option>
            <option value={3}>★ 3+/4 High Confluence</option>
            <option value={2}>★ 2+/4 Moderate</option>
          </select>
        </div>
      </div>
    </div>
  );
};
