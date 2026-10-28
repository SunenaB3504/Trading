/**
 * packages/simulator/src/ui/components/screener/UniverseRadarModal.tsx
 * Market Universe Radar & 27-Triad Screener Drawer/Modal.
 * Enforces strict modularity (< 400 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useMemo, useState } from 'react';
import type { CorporateRegistryRecord, QuarterlyFundamental } from '../../../core/data/types';
import {
  scanUniverse,
  filterUniverseByTriad,
  filterUniverseByYoga,
  type UniverseStockScanItem,
} from '../../../core/engine/universeScanner';

export interface UniverseRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDate: string;
  onSelectStock: (symbol: string) => void;
  registry: Record<string, CorporateRegistryRecord>;
  fundamentalsMap?: Record<string, QuarterlyFundamental[]>;
}

export const UniverseRadarModal: React.FC<UniverseRadarModalProps> = ({
  isOpen,
  onClose,
  activeDate,
  onSelectStock,
  registry,
  fundamentalsMap = {},
}) => {
  const [selectedTriad, setSelectedTriad] = useState<string>('ALL');
  const [selectedYoga, setSelectedYoga] = useState<'ALL' | 'VRY' | 'NBRY' | 'DHANA' | 'MAHAPURUSHA'>('ALL');
  const [actionFilter, setActionFilter] = useState<'ALL' | 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED'>('ALL');

  const effectiveDate = activeDate && activeDate.length >= 10 ? activeDate : '2005-01-01';
  const summary = useMemo(
    () => scanUniverse(registry, effectiveDate, fundamentalsMap),
    [registry, effectiveDate, fundamentalsMap]
  );

  const filteredItems = useMemo(() => {
    let res = summary.items;
    res = filterUniverseByTriad(res, selectedTriad);
    res = filterUniverseByYoga(res, selectedYoga);
    if (actionFilter === 'BLOCKED') {
      res = res.filter((i) => i.isBlocked);
    } else if (actionFilter !== 'ALL') {
      res = res.filter((i) => i.action === actionFilter && !i.isBlocked);
    }
    return res;
  }, [summary.items, selectedTriad, selectedYoga, actionFilter]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        backgroundColor: 'rgba(7, 9, 14, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '95%',
          maxWidth: '1200px',
          maxHeight: '85vh',
          backgroundColor: '#0B0E14',
          border: '1px solid #1E2638',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        <Header activeDate={activeDate} total={summary.totalScanned} onClose={onClose} />
        <FiltersBar
          selectedTriad={selectedTriad}
          onSelectTriad={setSelectedTriad}
          selectedYoga={selectedYoga}
          onSelectYoga={setSelectedYoga}
          actionFilter={actionFilter}
          onSelectAction={setActionFilter}
          summary={summary}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <StockTable
            items={filteredItems}
            onSelect={(sym) => {
              onSelectStock(sym);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
};

function Header({ activeDate, total, onClose }: { activeDate: string; total: number; onClose: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 18px',
        borderBottom: '1px solid #1E2638',
        backgroundColor: '#07090E',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: '#D4AF37', fontSize: '14px', fontWeight: 900 }}>☵ MARKET UNIVERSE RADAR</span>
        <span style={{ color: '#64748B', fontSize: '12px' }}>|</span>
        <span style={{ color: '#94A3B8', fontSize: '12px', fontFamily: 'monospace' }}>
          Date: <strong style={{ color: '#F8FAFC' }}>{activeDate}</strong> ({total} stocks scanned)
        </span>
      </div>
      <button
        onClick={onClose}
        style={{
          padding: '4px 10px',
          borderRadius: '4px',
          backgroundColor: '#1E2638',
          color: '#94A3B8',
          border: 'none',
          cursor: 'pointer',
          fontWeight: 700,
        }}
      >
        ✕ Close
      </button>
    </div>
  );
}

function FiltersBar({
  selectedTriad,
  onSelectTriad,
  selectedYoga,
  onSelectYoga,
  actionFilter,
  onSelectAction,
  summary,
}: {
  selectedTriad: string;
  onSelectTriad: (t: string) => void;
  selectedYoga: 'ALL' | 'VRY' | 'NBRY' | 'DHANA' | 'MAHAPURUSHA';
  onSelectYoga: (y: 'ALL' | 'VRY' | 'NBRY' | 'DHANA' | 'MAHAPURUSHA') => void;
  actionFilter: 'ALL' | 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED';
  onSelectAction: (a: 'ALL' | 'BUY' | 'SELL' | 'HOLD' | 'BLOCKED') => void;
  summary: { strongBuyCount: number; turnaroundBuyCount: number; blockedCount: number };
}) {
  const triads = ['ALL', '[T-T-T]', '[D-T-T]', '[D-D-D]', '[T-D-T]', '[K-T-T]'];
  return (
    <div style={{ padding: '10px 18px', borderBottom: '1px solid #1E2638', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>Triad:</span>
        {triads.map((t) => (
          <button
            key={t}
            onClick={() => onSelectTriad(t)}
            style={{
              padding: '3px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
              fontWeight: 700,
              backgroundColor: selectedTriad === t ? '#D4AF37' : '#111827',
              color: selectedTriad === t ? '#07090E' : '#CBD5E1',
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
          value={selectedYoga}
          onChange={(e) => onSelectYoga(e.target.value as any)}
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
          value={actionFilter}
          onChange={(e) => onSelectAction(e.target.value as any)}
          style={{ padding: '3px 8px', backgroundColor: '#111827', border: '1px solid #1E2638', color: '#F8FAFC', borderRadius: '4px', fontSize: '11px' }}
        >
          <option value="ALL">All Actions</option>
          <option value="BUY">BUY Only ({summary.strongBuyCount + summary.turnaroundBuyCount})</option>
          <option value="SELL">SELL Only</option>
          <option value="BLOCKED">Risk Vetoed ({summary.blockedCount})</option>
        </select>
      </div>
    </div>
  );
}

function StockTable({ items, onSelect }: { items: UniverseStockScanItem[]; onSelect: (sym: string) => void }) {
  if (items.length === 0) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>No universe constituents match the active filter criteria.</div>;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr style={{ color: '#94A3B8', borderBottom: '1px solid #1E2638', textAlign: 'left' }}>
          <th style={{ padding: '8px' }}>Symbol</th>
          <th style={{ padding: '8px' }}>Lagna</th>
          <th style={{ padding: '8px' }}>Triad</th>
          <th style={{ padding: '8px' }}>Lords (MD-AD-PD)</th>
          <th style={{ padding: '8px' }}>Special Yogas</th>
          <th style={{ padding: '8px' }}>Cusp</th>
          <th style={{ padding: '8px' }}>Signal / Action</th>
          <th style={{ padding: '8px' }}>Sizing</th>
          <th style={{ padding: '8px', textAlign: 'right' }}>Cockpit</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <StockTableRow key={item.symbol} item={item} onSelect={onSelect} />
        ))}
      </tbody>
    </table>
  );
}

function StockTableRow({ item, onSelect }: { item: UniverseStockScanItem; onSelect: (sym: string) => void }) {
  const actionColor = item.isBlocked ? '#EF4444' : item.action === 'BUY' ? '#10B981' : item.action === 'SELL' ? '#F59E0B' : '#64748B';
  return (
    <tr
      onClick={() => onSelect(item.symbol)}
      style={{ borderBottom: '1px solid #111827', cursor: 'pointer', transition: 'background-color 0.1s' }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#111827')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
    >
      <td style={{ padding: '8px', fontWeight: 800, color: '#D4AF37' }}>{item.symbol}</td>
      <td style={{ padding: '8px', color: '#CBD5E1' }}>{item.lagnaSignName} (1L {item.lagnaLord})</td>
      <td style={{ padding: '8px', fontFamily: 'monospace', fontWeight: 700, color: '#00F2FE' }}>{item.triadCode}</td>
      <td style={{ padding: '8px', color: '#94A3B8', fontFamily: 'monospace' }}>{item.mdLord}-{item.adLord}-{item.pdLord}</td>
      <td style={{ padding: '8px' }}>
        {item.activeYogas.length > 0 ? (
          <span style={{ color: '#38BDF8', fontWeight: 600 }}>{item.activeYogas.slice(0, 2).join(', ')}</span>
        ) : (
          <span style={{ color: '#475569' }}>—</span>
        )}
      </td>
      <td style={{ padding: '8px', color: '#F1F5F9' }}>{item.daysToCusp}d remaining</td>
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
          Deep Dive ↗
        </button>
      </td>
    </tr>
  );
}

