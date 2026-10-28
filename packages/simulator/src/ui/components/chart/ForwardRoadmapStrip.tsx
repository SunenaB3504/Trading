/**
 * packages/simulator/src/ui/components/chart/ForwardRoadmapStrip.tsx
 * Horizontal Forward 1-Year Astrological Roadmap Strip with 1-click Date Snapping.
 * Displays upcoming Vimshottari Dasha cusps, Triad codes, and quick time-machine jumps.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useMemo, useState } from 'react';
import type { CorporateRegistryRecord } from '../../../core/data/types';
import { generateDashaSchedule, type DashaEpochScheduleEntry } from '../../../core/astro/dashaTimelineScanner';

export interface ForwardRoadmapStripProps {
  metadata: CorporateRegistryRecord | null;
  activeDate: string;
  onSelectDate: (targetDate: string) => void;
  onSyncLatestSession?: (() => void) | undefined;
}

const TRIAD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '[T-T-T]': { bg: '#064E3B', text: '#6EE7B7', border: '#10B981' },
  '[T-D-T]': { bg: '#451A03', text: '#FDE68A', border: '#F59E0B' },
  '[T-T-D]': { bg: '#3B0764', text: '#F0ABFC', border: '#A855F7' },
  '[D-D-D]': { bg: '#450A0A', text: '#FCA5A5', border: '#EF4444' },
  '[D-T-T]': { bg: '#1E1B4B', text: '#C7D2FE', border: '#6366F1' },
};

function getTriadBadge(triad: string) {
  const c = TRIAD_COLORS[triad] ?? { bg: '#1E293B', text: '#94A3B8', border: '#334155' };
  return (
    <span
      style={{
        padding: '2px 6px',
        borderRadius: '4px',
        fontSize: '10px',
        fontFamily: 'monospace',
        fontWeight: 700,
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {triad}
    </span>
  );
}

function stepCalendarDate(dateStr: string, months: number): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export const ForwardRoadmapStrip: React.FC<ForwardRoadmapStripProps> = ({
  metadata,
  activeDate,
  onSelectDate,
  onSyncLatestSession,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const upcomingMilestones = useMemo(() => {
    if (!metadata || !activeDate) return [];
    // Generate Level 2 (AD) and Level 3 (PD) schedule
    const allEpochs = generateDashaSchedule(metadata, activeDate, 3);
    const refMs = new Date(`${activeDate}T12:00:00+05:30`).getTime();
    const oneYearLaterMs = refMs + 365.25 * 86400000;

    // Filter upcoming transitions within the next 365 days
    const upcoming = allEpochs.filter(
      (e) => e.level >= 2 && e.startTimeMs > refMs && e.startTimeMs <= oneYearLaterMs
    );

    // Sort by chronological start time and pick the next 6 prominent inflection windows
    return upcoming.sort((a, b) => a.startTimeMs - b.startTimeMs).slice(0, 6);
  }, [metadata, activeDate]);

  return (
    <div
      style={{
        backgroundColor: '#0A0D14',
        borderTop: '1px solid #1E2638',
        padding: '8px 14px',
        fontSize: '11px',
      }}
    >
      {/* Top Header: Controls & Date Jumps */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsExpanded((p) => !p)}
            style={{
              background: 'none',
              border: 'none',
              color: '#D4AF37',
              cursor: 'pointer',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: 0,
            }}
          >
            <span>🔮 1-YEAR FORWARD ASTRO ROADMAP</span>
            <span style={{ fontSize: '9px', opacity: 0.7 }}>{isExpanded ? '▲' : '▼'}</span>
          </button>
          <span style={{ color: '#64748B', fontSize: '10px' }}>
            ({upcomingMilestones.length} Upcoming Inflections)
          </span>
        </div>

        {/* Date Jump Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: '#94A3B8', fontSize: '10px' }}>EVALUATION DATE:</span>
          <input
            type="date"
            value={activeDate.slice(0, 10)}
            onChange={(e) => {
              if (e.target.value) onSelectDate(e.target.value);
            }}
            style={{
              backgroundColor: '#121824',
              color: '#F1F5F9',
              border: '1px solid #2A364F',
              borderRadius: '4px',
              padding: '2px 6px',
              fontSize: '10px',
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={() => onSelectDate(stepCalendarDate(activeDate, 1))}
            style={actionBtnStyle}
            title="Jump +1 Month"
          >
            +1M
          </button>
          <button
            onClick={() => onSelectDate(stepCalendarDate(activeDate, 6))}
            style={actionBtnStyle}
            title="Jump +6 Months"
          >
            +6M
          </button>
          <button
            onClick={() => onSelectDate(stepCalendarDate(activeDate, 12))}
            style={actionBtnStyle}
            title="Jump +1 Year"
          >
            +1Y
          </button>
          {onSyncLatestSession && (
            <button
              onClick={onSyncLatestSession}
              style={{ ...actionBtnStyle, color: '#38BDF8', borderColor: '#0284C7' }}
              title="Return to latest traded session"
            >
              ↺ Latest
            </button>
          )}
        </div>
      </div>

      {/* Expanded Roadmap Timeline Cards */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            overflowX: 'auto',
            paddingTop: '8px',
            paddingBottom: '2px',
          }}
        >
          {upcomingMilestones.length === 0 ? (
            <div style={{ color: '#64748B', fontStyle: 'italic', padding: '4px 0' }}>
              No intermediate Dasha transitions within the next 365 days. Active period extends forward.
            </div>
          ) : (
            upcomingMilestones.map((milestone, idx) => (
              <MilestoneCard
                key={`${milestone.startDate}-${idx}`}
                entry={milestone}
                onJump={() => onSelectDate(milestone.startDate)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

function MilestoneCard({
  entry,
  onJump,
}: {
  entry: DashaEpochScheduleEntry;
  onJump: () => void;
}) {
  const isAd = entry.level === 2;
  const periodLabel = isAd
    ? `AD: ${(entry.adLord ?? '').toUpperCase()}`
    : `PD: ${(entry.pdLord ?? '').toUpperCase()}`;

  return (
    <div
      style={{
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        backgroundColor: '#0F131C',
        border: '1px solid #1E2638',
        borderRadius: '6px',
        padding: '6px 10px',
        minWidth: '150px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#94A3B8', fontSize: '9px', fontFamily: 'monospace' }}>
          📅 {entry.startDate}
        </span>
        <span style={{ color: '#F59E0B', fontSize: '9px', fontWeight: 600 }}>
          in {entry.daysUntilStart}d
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
        <span style={{ color: '#F1F5F9', fontWeight: 700, fontSize: '11px' }}>
          {periodLabel}
        </span>
        {getTriadBadge(entry.triadCode)}
      </div>

      <button
        onClick={onJump}
        style={{
          marginTop: '2px',
          padding: '2px 6px',
          borderRadius: '3px',
          border: '1px solid #334155',
          backgroundColor: '#1E293B',
          color: '#E2E8F0',
          fontSize: '9px',
          cursor: 'pointer',
          textAlign: 'center',
          fontWeight: 600,
          transition: 'all 0.15s ease',
        }}
      >
        Jump to Cusp ↗
      </button>
    </div>
  );
}

const actionBtnStyle: React.CSSProperties = {
  backgroundColor: '#1E293B',
  color: '#E2E8F0',
  border: '1px solid #334155',
  borderRadius: '4px',
  padding: '2px 6px',
  cursor: 'pointer',
  fontSize: '10px',
  fontWeight: 600,
  transition: 'all 0.15s ease',
};
