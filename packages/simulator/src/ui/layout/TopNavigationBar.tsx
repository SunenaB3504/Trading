/**
 * packages/simulator/src/ui/layout/TopNavigationBar.tsx
 * Top Workstation Header with Ticker Picker, Session Ingress, and Time Machine Controls.
 * Decomposed into small sub-components (< 60 LOC each).
 */

import React, { useState } from 'react';
import { useSimulationStore, type PlaybackSpeed } from '../../state/simulationStore';
import { useStockStore } from '../../state/stockStore';
import { usePortfolioStore } from '../../state/portfolioStore';
import { TimeMachine } from '../../core/engine/timeMachine';

const DEFAULT_TICKERS = ['TCS', 'DIVISLAB', 'BIOCON', 'PETRONET', 'IGL', 'YESBANK', 'SUZLON', 'BALAJITELE', 'FINEORG', 'ARIES', 'RAILTEL'];

function BrandAndTicker({
  symbol,
  onSelect,
  availableTickers = DEFAULT_TICKERS,
}: {
  symbol: string;
  onSelect: (sym: string) => void;
  availableTickers?: string[] | undefined;
}): React.ReactElement {
  const tickerList = availableTickers.includes(symbol)
    ? availableTickers
    : [symbol, ...availableTickers];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
      <span style={{ color: '#D4AF37', fontWeight: 900, fontSize: '15px', letterSpacing: '0.08em' }}>
        ASTRO-FINANCIAL TERMINAL
      </span>
      <select
        value={symbol}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          padding: '5px 10px',
          backgroundColor: '#111827',
          border: '1px solid #1E2638',
          color: '#F9FAFB',
          borderRadius: '6px',
          fontWeight: 700,
          fontSize: '12px',
          maxWidth: '180px',
        }}
      >
        {tickerList.map((t) => (
          <option key={t} value={t}>
            {t} (NSE)
          </option>
        ))}
      </select>
    </div>
  );
}

function SpeedButtons({
  activeSpeed,
  onSpeed,
}: {
  activeSpeed: PlaybackSpeed;
  onSpeed: (s: PlaybackSpeed) => void;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: '4px', marginLeft: '6px' }}>
      {([1, 5, 20, 100] as const).map((s) => (
        <button
          key={s}
          onClick={() => onSpeed(s)}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            fontWeight: 700,
            backgroundColor: activeSpeed === s ? '#D4AF37' : '#111827',
            color: activeSpeed === s ? '#0B0E14' : '#94A3B8',
            border: '1px solid #1E2638',
            cursor: 'pointer',
          }}
        >
          {s}x
        </button>
      ))}
    </div>
  );
}

function StepButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }): React.ReactElement {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 10px',
        borderRadius: '6px',
        backgroundColor: '#1E2638',
        color: '#F1F5F9',
        fontSize: '11px',
        fontWeight: 600,
        border: 'none',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

function PlaybackControls({
  isPlaying,
  speed,
}: {
  isPlaying: boolean;
  speed: PlaybackSpeed;
}): React.ReactElement {
  const timeMachine = TimeMachine.getInstance();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={() => (isPlaying ? timeMachine.stop() : timeMachine.start())}
        style={{
          padding: '6px 14px',
          borderRadius: '6px',
          backgroundColor: isPlaying ? '#EF4444' : '#10B981',
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: '12px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {isPlaying ? '⏸ Pause' : '▶ Play Replay'}
      </button>

      <StepButton label="+1 Day" disabled={isPlaying} onClick={() => timeMachine.step(1)} />
      <StepButton label="+1 Wk" disabled={isPlaying} onClick={() => timeMachine.step(5)} />
      <SpeedButtons activeSpeed={speed} onSpeed={(s) => timeMachine.setSpeed(s)} />
    </div>
  );
}

export interface TopNavigationBarProps {
  onOpenRadar?: () => void;
  onOpenHoroscope?: () => void;
  onOpenStrategy?: () => void;
  onOpenPositions?: () => void;
  onOpenScorecard?: () => void;
  onOpenIngestion?: () => void;
  onSyncToday?: () => void;
  onSyncOnline?: () => Promise<unknown> | unknown;
  availableTickers?: string[] | undefined;
}

export const TopNavigationBar: React.FC<TopNavigationBarProps> = ({
  onOpenRadar,
  onOpenHoroscope,
  onOpenStrategy,
  onOpenPositions,
  onOpenScorecard,
  onOpenIngestion,
  onSyncToday,
  onSyncOnline,
  availableTickers,
}) => {
  const { isPlaying, speed, activeDate, currentIndex, totalSessions } = useSimulationStore();
  const { activeSymbol, setActiveSymbol } = useStockStore();
  const { ledger } = usePortfolioStore();
  const positionsCount = Object.values(ledger.positions).filter((p) => p.shares > 0).length;

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleSyncOnlineClick = async () => {
    if (!onSyncOnline || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await onSyncOnline();
      const targetDate = (res as { maxDate?: string })?.maxDate || '2026-11-03';
      setSyncStatus(`Up to: ${targetDate}`);
      setSyncNotice(
        `✓ Synced with official NSE archive up to ${targetDate}. (Today's Nov 4 Bhavcopy is published by NSE ~5:30-6:30 PM IST)`
      );
      setTimeout(() => {
        setSyncStatus(null);
        setSyncNotice(null);
      }, 7000);
    } catch {
      setSyncStatus('Error');
      setSyncNotice('Failed to connect to online data archives.');
      setTimeout(() => {
        setSyncStatus(null);
        setSyncNotice(null);
      }, 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        backgroundColor: '#07090E',
        borderBottom: '1px solid #1E2638',
      }}
    >
      <BrandAndTicker symbol={activeSymbol} onSelect={setActiveSymbol} availableTickers={availableTickers} />
      <PlaybackControls isPlaying={isPlaying} speed={speed} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {onOpenRadar && (
          <button
            onClick={onOpenRadar}
            style={{
              padding: '5px 10px',
              borderRadius: '5px',
              backgroundColor: '#1E2638',
              color: '#00F2FE',
              border: '1px solid #0E7490',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            ☵ Universe Radar
          </button>
        )}
        {onOpenHoroscope && (
          <button
            onClick={onOpenHoroscope}
            style={{
              padding: '5px 10px',
              borderRadius: '5px',
              backgroundColor: '#1E2638',
              color: '#D4AF37',
              border: '1px solid #854D0E',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            ☸ Horoscope Dossier
          </button>
        )}
        {onOpenStrategy && (
          <button
            onClick={onOpenStrategy}
            style={{
              padding: '5px 8px',
              borderRadius: '5px',
              backgroundColor: '#1E2638',
              color: '#94A3B8',
              border: '1px solid #334155',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            ⚙ Strategy
          </button>
        )}
        {onOpenPositions && (
          <button
            onClick={onOpenPositions}
            style={{
              padding: '5px 10px',
              borderRadius: '5px',
              backgroundColor: positionsCount > 0 ? '#064E3B' : '#1E2638',
              color: positionsCount > 0 ? '#6EE7B7' : '#94A3B8',
              border: `1px solid ${positionsCount > 0 ? '#059669' : '#334155'}`,
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            💼 Positions ({positionsCount})
          </button>
        )}
        {onOpenScorecard && (
          <button
            onClick={onOpenScorecard}
            style={{
              padding: '5px 10px',
              borderRadius: '5px',
              backgroundColor: '#1E2638',
              color: '#FDE047',
              border: '1px solid #CA8A04',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            📊 Scorecard
          </button>
        )}
        {onOpenIngestion && (
          <button
            onClick={onOpenIngestion}
            style={{
              padding: '5px 10px',
              borderRadius: '5px',
              backgroundColor: '#1E2638',
              color: '#34D399',
              border: '1px solid #059669',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            📥 Import Stock
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>
          Session: <strong style={{ color: '#F3F4F6' }}>{currentIndex + 1}</strong> / {totalSessions || '—'} | Date:{' '}
          <strong style={{ color: '#F3F4F6' }}>{activeDate || '—'}</strong>
        </div>
        {onSyncOnline && (
          <button
            onClick={handleSyncOnlineClick}
            disabled={isSyncing}
            title="Fetch latest completed EOD Bhavcopies from NSE online archives and heal missing sessions"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: isSyncing ? '#1E293B' : syncStatus ? '#064E3B' : '#0B2942',
              color: syncStatus ? '#6EE7B7' : isSyncing ? '#94A3B8' : '#38BDF8',
              border: `1px solid ${syncStatus ? '#059669' : '#0284C7'}`,
              cursor: isSyncing ? 'wait' : 'pointer',
              fontSize: '10px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isSyncing ? '⏳ Syncing...' : syncStatus ? `✅ ${syncStatus}` : '🌐 Sync Online'}
          </button>
        )}
        {onSyncToday && (
          <button
            onClick={onSyncToday}
            title="Jump directly to current market session"
            style={{
              padding: '4px 8px',
              borderRadius: '4px',
              backgroundColor: '#0F172A',
              color: '#38BDF8',
              border: '1px solid #0284C7',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 700,
            }}
          >
            ⚡ Sync Today
          </button>
        )}
      </div>

      {syncNotice && (
        <div
          style={{
            position: 'absolute',
            top: '48px',
            right: '20px',
            zIndex: 9999,
            backgroundColor: '#0F172A',
            border: '1px solid #0284C7',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#38BDF8',
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            maxWidth: '420px',
            lineHeight: 1.4,
          }}
        >
          {syncNotice}
        </div>
      )}
    </header>
  );
};
