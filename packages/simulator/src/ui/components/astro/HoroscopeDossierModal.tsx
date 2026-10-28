/**
 * packages/simulator/src/ui/components/astro/HoroscopeDossierModal.tsx
 * Full-screen deep-dive instrument horoscope with 3-tab unified navigation:
 * 1. Natal Kundli & Dignities | 2. Dasha Timeline & Roadmap | 3. Chakras & Yogas.
 * Enforces strict modularity (< 200 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useMemo, useState } from 'react';
import type { CorporateRegistryRecord } from '../../../core/data/types';
import type { PlanetKey } from '../../../core/astro/types';
import { calculateTransitPositions, type DetailedPlanetPosition } from '../../../core/astro/ephemeris';
import { evaluateSpecialYogas } from '../../../core/astro/yogaDetector';
import { deriveLagnaLordships } from '../../../core/astro/trikonaNathans';
import { getOrComputeJathakam } from '../../../core/astro/jathakaCache';
import { DossierKundliTab } from './DossierKundliTab';
import { DossierDashaTimelineTab } from './DossierDashaTimelineTab';
import { DossierChakrasTab } from './DossierChakrasTab';

export interface HoroscopeDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: CorporateRegistryRecord | null;
  activeDate: string;
}

type DossierTabKey = 'KUNDLI' | 'TIMELINE' | 'CHAKRAS';

export const HoroscopeDossierModal: React.FC<HoroscopeDossierModalProps> = ({
  isOpen,
  onClose,
  metadata,
  activeDate,
}) => {
  const [activeTab, setActiveTab] = useState<DossierTabKey>('KUNDLI');

  const jathakam = useMemo(() => {
    if (!metadata) return null;
    return getOrComputeJathakam(metadata, activeDate);
  }, [metadata, activeDate]);

  const transitPositions = useMemo(
    () => calculateTransitPositions(activeDate && activeDate.length >= 10 ? activeDate : '2005-01-01'),
    [activeDate]
  );

  const lagnaId = metadata?.lagna_sign_id ?? 0;
  const moonId = metadata?.moon_sign_id ?? 0;

  const transitSigns = useMemo(() => {
    const res: Partial<Record<PlanetKey, number>> = {};
    for (const [p, val] of Object.entries(transitPositions) as [PlanetKey, DetailedPlanetPosition][]) {
      res[p] = val.signIndex;
    }
    return res as Record<PlanetKey, number>;
  }, [transitPositions]);

  const navSigns = useMemo(() => {
    const res: Partial<Record<PlanetKey, number>> = {};
    for (const [p, val] of Object.entries(transitPositions) as [PlanetKey, DetailedPlanetPosition][]) {
      res[p] = val.navamshaSignIndex;
    }
    return res;
  }, [transitPositions]);

  const yogas = useMemo(() => {
    return evaluateSpecialYogas({
      lagnaSignId: lagnaId,
      moonSignId: moonId,
      planetSigns: transitSigns,
      navamshaSigns: navSigns,
    });
  }, [lagnaId, moonId, transitSigns, navSigns]);

  const lordships = useMemo(() => jathakam?.lordships ?? deriveLagnaLordships(lagnaId), [jathakam, lagnaId]);

  if (!isOpen || !metadata) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 110,
        backgroundColor: 'rgba(7, 9, 14, 0.88)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '95%',
          maxWidth: '1180px',
          maxHeight: '88vh',
          backgroundColor: '#0B0E14',
          border: '1px solid #1E2638',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
          overflow: 'hidden',
        }}
      >
        <DossierHeader metadata={metadata} onClose={onClose} />
        <DossierTabBar activeTab={activeTab} onSelect={setActiveTab} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
          {activeTab === 'KUNDLI' && (
            <DossierKundliTab
              metadata={metadata}
              lordships={lordships}
              transitPositions={transitPositions}
              lagnaId={lagnaId}
            />
          )}

          {activeTab === 'TIMELINE' && (
            <DossierDashaTimelineTab metadata={metadata} activeDate={activeDate} />
          )}

          {activeTab === 'CHAKRAS' && (
            <DossierChakrasTab
              metadata={metadata}
              yogas={yogas}
              transitPositions={transitPositions}
              transitSigns={transitSigns}
            />
          )}
        </div>
      </div>
    </div>
  );
};

function DossierHeader({ metadata, onClose }: { metadata: CorporateRegistryRecord; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px', borderBottom: '1px solid #1E2638', backgroundColor: '#07090E' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#D4AF37', fontSize: '15px', fontWeight: 900 }}>☸ HOROSCOPIC DOSSIER:</span>
          <span style={{ color: '#F8FAFC', fontSize: '15px', fontWeight: 800 }}>{metadata.company_name} ({metadata.symbol})</span>
        </div>
        <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>
          Listing: {metadata.listing_date} at {metadata.listing_time || '10:00:00'} IST | Venue: NSE Mumbai ({metadata.latitude}N, {metadata.longitude}E)
        </div>
      </div>
      <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#1E2638', color: '#CBD5E1', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
        ✕ Close
      </button>
    </div>
  );
}

function DossierTabBar({ activeTab, onSelect }: { activeTab: DossierTabKey; onSelect: (t: DossierTabKey) => void }) {
  const tabs: { key: DossierTabKey; label: string }[] = [
    { key: 'KUNDLI', label: '☸ Natal Kundli & Dignities' },
    { key: 'TIMELINE', label: '⌛ Dasha Timeline & Roadmap' },
    { key: 'CHAKRAS', label: '🛡 Chakras & Special Yogas' },
  ];

  return (
    <div style={{ display: 'flex', gap: '8px', padding: '8px 20px', backgroundColor: '#090C12', borderBottom: '1px solid #1E2638' }}>
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onSelect(t.key)}
          style={{
            padding: '6px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            backgroundColor: activeTab === t.key ? '#D4AF37' : '#111827',
            color: activeTab === t.key ? '#07090E' : '#94A3B8',
            border: activeTab === t.key ? '1px solid #F59E0B' : '1px solid #1E2638',
            transition: 'all 0.1s',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
