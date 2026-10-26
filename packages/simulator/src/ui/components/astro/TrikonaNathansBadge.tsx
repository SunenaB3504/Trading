/**
 * packages/simulator/src/ui/components/astro/TrikonaNathansBadge.tsx
 * Displays the Lagna Trikona Nathans (Lords of 1H, 5H, and 9H).
 * Explains the foundational astrological triumvirate driving [T] classifications.
 * Enforces strict modularity (< 150 LOC, functions < 60 LOC, complexity <= 10).
 */

import React from 'react';
import type { CorporateRegistryRecord } from '../../../core/data/types';
import { deriveTrikonaNathans } from '../../../core/astro/trikonaNathans';

export interface TrikonaNathansBadgeProps {
  metadata: CorporateRegistryRecord | null;
}

function NathanChip({
  house,
  lord,
  sign,
}: {
  house: string;
  lord: string;
  sign: string;
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        borderRadius: '4px',
        backgroundColor: '#1E293B',
        border: '1px solid #334155',
        fontSize: '11px',
      }}
    >
      <span style={{ color: '#D4AF37', fontWeight: 800 }}>{house}:</span>
      <span style={{ color: '#F8FAFC', fontWeight: 700, textTransform: 'capitalize' }}>{lord}</span>
      <span style={{ color: '#94A3B8', fontSize: '10px' }}>({sign})</span>
    </div>
  );
}

export const TrikonaNathansBadge: React.FC<TrikonaNathansBadgeProps> = ({ metadata }) => {
  if (!metadata) return null;

  const res = deriveTrikonaNathans(metadata.lagna_sign_id ?? 0);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '6px 12px',
        borderRadius: '6px',
        backgroundColor: '#0F172A',
        border: '1px solid #1E293B',
      }}
    >
      <span
        style={{
          color: '#D4AF37',
          fontSize: '10px',
          fontWeight: 800,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Lagna Trikona Nathans:
      </span>
      <NathanChip house="1H (Tanu)" lord={res.lagnaLord} sign={res.lagnaSignName} />
      <NathanChip house="5H (Punya)" lord={res.h5Lord} sign={res.h5SignName} />
      <NathanChip house="9H (Bhagya)" lord={res.h9Lord} sign={res.h9SignName} />
      <span style={{ color: '#34D399', fontSize: '10px', fontWeight: 700, fontFamily: 'monospace' }}>
        [T] Set: &#123;{res.trikonaLords.join(', ')}&#125;
      </span>
    </div>
  );
};
