/**
 * packages/simulator/src/ui/components/chart/DashaRibbon.tsx
 * Interactive Dasha Hierarchy Timeline Strip.
 * Shows Mahadasha, Antardasha, and Pratyantardasha badges with seek controls.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

import React from 'react';
import type { ActiveDashaState } from '../../../core/astro/types';

export interface DashaRibbonProps {
  dashaState: ActiveDashaState | null;
  activeDate: string;
}

const BADGE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  jupiter: { bg: '#042f2e', border: '#14b8a6', text: '#5eead4' },
  venus: { bg: '#3b0764', border: '#a855f7', text: '#f0abfc' },
  sun: { bg: '#451a03', border: '#f59e0b', text: '#fde68a' },
  moon: { bg: '#172554', border: '#3b82f6', text: '#93c5fd' },
  mars: { bg: '#450a0a', border: '#ef4444', text: '#fca5a5' },
  rahu: { bg: '#18181b', border: '#71717a', text: '#e4e4e7' },
  ketu: { bg: '#292524', border: '#78716c', text: '#d6d3d1' },
  saturn: { bg: '#1e1b4b', border: '#6366f1', text: '#c7d2fe' },
  mercury: { bg: '#052e16', border: '#22c55e', text: '#86efac' },
};

function DashaBadge({ label, lord, daysLeft }: { label: string; lord: string; daysLeft?: number }): React.ReactElement {
  const c = BADGE_COLORS[lord.toLowerCase()] ?? { bg: '#1e293b', border: '#475569', text: '#cbd5e1' };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '6px',
        backgroundColor: c.bg,
        border: `1px solid ${c.border}`,
        color: c.text,
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      <span style={{ opacity: 0.7, fontSize: '9px' }}>{label}:</span>
      <span>{lord}</span>
      {typeof daysLeft === 'number' && (
        <span style={{ fontSize: '9px', opacity: 0.8, marginLeft: '4px' }}>
          ({Math.round(daysLeft)}d)
        </span>
      )}
    </div>
  );
}

export const DashaRibbon: React.FC<DashaRibbonProps> = ({ dashaState, activeDate }) => {
  if (!dashaState) {
    return (
      <div style={{ padding: '8px 12px', background: '#0F131C', color: '#64748b', fontSize: '12px' }}>
        No chronometric timeline loaded for active session.
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        background: '#0F131C',
        borderBottom: '1px solid #1E2638',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ color: '#D4AF37', fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em' }}>
          DASHA TIMELINE:
        </span>
        <DashaBadge label="MD" lord={dashaState.mahadasha} daysLeft={dashaState.mdRemainingDays} />
        <DashaBadge label="AD" lord={dashaState.antardasha} daysLeft={dashaState.adRemainingDays} />
        <DashaBadge label="PD" lord={dashaState.pratyantardasha} daysLeft={dashaState.pdRemainingDays} />
        <DashaBadge label="SD" lord={dashaState.sookshmadasha} />
        <DashaBadge label="PRANA" lord={dashaState.pranadasha} />
      </div>

      <div style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'monospace' }}>
        As of: <span style={{ color: '#F1F5F9', fontWeight: 600 }}>{activeDate}</span>
      </div>
    </div>
  );
};
