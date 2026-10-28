/**
 * packages/simulator/src/ui/components/screener/RadarFiltersBar.tsx
 * Multi-layer filter toolbar for Market Universe Radar.
 * Includes Triad buttons, Yoga selectors, Action filters, Dasha Lord selectors, and 4-fold Vedic Confluence toggles.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

import React from 'react';
import type { PlanetKey } from '../../../core/astro/types';
import { VIMSHOTTARI_LORDS } from '../../../core/astro/constants';

export interface RadarFiltersState {
  selectedTriad: string;
  selectedYoga: 'ALL' | 'VRY' | 'NBRY' | 'DHANA' | 'MAHAPURUSHA';
  actionFilter: 'ALL' | 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED';
  kotaFilter: 'ALL' | 'FORTIFIED' | 'BREACHED';
  sbcFilter: 'ALL' | 'SUBHA' | 'CLEAN' | 'AFFLICTED';
  induFilter: 'ALL' | 'ACTIVE' | 'NEUTRAL';
  taraFilter: 'ALL' | 'AUSPICIOUS' | 'NEUTRAL' | 'INAUSPICIOUS';
  minConfluence: number;
  mdLordFilter: PlanetKey | 'ALL';
  adLordFilter: PlanetKey | 'ALL';
}

export interface RadarFiltersBarProps {
  filters: RadarFiltersState;
  onChange: <K extends keyof RadarFiltersState>(key: K, value: RadarFiltersState[K]) => void;
  onReset: () => void;
  summary: {
    strongBuyCount: number;
    turnaroundBuyCount: number;
    blockedCount: number;
    triadDistribution?: Record<string, number> | undefined;
    totalScanned?: number | undefined;
  };
}

export const RadarFiltersBar: React.FC<RadarFiltersBarProps> = ({
  filters,
  onChange,
  onReset,
  summary,
}) => {
  const availableTriads = React.useMemo(() => {
    const dist = summary.triadDistribution ?? {};
    const keys = Object.keys(dist).filter((k) => (dist[k] ?? 0) > 0);
    keys.sort((a, b) => (dist[b] ?? 0) - (dist[a] ?? 0));
    return ['ALL', ...keys];
  }, [summary.triadDistribution]);
  const hasActiveFilter =
    filters.selectedTriad !== 'ALL' ||
    filters.selectedYoga !== 'ALL' ||
    filters.actionFilter !== 'ALL' ||
    filters.kotaFilter !== 'ALL' ||
    filters.sbcFilter !== 'ALL' ||
    filters.induFilter !== 'ALL' ||
    filters.taraFilter !== 'ALL' ||
    filters.minConfluence > 0 ||
    filters.mdLordFilter !== 'ALL' ||
    filters.adLordFilter !== 'ALL';

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
      {/* Row 1: Macro Filters (Triad, Yoga, Action, MD Lord, AD Lord, Reset) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>Triad:</span>
          {availableTriads.slice(0, 7).map((t) => {
            const count = t === 'ALL' ? summary.totalScanned : summary.triadDistribution?.[t];
            return (
              <button
                key={t}
                onClick={() => onChange('selectedTriad', t)}
                style={{
                  padding: '2px 7px',
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
                {t} {count !== undefined && count > 0 && <span style={{ opacity: 0.7, fontSize: '9px' }}>({count})</span>}
              </button>
            );
          })}
          {availableTriads.length > 7 && (
            <select
              value={filters.selectedTriad}
              onChange={(e) => onChange('selectedTriad', e.target.value)}
              style={{
                padding: '2px 6px',
                backgroundColor: '#111827',
                border: '1px solid #1E2638',
                color: '#00F2FE',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                fontWeight: 700,
              }}
            >
              <option value="ALL">More Triads ({availableTriads.length - 1} total)...</option>
              {availableTriads.slice(1).map((t) => (
                <option key={t} value={t}>
                  {t} ({summary.triadDistribution?.[t] ?? 0})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>Yoga:</span>
          <select
            value={filters.selectedYoga}
            onChange={(e) => onChange('selectedYoga', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All Yogas</option>
            <option value="VRY">Viparita Raja Yoga (VRY)</option>
            <option value="NBRY">Neecha Bhanga (NBRY)</option>
            <option value="DHANA">Dhana Yogas</option>
            <option value="MAHAPURUSHA">Pancha Mahapurusha</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>MD:</span>
          <select
            value={filters.mdLordFilter}
            onChange={(e) => onChange('mdLordFilter', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All MD</option>
            {VIMSHOTTARI_LORDS.map((p) => (
              <option key={p} value={p}>{p.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>AD:</span>
          <select
            value={filters.adLordFilter}
            onChange={(e) => onChange('adLordFilter', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All AD</option>
            {VIMSHOTTARI_LORDS.map((p) => (
              <option key={p} value={p}>{p.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>Action:</span>
          <select
            value={filters.actionFilter}
            onChange={(e) => onChange('actionFilter', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
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
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#1E2638',
              color: '#38BDF8',
              border: '1px solid #0284C7',
              cursor: 'pointer',
            }}
          >
            ↺ Reset
          </button>
        )}
      </div>

      {/* Row 2: Classical Confluence Filters (Indu Lagna, Kota Chakra, SBC, Tara Bala, Confluence Score) */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid rgba(30, 38, 56, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ color: '#D4AF37', fontSize: '10px', fontWeight: 800 }}>☸ CONFLUENCE:</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>SBC:</span>
          <select
            value={filters.sbcFilter}
            onChange={(e) => onChange('sbcFilter', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All SBC</option>
            <option value="SUBHA">✨ Subha Vedha</option>
            <option value="CLEAN">✓ Clean</option>
            <option value="AFFLICTED">✖ Papa Vedha</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>Indu Lagna:</span>
          <select
            value={filters.induFilter}
            onChange={(e) => onChange('induFilter', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All Indu</option>
            <option value="ACTIVE">💰 Active Wealth Ray</option>
            <option value="NEUTRAL">Neutral</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>Tara:</span>
          <select
            value={filters.taraFilter}
            onChange={(e) => onChange('taraFilter', e.target.value as any)}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value="ALL">All Tara</option>
            <option value="AUSPICIOUS">⭐ Auspicious</option>
            <option value="INAUSPICIOUS">⚠️ Inauspicious</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600 }}>Score:</span>
          <select
            value={filters.minConfluence}
            onChange={(e) => onChange('minConfluence', Number(e.target.value))}
            style={{ padding: '2px 6px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
          >
            <option value={0}>Any Score</option>
            <option value={4}>★ 4/4 Quad</option>
            <option value={3}>★ 3+/4 High</option>
            <option value={2}>★ 2+/4 Mod</option>
          </select>
        </div>
      </div>
    </div>
  );
};
