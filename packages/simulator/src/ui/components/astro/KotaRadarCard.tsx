/**
 * packages/simulator/src/ui/components/astro/KotaRadarCard.tsx
 * 4-Zone Concentric Fortress Radar (Stambha, Madhya, Kantaka, Bahya).
 * Shows siege status, defense score, and breach warnings.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC, complexity <= 10).
 */

import React from 'react';
import type { KotaChakraState } from '../../../core/astro/types';

export interface KotaRadarCardProps {
  kotaState: KotaChakraState | null;
}

function ZoneRow({ name, planets, isCitadel }: { name: string; planets: string[]; isCitadel?: boolean }): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 10px',
        borderRadius: '6px',
        backgroundColor: isCitadel ? '#1E1B4B' : '#111827',
        border: `1px solid ${isCitadel ? '#6366F1' : '#1F2937'}`,
        fontSize: '11px',
      }}
    >
      <span style={{ color: isCitadel ? '#A5B4FC' : '#9CA3AF', fontWeight: 600 }}>{name}</span>
      <span style={{ color: '#F3F4F6', fontFamily: 'monospace', textTransform: 'capitalize' }}>
        {planets.length > 0 ? planets.join(', ') : '—'}
      </span>
    </div>
  );
}

export const KotaRadarCard: React.FC<KotaRadarCardProps> = ({ kotaState }) => {
  if (!kotaState) {
    return (
      <div style={{ padding: '16px', background: '#0F131C', borderRadius: '8px', color: '#64748B' }}>
        No Kota Chakra telemetry active.
      </div>
    );
  }

  const isBreached = kotaState.defenseScore < 0.35;
  const scorePct = Math.round(kotaState.defenseScore * 100);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: '#0B0E14',
        border: `1px solid ${isBreached ? '#DC2626' : '#1E2638'}`,
        borderRadius: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#D4AF37', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em' }}>
          KOTA CHAKRA FORTRESS RADAR
        </span>
        <span
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: isBreached ? '#7F1D1D' : '#064E3B',
            color: isBreached ? '#FCA5A5' : '#6EE7B7',
          }}
        >
          {isBreached ? 'FORTRESS BREACHED' : 'FORTIFIED'} ({scorePct}%)
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <ZoneRow name="1. Stambha (Central Citadel)" planets={kotaState.stambha} isCitadel />
        <ZoneRow name="2. Madhya (Inner Courtyard)" planets={kotaState.madhya} />
        <ZoneRow name="3. Kantaka (Rampart Bastions)" planets={kotaState.kantaka} />
        <ZoneRow name="4. Bahya (Outer Perimeter Moat)" planets={kotaState.bahya} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#9CA3AF' }}>
        <span>Swami (Lord): <strong style={{ color: '#F9FAFB' }}>{kotaState.kotaSwami}</strong> ({kotaState.swamiZone})</span>
        <span>Pala (Guard): <strong style={{ color: '#F9FAFB' }}>{kotaState.kotaPala}</strong> ({kotaState.palaZone})</span>
      </div>
    </div>
  );
};
