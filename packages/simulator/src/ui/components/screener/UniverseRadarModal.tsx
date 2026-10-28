/**
 * packages/simulator/src/ui/components/screener/UniverseRadarModal.tsx
 * Market Universe Radar & Screener Modal with 4-fold Vedic Confluence.
 * Integrates Triads, Yogas, Kota Chakra, SBC, Indu Lagna, and Tara Bala.
 * Enforces strict modularity (< 200 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useMemo, useState } from 'react';
import type { CorporateRegistryRecord, QuarterlyFundamental } from '../../../core/data/types';
import {
  scanUniverse,
  filterUniverseByTriad,
  filterUniverseByYoga,
  filterUniverseByKota,
  filterUniverseBySBC,
  filterUniverseByInduLagna,
  filterUniverseByTara,
} from '../../../core/engine/universeScanner';
import { RadarFiltersBar, type RadarFiltersState } from './RadarFiltersBar';
import { RadarStockTable } from './RadarStockTable';

export interface UniverseRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDate: string;
  onSelectStock: (symbol: string) => void;
  registry: Record<string, CorporateRegistryRecord>;
  fundamentalsMap?: Record<string, QuarterlyFundamental[]>;
}

const INITIAL_FILTERS: RadarFiltersState = {
  selectedTriad: 'ALL',
  selectedYoga: 'ALL',
  actionFilter: 'ALL',
  kotaFilter: 'ALL',
  sbcFilter: 'ALL',
  induFilter: 'ALL',
  taraFilter: 'ALL',
  minConfluence: 0,
};

export const UniverseRadarModal: React.FC<UniverseRadarModalProps> = ({
  isOpen,
  onClose,
  activeDate,
  onSelectStock,
  registry,
  fundamentalsMap = {},
}) => {
  const [filters, setFilters] = useState<RadarFiltersState>(INITIAL_FILTERS);

  const effectiveDate = activeDate && activeDate.length >= 10 ? activeDate : '2005-01-01';
  const summary = useMemo(
    () => scanUniverse(registry, effectiveDate, fundamentalsMap),
    [registry, effectiveDate, fundamentalsMap]
  );

  const filteredItems = useMemo(() => {
    let res = summary.items;
    res = filterUniverseByTriad(res, filters.selectedTriad);
    res = filterUniverseByYoga(res, filters.selectedYoga);
    res = filterUniverseByKota(res, filters.kotaFilter);
    res = filterUniverseBySBC(res, filters.sbcFilter);
    res = filterUniverseByInduLagna(res, filters.induFilter);
    res = filterUniverseByTara(res, filters.taraFilter);

    if (filters.minConfluence > 0) {
      res = res.filter((i) => i.confluenceScore >= filters.minConfluence);
    }

    if (filters.actionFilter === 'BLOCKED') {
      res = res.filter((i) => i.isBlocked);
    } else if (filters.actionFilter !== 'ALL') {
      res = res.filter((i) => i.action === filters.actionFilter && !i.isBlocked);
    }
    return res;
  }, [summary.items, filters]);

  const handleFilterChange = <K extends keyof RadarFiltersState>(key: K, value: RadarFiltersState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleResetFilters = () => {
    setFilters(INITIAL_FILTERS);
  };

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
          width: '96%',
          maxWidth: '1280px',
          maxHeight: '88vh',
          backgroundColor: '#0B0E14',
          border: '1px solid #1E2638',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          overflow: 'hidden',
        }}
      >
        <RadarHeader activeDate={activeDate} total={summary.totalScanned} matchedCount={filteredItems.length} onClose={onClose} />
        <RadarFiltersBar
          filters={filters}
          onChange={handleFilterChange}
          onReset={handleResetFilters}
          summary={summary}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <RadarStockTable
            items={filteredItems}
            onSelect={(sym) => {
              onSelectStock(sym);
              onClose();
            }}
            onResetFilters={handleResetFilters}
          />
        </div>
      </div>
    </div>
  );
};

function RadarHeader({
  activeDate,
  total,
  matchedCount,
  onClose,
}: {
  activeDate: string;
  total: number;
  matchedCount: number;
  onClose: () => void;
}) {
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
          Date: <strong style={{ color: '#F8FAFC' }}>{activeDate}</strong> ({total} stocks scanned | <strong style={{ color: '#38BDF8' }}>{matchedCount}</strong> matched)
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
