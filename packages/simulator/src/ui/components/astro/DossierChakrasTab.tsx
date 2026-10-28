/**
 * packages/simulator/src/ui/components/astro/DossierChakrasTab.tsx
 * Tab 3 of Horoscope Dossier: Special Raja Yogas, Indu Lagna Wealth Point, and Kota Fortress.
 * Enforces strict modularity (< 200 LOC, functions < 60 LOC, complexity <= 10).
 */

import React from 'react';
import type { CorporateRegistryRecord } from '../../../core/data/types';
import type { PlanetKey } from '../../../core/astro/types';
import type { DetailedPlanetPosition } from '../../../core/astro/ephemeris';
import { SIGN_NAMES } from '../../../core/astro/constants';
import { calculateInduLagnaSign, evaluateInduLagnaActivation } from '../../../core/astro/induLagna';
import { evaluateKotaChakra } from '../../../core/astro/kotaChakra';
import { calculateNakshatraAndBalance } from '../../../core/astro/vimshottari';

export interface DossierChakrasTabProps {
  metadata: CorporateRegistryRecord;
  yogas: any;
  transitPositions: Record<PlanetKey, DetailedPlanetPosition>;
  transitSigns: Partial<Record<PlanetKey, number>>;
}

export const DossierChakrasTab: React.FC<DossierChakrasTabProps> = ({
  metadata,
  yogas,
  transitPositions,
  transitSigns,
}) => {
  const lagnaId = metadata.lagna_sign_id ?? 0;
  const moonId = metadata.moon_sign_id ?? 0;

  const indu = calculateInduLagnaSign(lagnaId, moonId);
  const induActivation = evaluateInduLagnaActivation(indu.induLagnaSignId, transitSigns);

  const janmaNak = calculateNakshatraAndBalance(metadata.moon_deg).nakshatraIndex;
  const kota = evaluateKotaChakra(janmaNak, moonId, transitPositions);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <YogasSummarySection yogas={yogas} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <InduLagnaCard indu={indu} activation={induActivation} />
        <KotaSummaryCard kota={kota} />
      </div>
    </div>
  );
};

function YogasSummarySection({ yogas }: { yogas: any }) {
  return (
    <div style={{ backgroundColor: '#111827', padding: '12px', borderRadius: '6px', border: '1px solid #1E2638' }}>
      <div style={{ color: '#D4AF37', fontSize: '11px', fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase' }}>
        CLASSICAL ASTROLOGICAL YOGAS CONFIRMATION
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {yogas.activeYogaNames?.map((name: string) => (
          <div key={name} style={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '4px', padding: '4px 10px', fontSize: '11px', color: '#38BDF8', fontWeight: 700 }}>
            ★ {name}
          </div>
        ))}
        {(!yogas.activeYogaNames || yogas.activeYogaNames.length === 0) && (
          <div style={{ color: '#64748B', fontSize: '11px' }}>No major primary Raja Yogas detected on this date.</div>
        )}
      </div>
      {yogas.nbry?.reasons?.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '11px', color: '#A7F3D0' }}>
          <strong>NBRY Provenance:</strong> {yogas.nbry.reasons.join('; ')}
        </div>
      )}
      {yogas.vry?.reasons?.length > 0 && (
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#DDD6FE' }}>
          <strong>VRY Provenance:</strong> {yogas.vry.reasons.join('; ')}
        </div>
      )}
    </div>
  );
}

function InduLagnaCard({ indu, activation }: { indu: any; activation: any }) {
  const signName = SIGN_NAMES[indu.induLagnaSignId] ?? 'Aries';
  return (
    <div style={{ backgroundColor: '#111827', padding: '12px', borderRadius: '6px', border: '1px solid #1E2638' }}>
      <div style={{ color: '#D4AF37', fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
        💰 INDU LAGNA (WEALTH VECTOR)
      </div>
      <div style={{ fontSize: '12px', color: '#F1F5F9', fontWeight: 700 }}>
        Sign: <span style={{ color: '#00F2FE' }}>{signName}</span> (Total Kalas: {indu.totalKalas})
      </div>
      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
        Status:{' '}
        <strong style={{ color: activation.isInduActive ? '#10B981' : '#64748B' }}>
          {activation.isInduActive ? '● Active Wealth Ray' : 'Neutral'}
        </strong>
      </div>
      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
        Benefics in Kendra/Trikona: {activation.beneficPlanetsInKendraTrikona.length > 0 ? activation.beneficPlanetsInKendraTrikona.join(', ') : 'None'}
      </div>
    </div>
  );
}

function KotaSummaryCard({ kota }: { kota: any }) {
  const isFortified = kota.defenseScore >= 0.60;
  return (
    <div style={{ backgroundColor: '#111827', padding: '12px', borderRadius: '6px', border: '1px solid #1E2638' }}>
      <div style={{ color: '#D4AF37', fontSize: '11px', fontWeight: 800, marginBottom: '6px' }}>
        🛡 KOTA CHAKRA CITADEL DEFENSE
      </div>
      <div style={{ fontSize: '12px', color: '#F1F5F9', fontWeight: 700 }}>
        Defense Score:{' '}
        <span style={{ color: isFortified ? '#10B981' : '#EF4444' }}>
          {(kota.defenseScore * 100).toFixed(0)}% ({isFortified ? 'Fortified' : 'Under Pressure'})
        </span>
      </div>
      <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
        Citadel (Stambha): {kota.stambha.length > 0 ? kota.stambha.join(', ') : 'Clear'}
      </div>
      <div style={{ fontSize: '10px', color: '#64748B', marginTop: '4px' }}>
        Swami ({kota.kotaSwami}): {kota.swamiZone} | Pala ({kota.kotaPala}): {kota.palaZone}
      </div>
    </div>
  );
}

