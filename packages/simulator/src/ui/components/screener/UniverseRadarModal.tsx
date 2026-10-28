/**
 * packages/simulator/src/ui/components/screener/UniverseRadarModal.tsx
 * Market Universe Radar & Forward Astrological Screener Modal.
 * Supports past, present, and future date evaluation (+1M, +6M, +1Y forward forecasting).
 * Enforces strict modularity (< 220 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useMemo, useState, useEffect } from 'react';
import type { CorporateRegistryRecord, QuarterlyFundamental } from '../../../core/data/types';
import {
  scanUniverse,
  filterUniverseByTriad,
  filterUniverseByYoga,
  filterUniverseByKota,
  filterUniverseBySBC,
  filterUniverseByInduLagna,
  filterUniverseByTara,
  filterUniverseByDashaLord,
} from '../../../core/engine/universeScanner';
import { RadarFiltersBar, type RadarFiltersState } from './RadarFiltersBar';
import { RadarStockTable } from './RadarStockTable';

export interface UniverseRadarModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeDate: string;
  onSelectStock: (symbol: string, targetDate?: string) => void;
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
  mdLordFilter: 'ALL',
  adLordFilter: 'ALL',
};

const MS_PER_DAY = 86400000;

export const UniverseRadarModal: React.FC<UniverseRadarModalProps> = ({
  isOpen,
  onClose,
  activeDate,
  onSelectStock,
  registry,
  fundamentalsMap = {},
}) => {
  const initialDate = activeDate && activeDate.length >= 10 ? activeDate : '2005-01-01';
  const [scanDate, setScanDate] = useState<string>(initialDate);
  const [filters, setFilters] = useState<RadarFiltersState>(INITIAL_FILTERS);
  const [language, setLanguage] = useState<'ML' | 'EN'>('ML');

  useEffect(() => {
    if (activeDate && activeDate.length >= 10) {
      setScanDate(activeDate);
    }
  }, [activeDate]);

  const stepDate = (days: number) => {
    const current = new Date(`${scanDate}T12:00:00+05:30`).getTime();
    const next = new Date(current + days * MS_PER_DAY).toISOString().slice(0, 10);
    setScanDate(next);
  };

  const summary = useMemo(
    () => scanUniverse(registry, scanDate, fundamentalsMap),
    [registry, scanDate, fundamentalsMap]
  );

  const filteredItems = useMemo(() => {
    let res = summary.items;
    res = filterUniverseByTriad(res, filters.selectedTriad);
    res = filterUniverseByYoga(res, filters.selectedYoga);
    res = filterUniverseByDashaLord(res, 'MD', filters.mdLordFilter);
    res = filterUniverseByDashaLord(res, 'AD', filters.adLordFilter);
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
        <RadarHeader
          scanDate={scanDate}
          activeDate={activeDate}
          onDateChange={setScanDate}
          onStepDate={stepDate}
          onSyncSession={() => setScanDate(activeDate)}
          total={summary.totalScanned}
          matchedCount={filteredItems.length}
          onClose={onClose}
          language={language}
          onLanguageChange={setLanguage}
        />
        <RadarFiltersBar
          filters={filters}
          onChange={handleFilterChange}
          onReset={() => setFilters(INITIAL_FILTERS)}
          summary={summary}
        />
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <RadarStockTable
            items={filteredItems}
            onSelect={(sym) => {
              onSelectStock(sym, scanDate);
              onClose();
            }}
            onResetFilters={() => setFilters(INITIAL_FILTERS)}
            language={language}
          />
        </div>
      </div>
    </div>
  );
};

function RadarHeader({
  scanDate,
  activeDate,
  onDateChange,
  onStepDate,
  onSyncSession,
  total,
  matchedCount,
  onClose,
  language,
  onLanguageChange,
}: {
  scanDate: string;
  activeDate: string;
  onDateChange: (d: string) => void;
  onStepDate: (days: number) => void;
  onSyncSession: () => void;
  total: number;
  matchedCount: number;
  onClose: () => void;
  language: 'ML' | 'EN';
  onLanguageChange: (lang: 'ML' | 'EN') => void;
}) {
  const isFuture = scanDate > activeDate;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 18px',
        borderBottom: '1px solid #1E2638',
        backgroundColor: '#07090E',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ color: '#D4AF37', fontSize: '13px', fontWeight: 900 }}>☵ MARKET UNIVERSE RADAR</span>
        <span style={{ color: '#64748B' }}>|</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>Eval Date:</span>
          <input
            type="date"
            value={scanDate}
            onChange={(e) => onDateChange(e.target.value)}
            style={{
              padding: '2px 6px',
              backgroundColor: '#111827',
              border: '1px solid #1E2638',
              color: '#F8FAFC',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'monospace',
            }}
          />

          <button onClick={() => onStepDate(30)} style={stepBtnStyle}>+1M</button>
          <button onClick={() => onStepDate(182)} style={stepBtnStyle}>+6M</button>
          <button onClick={() => onStepDate(365)} style={stepBtnStyle}>+1Y</button>
          {scanDate !== activeDate && (
            <button onClick={onSyncSession} style={{ ...stepBtnStyle, color: '#38BDF8', borderColor: '#0284C7' }}>
              ↺ Sync ({activeDate})
            </button>
          )}

          {isFuture && (
            <span style={{ fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '3px', backgroundColor: '#312E81', color: '#818CF8' }}>
              🔮 FORWARD FORECAST
            </span>
          )}
        </div>

        <span style={{ color: '#64748B' }}>|</span>
        <span style={{ color: '#94A3B8', fontSize: '11px', fontFamily: 'monospace' }}>
          {total} scanned | <strong style={{ color: '#38BDF8' }}>{matchedCount}</strong> matched
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Language Switcher (Option C) */}
        <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#111827', borderRadius: '4px', border: '1px solid #1E2638', padding: '2px' }}>
          <button
            onClick={() => onLanguageChange('ML')}
            style={{
              padding: '2px 8px',
              borderRadius: '3px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: language === 'ML' ? '#D4AF37' : 'transparent',
              color: language === 'ML' ? '#07090E' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            മലയാളം
          </button>
          <button
            onClick={() => onLanguageChange('EN')}
            style={{
              padding: '2px 8px',
              borderRadius: '3px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: language === 'EN' ? '#D4AF37' : 'transparent',
              color: language === 'EN' ? '#07090E' : '#94A3B8',
              transition: 'all 0.15s ease',
            }}
          >
            English
          </button>
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
    </div>
  );
}

const stepBtnStyle: React.CSSProperties = {
  padding: '2px 6px',
  borderRadius: '3px',
  fontSize: '10px',
  fontWeight: 700,
  backgroundColor: '#111827',
  color: '#CBD5E1',
  border: '1px solid #1E2638',
  cursor: 'pointer',
};
