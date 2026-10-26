/**
 * packages/simulator/src/ui/layout/TopNavigationBar.tsx
 * Top Workstation Header with Ticker Picker, Session Ingress, and Time Machine Controls.
 * Decomposed into small sub-components (< 60 LOC each).
 */

import React from 'react';
import { useSimulationStore, type PlaybackSpeed } from '../../state/simulationStore';
import { useStockStore } from '../../state/stockStore';
import { TimeMachine } from '../../core/engine/timeMachine';

const TICKERS = ['TCS', 'DIVISLAB', 'BIOCON', 'PETRONET', 'IGL', 'YESBANK', 'SUZLON', 'BALAJITELE'];

function BrandAndTicker({
  symbol,
  onSelect,
}: {
  symbol: string;
  onSelect: (sym: string) => void;
}): React.ReactElement {
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
        }}
      >
        {TICKERS.map((t) => (
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

export const TopNavigationBar: React.FC = () => {
  const { isPlaying, speed, activeDate, currentIndex, totalSessions } = useSimulationStore();
  const { activeSymbol, setActiveSymbol } = useStockStore();

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
      <BrandAndTicker symbol={activeSymbol} onSelect={setActiveSymbol} />
      <PlaybackControls isPlaying={isPlaying} speed={speed} />
      <div style={{ fontSize: '11px', color: '#9CA3AF', fontFamily: 'monospace' }}>
        Session: <strong style={{ color: '#F3F4F6' }}>{currentIndex + 1}</strong> / {totalSessions || '—'} | Date:{' '}
        <strong style={{ color: '#F3F4F6' }}>{activeDate || '—'}</strong>
      </div>
    </header>
  );
};
