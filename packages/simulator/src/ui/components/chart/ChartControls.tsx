/**
 * packages/app/src/ui/components/chart/ChartControls.tsx
 * Time-machine controls (play/pause, stepping, speed multipliers).
 * Decomposed into small sub-components (< 60 lines each, complexity <= 10).
 */

import React from 'react';
import { useSimulationStore, type PlaybackSpeed } from '../../../state/simulationStore';
import { TimeMachine } from '../../../core/engine/timeMachine';

const btnStyle: React.CSSProperties = {
  backgroundColor: '#1E293B',
  color: '#E2E8F0',
  border: '1px solid #334155',
  borderRadius: '4px',
  padding: '6px 10px',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'all 0.15s ease',
};

const SessionInfo: React.FC<{ activeDate: string; currentIndex: number; totalSessions: number }> = ({
  activeDate,
  currentIndex,
  totalSessions,
}) => {
  const isFuture = totalSessions > 0 && currentIndex >= totalSessions - 1;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: '#D4AF37', fontWeight: 'bold' }}>
        {activeDate || 'Session Pending'}
      </span>
      {isFuture && (
        <span
          style={{
            padding: '1px 6px',
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.04em',
            backgroundColor: '#3B0764',
            color: '#F0ABFC',
            border: '1px solid #A855F7',
          }}
        >
          🔮 FORWARD
        </span>
      )}
      <span style={{ color: '#64748B', fontSize: '11px' }}>
        [{currentIndex + 1} / {totalSessions || 0}]
      </span>
    </div>
  );
};

const PlaybackButtons: React.FC<{
  isPlaying: boolean;
  currentIndex: number;
  totalSessions: number;
  timeMachine: TimeMachine;
}> = ({ isPlaying, currentIndex, totalSessions, timeMachine }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <button
      onClick={() => timeMachine.step(-5)}
      disabled={currentIndex <= 4}
      style={btnStyle}
      title="Step back 1 week"
    >
      ⏪ -1W
    </button>
    <button
      onClick={() => timeMachine.step(-1)}
      disabled={currentIndex <= 0}
      style={btnStyle}
      title="Step back 1 session"
    >
      ⏮ -1D
    </button>
    <button
      onClick={() => (isPlaying ? timeMachine.stop() : timeMachine.start())}
      style={{
        ...btnStyle,
        backgroundColor: isPlaying ? '#FF4B72' : '#00F2FE',
        color: '#0B0E14',
        fontWeight: 'bold',
        padding: '6px 14px',
      }}
    >
      {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
    </button>
    <button
      onClick={() => timeMachine.step(1)}
      disabled={currentIndex >= totalSessions - 1}
      style={btnStyle}
      title="Step forward 1 session"
    >
      +1D ⏭
    </button>
    <button
      onClick={() => timeMachine.step(5)}
      disabled={currentIndex >= totalSessions - 5}
      style={btnStyle}
      title="Step forward 1 week"
    >
      +1W ⏩
    </button>
  </div>
);

const SpeedSelector: React.FC<{
  currentSpeed: PlaybackSpeed;
  timeMachine: TimeMachine;
}> = ({ currentSpeed, timeMachine }) => {
  const speeds: PlaybackSpeed[] = [1, 5, 20, 100];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span style={{ color: '#64748B', fontSize: '11px', marginRight: '4px' }}>SPEED:</span>
      {speeds.map((s) => (
        <button
          key={s}
          onClick={() => timeMachine.setSpeed(s)}
          style={{
            ...btnStyle,
            backgroundColor: currentSpeed === s ? '#D4AF37' : '#1E293B',
            color: currentSpeed === s ? '#0B0E14' : '#E2E8F0',
            fontWeight: currentSpeed === s ? 'bold' : 'normal',
            padding: '4px 8px',
          }}
        >
          {s}x
        </button>
      ))}
    </div>
  );
};

export const ChartControls: React.FC = () => {
  const isPlaying = useSimulationStore((s) => s.isPlaying);
  const speed = useSimulationStore((s) => s.speed);
  const currentIndex = useSimulationStore((s) => s.currentIndex);
  const totalSessions = useSimulationStore((s) => s.totalSessions);
  const activeDate = useSimulationStore((s) => s.activeDate);
  const timeMachine = TimeMachine.getInstance();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        backgroundColor: '#121824',
        borderTop: '1px solid #1E293B',
        borderRadius: '0 0 8px 8px',
        color: '#E2E8F0',
        fontFamily: 'sans-serif',
        fontSize: '13px',
      }}
    >
      <SessionInfo activeDate={activeDate} currentIndex={currentIndex} totalSessions={totalSessions} />
      <PlaybackButtons
        isPlaying={isPlaying}
        currentIndex={currentIndex}
        totalSessions={totalSessions}
        timeMachine={timeMachine}
      />
      <SpeedSelector currentSpeed={speed} timeMachine={timeMachine} />
    </div>
  );
};
