/**
 * packages/simulator/src/ui/components/astro/DossierKundliTab.tsx
 * Tab 1 of Horoscope Dossier: Ceremonial Lagna, Rashi, Lordships, and 9-Graha Dignity Table.
 * Enforces strict modularity (< 200 LOC, functions < 60 LOC, complexity <= 10).
 */

import React from 'react';
import type { CorporateRegistryRecord } from '../../../core/data/types';
import type { PlanetKey } from '../../../core/astro/types';
import type { DetailedPlanetPosition } from '../../../core/astro/ephemeris';
import { SIGN_NAMES, SIGN_LORDS } from '../../../core/astro/constants';
import { EXALTATION_SIGNS, DEBILITATION_SIGNS, OWN_SIGNS } from '../../../core/astro/yogaDetector';

export interface DossierKundliTabProps {
  metadata: CorporateRegistryRecord;
  lordships: any;
  transitPositions: Record<PlanetKey, DetailedPlanetPosition>;
  lagnaId: number;
}

export const DossierKundliTab: React.FC<DossierKundliTabProps> = ({
  metadata,
  lordships,
  transitPositions,
  lagnaId,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <HoroscopeOverview metadata={metadata} lordships={lordships} />
      <GrahaDignityTable transitPositions={transitPositions} lagnaId={lagnaId} />
    </div>
  );
};

function HoroscopeOverview({ metadata, lordships }: { metadata: CorporateRegistryRecord; lordships: any }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', backgroundColor: '#111827', padding: '12px', borderRadius: '6px', border: '1px solid #1E2638' }}>
      <div>
        <div style={{ color: '#94A3B8', fontSize: '10px' }}>CEREMONIAL LAGNA (1H)</div>
        <div style={{ color: '#00F2FE', fontSize: '13px', fontWeight: 800 }}>
          {metadata.lagna_sign} ({metadata.lagna_deg?.toFixed(2)}°)
        </div>
        <div style={{ color: '#64748B', fontSize: '10px' }}>Lord: {lordships.lagnaLord?.toUpperCase()}</div>
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
          &#123;{lordships.trikonaLords?.join(', ')}&#125;
        </div>
        <div style={{ color: '#64748B', fontSize: '10px' }}>Lords of 1H, 5H, 9H</div>
      </div>
      <div>
        <div style={{ color: '#94A3B8', fontSize: '10px' }}>DUSTHANA [D] SET</div>
        <div style={{ color: '#F87171', fontSize: '12px', fontWeight: 800, fontFamily: 'monospace' }}>
          &#123;{lordships.dusthanaLords?.join(', ')}&#125;
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
            if (!pos) return null;
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

