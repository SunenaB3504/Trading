/**
 * packages/simulator/src/ui/components/screener/DashaTimelineModal.tsx
 * Chronological Dasha Schedule & "Comes-to-Effect" Reverse Query Modal.
 * Renders MD -> AD roadmaps and upcoming Triad boundary countdowns.
 * Enforces strict modularity (< 250 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useMemo, useState } from 'react';
import type { CorporateRegistryRecord } from '../../../core/data/types';
import {
  generateDashaSchedule,
  findNextTriadOccurrence,
  type DashaEpochScheduleEntry,
} from '../../../core/astro/dashaTimelineScanner';

export interface DashaTimelineModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: CorporateRegistryRecord | null;
  activeDate: string;
}

export const DashaTimelineModal: React.FC<DashaTimelineModalProps> = ({
  isOpen,
  onClose,
  metadata,
  activeDate,
}) => {
  const [levelFilter, setLevelFilter] = useState<'ALL' | 'MD_ONLY' | 'UPCOMING_ONLY'>('ALL');

  const schedule = useMemo(() => {
    if (!metadata) return [];
    return generateDashaSchedule(metadata, activeDate, 2);
  }, [metadata, activeDate]);

  const nextBullRun = useMemo(() => {
    if (!metadata) return null;
    return findNextTriadOccurrence(metadata, '[T-T-T]', activeDate);
  }, [metadata, activeDate]);

  const nextTurnaround = useMemo(() => {
    if (!metadata) return null;
    return findNextTriadOccurrence(metadata, '[D-T-T]', activeDate);
  }, [metadata, activeDate]);

  const filteredSchedule = useMemo(() => {
    if (levelFilter === 'MD_ONLY') return schedule.filter((s) => s.level === 1);
    if (levelFilter === 'UPCOMING_ONLY') return schedule.filter((s) => s.status !== 'COMPLETED');
    return schedule;
  }, [schedule, levelFilter]);

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
          maxWidth: '1100px',
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
        <Header metadata={metadata} activeDate={activeDate} onClose={onClose} />

        <div style={{ padding: '14px 18px', borderBottom: '1px solid #1E2638', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <InsightCard
            title="NEXT [T-T-T] BULL RUN"
            entry={nextBullRun}
            accent="#10B981"
            fallback="No upcoming [T-T-T] found in 120-year cycle"
          />
          <InsightCard
            title="NEXT [D-T-T] TURNAROUND"
            entry={nextTurnaround}
            accent="#00F2FE"
            fallback="No upcoming [D-T-T] found in 120-year cycle"
          />
        </div>

        <FilterBar filter={levelFilter} onSelect={setLevelFilter} count={filteredSchedule.length} />

        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <ScheduleTable entries={filteredSchedule} />
        </div>
      </div>
    </div>
  );
};

function Header({ metadata, activeDate, onClose }: { metadata: CorporateRegistryRecord; activeDate: string; onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: '1px solid #1E2638', backgroundColor: '#07090E' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ color: '#D4AF37', fontSize: '14px', fontWeight: 900 }}>⌛ DASHA TIMELINE SCHEDULE & "COMES-TO-EFFECT"</span>
        <span style={{ color: '#64748B' }}>|</span>
        <span style={{ color: '#00F2FE', fontWeight: 800 }}>{metadata.symbol}</span>
        <span style={{ color: '#94A3B8', fontSize: '12px' }}>({metadata.company_name})</span>
        <span style={{ color: '#64748B' }}>|</span>
        <span style={{ color: '#CBD5E1', fontSize: '11px', fontFamily: 'monospace' }}>As of: {activeDate}</span>
      </div>
      <button onClick={onClose} style={{ padding: '4px 10px', borderRadius: '4px', backgroundColor: '#1E2638', color: '#94A3B8', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
        ✕ Close
      </button>
    </div>
  );
}

function InsightCard({ title, entry, accent, fallback }: { title: string; entry: DashaEpochScheduleEntry | null; accent: string; fallback: string }) {
  return (
    <div style={{ flex: 1, minWidth: '280px', padding: '10px 14px', backgroundColor: '#111827', borderRadius: '6px', border: `1px solid ${accent}44` }}>
      <div style={{ fontSize: '10px', fontWeight: 800, color: accent, marginBottom: '4px' }}>{title}</div>
      {entry ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
          <div style={{ color: '#F8FAFC', fontWeight: 700 }}>
            {entry.mdLord.toUpperCase()} - {entry.adLord?.toUpperCase() ?? entry.mdLord.toUpperCase()} ({entry.triadCode})
          </div>
          <div style={{ color: '#94A3B8', fontSize: '11px', fontFamily: 'monospace' }}>
            {entry.startDate} → {entry.endDate} ({entry.durationDays} days)
          </div>
          <div style={{ color: accent, fontSize: '11px', fontWeight: 800 }}>
            {entry.status === 'ACTIVE' ? '● Currently Active' : `Takes effect in ${entry.daysUntilStart} days`}
          </div>
        </div>
      ) : (
        <div style={{ color: '#64748B', fontSize: '11px' }}>{fallback}</div>
      )}
    </div>
  );
}

function FilterBar({ filter, onSelect, count }: { filter: string; onSelect: (f: any) => void; count: number }) {
  return (
    <div style={{ padding: '8px 18px', borderBottom: '1px solid #1E2638', display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 700 }}>View:</span>
      {(['ALL', 'UPCOMING_ONLY', 'MD_ONLY'] as const).map((mode) => (
        <button
          key={mode}
          onClick={() => onSelect(mode)}
          style={{
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            backgroundColor: filter === mode ? '#D4AF37' : '#111827',
            color: filter === mode ? '#07090E' : '#94A3B8',
            border: '1px solid #1E2638',
            cursor: 'pointer',
          }}
        >
          {mode === 'ALL' ? 'All Epochs' : mode === 'UPCOMING_ONLY' ? 'Active & Upcoming' : 'Mahadashas Only'}
        </button>
      ))}
      <span style={{ marginLeft: 'auto', color: '#64748B', fontSize: '11px', fontFamily: 'monospace' }}>
        {count} periods listed
      </span>
    </div>
  );
}

function ScheduleTable({ entries }: { entries: DashaEpochScheduleEntry[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
      <thead>
        <tr style={{ color: '#94A3B8', borderBottom: '1px solid #1E2638', textAlign: 'left' }}>
          <th style={{ padding: '6px' }}>Level</th>
          <th style={{ padding: '6px' }}>Lords (MD-AD)</th>
          <th style={{ padding: '6px' }}>Triad</th>
          <th style={{ padding: '6px' }}>Start Date</th>
          <th style={{ padding: '6px' }}>End Date</th>
          <th style={{ padding: '6px' }}>Duration</th>
          <th style={{ padding: '6px' }}>Status</th>
          <th style={{ padding: '6px', textAlign: 'right' }}>Days Until Start</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e, idx) => {
          const statusColor = e.status === 'ACTIVE' ? '#10B981' : e.status === 'UPCOMING' ? '#00F2FE' : '#64748B';
          return (
            <tr
              key={`${e.startDate}-${e.mdLord}-${e.adLord ?? ''}-${idx}`}
              style={{
                borderBottom: '1px solid #111827',
                backgroundColor: e.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
              }}
            >
              <td style={{ padding: '6px', fontWeight: 700, color: e.level === 1 ? '#D4AF37' : '#94A3B8' }}>
                {e.level === 1 ? 'MD' : '↳ AD'}
              </td>
              <td style={{ padding: '6px', fontWeight: 700, color: '#F1F5F9' }}>
                {e.mdLord.toUpperCase()} {e.adLord ? `- ${e.adLord.toUpperCase()}` : ''}
              </td>
              <td style={{ padding: '6px', fontFamily: 'monospace', fontWeight: 700, color: '#38BDF8' }}>
                {e.triadCode}
              </td>
              <td style={{ padding: '6px', fontFamily: 'monospace', color: '#CBD5E1' }}>{e.startDate}</td>
              <td style={{ padding: '6px', fontFamily: 'monospace', color: '#CBD5E1' }}>{e.endDate}</td>
              <td style={{ padding: '6px', color: '#94A3B8' }}>{e.durationDays}d</td>
              <td style={{ padding: '6px', fontWeight: 800, color: statusColor }}>{e.status}</td>
              <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', color: e.daysUntilStart > 0 ? '#FBBF24' : '#64748B' }}>
                {e.status === 'ACTIVE' ? 'Running' : e.daysUntilStart > 0 ? `${e.daysUntilStart}d` : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
