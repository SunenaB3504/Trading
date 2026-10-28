/**
 * packages/simulator/src/ui/components/settings/StrategyParameterDrawer.tsx
 * Interactive Strategy Parameter Matrix Drawer for tweaking backtesting variables.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useState } from 'react';

export interface StrategyParameters {
  cuspWindowSessions: number;
  kotaDefenseThreshold: number;
  riskBudgetFraction: number;
  minNominalPrice: number;
  severeDrawdownPct: number;
  enableVryTurnaround: boolean;
  enableNbryTurnaround: boolean;
}

export const DEFAULT_STRATEGY_PARAMETERS: StrategyParameters = {
  cuspWindowSessions: 3,
  kotaDefenseThreshold: 0.35,
  riskBudgetFraction: 0.1,
  minNominalPrice: 20.0,
  severeDrawdownPct: 0.75,
  enableVryTurnaround: true,
  enableNbryTurnaround: true,
};

export interface StrategyParameterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parameters: StrategyParameters;
  onSaveParameters: (params: StrategyParameters) => void;
}

export const StrategyParameterDrawer: React.FC<StrategyParameterDrawerProps> = ({
  isOpen,
  onClose,
  parameters,
  onSaveParameters,
}) => {
  const [params, setParams] = useState<StrategyParameters>(parameters);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        backgroundColor: 'rgba(7, 9, 14, 0.85)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      <div
        style={{
          width: '420px',
          height: '100%',
          backgroundColor: '#0B0E14',
          borderLeft: '1px solid #1E2638',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-10px 0 40px rgba(0,0,0,0.8)',
        }}
      >
        <DrawerHeader onClose={onClose} />
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <SliderControl
            label="Cusp Ingress Window (Sessions)"
            value={params.cuspWindowSessions}
            min={1}
            max={10}
            step={1}
            displayValue={`±${params.cuspWindowSessions} sessions`}
            onChange={(v) => setParams({ ...params, cuspWindowSessions: v })}
          />

          <SliderControl
            label="Kota Fortress Defense Cutoff"
            value={params.kotaDefenseThreshold}
            min={0.15}
            max={0.6}
            step={0.05}
            displayValue={`${params.kotaDefenseThreshold.toFixed(2)}`}
            onChange={(v) => setParams({ ...params, kotaDefenseThreshold: v })}
          />

          <SliderControl
            label="Portfolio Risk Budget Allocation"
            value={params.riskBudgetFraction * 100}
            min={5}
            max={30}
            step={1}
            displayValue={`${(params.riskBudgetFraction * 100).toFixed(0)}% per trade`}
            onChange={(v) => setParams({ ...params, riskBudgetFraction: v / 100 })}
          />

          <SliderControl
            label="Ex-Ante Penny-Stock Filter (₹)"
            value={params.minNominalPrice}
            min={5}
            max={100}
            step={5}
            displayValue={`₹${params.minNominalPrice.toFixed(0)} minimum close`}
            onChange={(v) => setParams({ ...params, minNominalPrice: v })}
          />

          <SliderControl
            label="Ex-Ante Severe Drawdown Limit"
            value={params.severeDrawdownPct * 100}
            min={40}
            max={90}
            step={5}
            displayValue={`-${(params.severeDrawdownPct * 100).toFixed(0)}% from peak`}
            onChange={(v) => setParams({ ...params, severeDrawdownPct: v / 100 })}
          />

          <CheckboxControl
            label="Enable Viparita Raja Yoga (VRY) Turnarounds"
            checked={params.enableVryTurnaround}
            onChange={(c) => setParams({ ...params, enableVryTurnaround: c })}
          />

          <CheckboxControl
            label="Enable Neecha Bhanga (NBRY) Turnarounds"
            checked={params.enableNbryTurnaround}
            onChange={(c) => setParams({ ...params, enableNbryTurnaround: c })}
          />
        </div>
        <DrawerFooter
          onReset={() => setParams(DEFAULT_STRATEGY_PARAMETERS)}
          onApply={() => {
            onSaveParameters(params);
            onClose();
          }}
        />
      </div>
    </div>
  );
};

function DrawerHeader({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #1E2638', backgroundColor: '#07090E' }}>
      <span style={{ color: '#D4AF37', fontSize: '13px', fontWeight: 800 }}>⚙ STRATEGY PARAMETER MATRIX</span>
      <button onClick={onClose} style={{ padding: '4px 8px', borderRadius: '4px', backgroundColor: '#1E2638', color: '#94A3B8', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
        ✕
      </button>
    </div>
  );
}

function SliderControl({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', backgroundColor: '#111827', padding: '12px', borderRadius: '6px', border: '1px solid #1E2638' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#F8FAFC', fontSize: '11px', fontWeight: 700 }}>{label}</span>
        <span style={{ color: '#00F2FE', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700 }}>{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: '#D4AF37', cursor: 'pointer' }}
      />
    </div>
  );
}

function CheckboxControl({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#111827', padding: '12px', borderRadius: '6px', border: '1px solid #1E2638', cursor: 'pointer' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} style={{ accentColor: '#10B981', width: '16px', height: '16px' }} />
      <span style={{ color: '#F1F5F9', fontSize: '11px', fontWeight: 600 }}>{label}</span>
    </label>
  );
}

function DrawerFooter({ onReset, onApply }: { onReset: () => void; onApply: () => void }) {
  return (
    <div style={{ padding: '14px 18px', borderTop: '1px solid #1E2638', backgroundColor: '#07090E', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
      <button onClick={onReset} style={{ padding: '8px 14px', borderRadius: '4px', backgroundColor: '#1E2638', color: '#94A3B8', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}>
        Reset Defaults
      </button>
      <button onClick={onApply} style={{ padding: '8px 18px', borderRadius: '4px', backgroundColor: '#D4AF37', color: '#0B0E14', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}>
        Apply Matrix
      </button>
    </div>
  );
}
