/**
 * packages/simulator/src/ui/components/astro/HoroscopeDossierModal.tsx
 * Full-screen deep-dive instrument horoscope with D1/D9 dignities & yogas.
 * Enforces strict modularity (< 400 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useMemo } from 'react';
import type { CorporateRegistryRecord } from '../../../core/data/types';
import type { PlanetKey } from '../../../core/astro/types';
import { SIGN_NAMES, SIGN_LORDS } from '../../../core/astro/constants';
import { calculateTransitPositions, type DetailedPlanetPosition } from '../../../core/astro/ephemeris';
import { evaluateSpecialYogas, EXALTATION_SIGNS, DEBILITATION_SIGNS, OWN_SIGNS } from '../../../core/astro/yogaDetector';
import { deriveLagnaLordships } from '../../../core/astro/trikonaNathans';

export interface HoroscopeDossierModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: CorporateRegistryRecord | null;
  activeDate: string;
}

export const HoroscopeDossierModal: React.FC<HoroscopeDossierModalProps> = ({
  isOpen,
  onClose,
  metadata,
  activeDate,
}) => {
  const transitPositions = useMemo(
    () => calculateTransitPositions(activeDate || '2026-10-05'),
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

  const lordships = useMemo(() => deriveLagnaLordships(lagnaId), [lagnaId]);

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
          maxWidth: '1150px',
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <HoroscopeOverview metadata={metadata} lordships={lordships} />
          <GrahaDignityTable transitPositions={transitPositions} lagnaId={lagnaId} />
          <YogasSummarySection yogas={yogas} />
        </div>
      </div>
    </div>
  );
};

function DossierHeader({ metadata, onClose }: { metadata: CorporateRegistryRecord; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: '1px solid #1E2638', backgroundColor: '#07090E' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#D4AF37', fontSize: '15px', fontWeight: 900 }}>☸ HOROSCOPIC DOSSIER:</span>
          <span style={{ color: '#F8FAFC', fontSize: '15px', fontWeight: 800 }}>{metadata.company_name} ({metadata.symbol})</span>
        </div>
        <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '3px' }}>
          Listing: {metadata.listing_date} at {metadata.listing_time || '10:00:00'} IST | Venue: NSE Mumbai ({metadata.latitude}N, {metadata.longitude}E)
        </div>
      </div>
      <button onClick={onClose} style={{ padding: '6px 12px', borderRadius: '4px', backgroundColor: '#1E2638', color: '#CBD5E1', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
        ✕ Close
      </button>
    </div>
  );
}

function HoroscopeOverview({ metadata, lordships }: { metadata: CorporateRegistryRecord; lordships: any }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', backgroundColor: '#111827', padding: '12px', borderRadius: '6px', border: '1px solid #1E2638' }}>
      <div>
        <div style={{ color: '#94A3B8', fontSize: '10px' }}>CEREMONIAL LAGNA (1H)</div>
        <div style={{ color: '#00F2FE', fontSize: '13px', fontWeight: 800 }}>
          {metadata.lagna_sign} ({metadata.lagna_deg?.toFixed(2)}°)
        </div>
        <div style={{ color: '#64748B', fontSize: '10px' }}>Lord: {lordships.lagnaLord.toUpperCase()}</div>
      </div>
      <div>
        <div style={{ color: '#94A3B8', fontSize: '10px' }}>NATAL JANMA RASHI</div>
        <div style={{ color: '#F8FAFC', fontSize: '13px', fontWeight: 800 }}>
          {metadata.moon_sign} ({metadata.moon_deg?.toFixed(2)}°)
        </div>
        <div style={{ color: '#64748B', fontSize: '10px' }}>Nakshatra: {metadata.moon_nakshatra} (Pada {metadata.pada})</div>
      </div>
      <div>
        <div style={{ color: '#94A3B8', fontSize: '10px' }}>TRIKONA NATHANS [T] SET</div>
        <div style={{ color: '#34D399', fontSize: '12px', fontWeight: 800, fontFamily: 'monospace' }}>
          &#123;{lordships.trikonaLords.join(', ')}&#125;
        </div>
        <div style={{ color: '#64748B', fontSize: '10px' }}>Lords of 1H, 5H, 9H</div>
      </div>
      <div>
        <div style={{ color: '#94A3B8', fontSize: '10px' }}>DUSTHANA [D] SET</div>
        <div style={{ color: '#F87171', fontSize: '12px', fontWeight: 800, fontFamily: 'monospace' }}>
          &#123;{lordships.dusthanaLords.join(', ')}&#125;
        </div>
        <div style={{ color: '#64748B', fontSize: '10px' }}>Trishadaya & 8H/12H Lords</div>
      </div>
    </div>
  );
}

function GrahaDignityTable({
  transitPositions,
  lagnaId,
}: {
  transitPositions: Record<PlanetKey, DetailedPlanetPosition>;
  lagnaId: number;
}) {
  const planets: PlanetKey[] = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn', 'rahu', 'ketu'];

  return (
    <div style={{ backgroundColor: '#111827', padding: '12px', borderRadius: '6px', border: '1px solid #1E2638' }}>
      <div style={{ color: '#D4AF37', fontSize: '11px', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
        9-GRAHA PLANETARY PLACEMENT & DIGNITY AUDIT
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ color: '#94A3B8', borderBottom: '1px solid #1E2638', textAlign: 'left' }}>
            <th style={{ padding: '6px' }}>Graha</th>
            <th style={{ padding: '6px' }}>D1 Rashi Sign</th>
            <th style={{ padding: '6px' }}>House</th>
            <th style={{ padding: '6px' }}>Degree</th>
            <th style={{ padding: '6px' }}>D9 Navamsha</th>
            <th style={{ padding: '6px' }}>Dignity State</th>
          </tr>
        </thead>
        <tbody>
          {planets.map((p) => {
            const pos = transitPositions[p];
            const sign = pos.signIndex;
            const house = (((sign - lagnaId + 12) % 12) + 1);
            const dignity = getDignityLabel(p, sign);
            return (
              <tr key={p} style={{ borderBottom: '1px solid #1A2234' }}>
                <td style={{ padding: '6px', fontWeight: 800, color: '#F8FAFC', textTransform: 'capitalize' }}>{p}</td>
                <td style={{ padding: '6px', color: '#CBD5E1' }}>{SIGN_NAMES[sign]} (Lord: {SIGN_LORDS[sign]})</td>
                <td style={{ padding: '6px', color: '#00F2FE', fontWeight: 700 }}>{house}H</td>
                <td style={{ padding: '6px', fontFamily: 'monospace', color: '#94A3B8' }}>{pos.degreeInSign.toFixed(2)}°</td>
                <td style={{ padding: '6px', color: '#E2E8F0' }}>{SIGN_NAMES[pos.navamshaSignIndex]}</td>
                <td style={{ padding: '6px' }}>
                  <span style={{ ...dignity.style, padding: '2px 6px', borderRadius: '3px', fontSize: '10px', fontWeight: 700 }}>
                    {dignity.text}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getDignityLabel(p: PlanetKey, sign: number): { text: string; style: React.CSSProperties } {
  if (sign === EXALTATION_SIGNS[p]) {
    return { text: 'UCCHA (Exalted)', style: { backgroundColor: '#064E3B', color: '#34D399' } };
  }
  if (sign === DEBILITATION_SIGNS[p]) {
    return { text: 'NEECHA (Debilitated)', style: { backgroundColor: '#450A0A', color: '#F87171' } };
  }
  if (OWN_SIGNS[p]?.includes(sign)) {
    return { text: 'SWAKSHETRA (Own Sign)', style: { backgroundColor: '#1E3A8A', color: '#60A5FA' } };
  }
  return { text: 'NEUTRAL', style: { backgroundColor: '#1E293B', color: '#94A3B8' } };
}

function YogasSummarySection({ yogas }: { yogas: any }) {
  return (
    <div style={{ backgroundColor: '#111827', padding: '12px', borderRadius: '6px', border: '1px solid #1E2638' }}>
      <div style={{ color: '#D4AF37', fontSize: '11px', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
        CLASSICAL ASTROLOGICAL YOGAS CONFIRMATION
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {yogas.activeYogaNames.map((name: string) => (
          <div key={name} style={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>
            ★ {name}
          </div>
        ))}
        {yogas.activeYogaNames.length === 0 && (
          <div style={{ color: '#64748B', fontSize: '11px' }}>No major primary Raja Yogas detected on this date.</div>
        )}
      </div>
      {yogas.nbry.reasons.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#A7F3D0' }}>
          <strong>NBRY Provenance:</strong> {yogas.nbry.reasons.join('; ')}
        </div>
      )}
      {yogas.vry.reasons.length > 0 && (
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#DDD6FE' }}>
          <strong>VRY Provenance:</strong> {yogas.vry.reasons.join('; ')}
        </div>
      )}
    </div>
  );
}
