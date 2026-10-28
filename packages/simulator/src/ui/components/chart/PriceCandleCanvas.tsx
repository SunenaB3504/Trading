/**
 * packages/simulator/src/ui/components/chart/PriceCandleCanvas.tsx
 * High-performance HTML5 Canvas Candlestick & Volume engine with full OHLC wicks,
 * responsive auto-resizing, X-axis date legend ticks, and duration zoom (1M/3M/6M/1Y/ALL).
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { DailyBar } from '../../../core/data/types';

export type ChartDuration = '1M' | '3M' | '6M' | '1Y' | 'ALL';

const DURATION_LIMITS: Record<ChartDuration, number> = {
  '1M': 22,
  '3M': 66,
  '6M': 130,
  '1Y': 252,
  'ALL': 99999,
};

export interface PriceCandleCanvasProps {
  bars: DailyBar[];
  currentIndex: number;
  activeDate?: string;
  duration?: ChartDuration;
  onDurationChange?: (d: ChartDuration) => void;
}

interface PriceBounds {
  minPrice: number;
  maxPrice: number;
  priceRange: number;
  maxVolume: number;
}

function calculatePriceBounds(bars: DailyBar[]): PriceBounds {
  let min = Infinity;
  let max = -Infinity;
  let maxVol = 1;

  for (const b of bars) {
    const high = b.high ?? Math.max(b.close, b.open ?? b.prev_close);
    const low = b.low ?? Math.min(b.close, b.open ?? b.prev_close);
    if (low < min) min = low;
    if (high > max) max = high;
    if (b.volume > maxVol) maxVol = b.volume;
  }

  const pad = (max - min) * 0.08 || 1.0;
  return { minPrice: min - pad, maxPrice: max + pad, priceRange: max - min + pad * 2, maxVolume: maxVol };
}

function drawGrid(ctx: CanvasRenderingContext2D, chartH: number, w: number, maxPrice: number, range: number): void {
  ctx.strokeStyle = '#161C28';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748B';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';

  for (let i = 0; i <= 5; i++) {
    const y = (chartH / 5) * i;
    const price = maxPrice - (range / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.fillText(`₹${price.toFixed(1)}`, w + 6, y + 3);
  }
}

function drawXAxis(
  ctx: CanvasRenderingContext2D,
  visibleBars: DailyBar[],
  chartW: number,
  h: number,
  bottomMargin: number
): void {
  const axisY = h - bottomMargin;
  ctx.strokeStyle = '#1E2638';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, axisY);
  ctx.lineTo(chartW, axisY);
  ctx.stroke();

  if (visibleBars.length === 0) return;
  const count = visibleBars.length;
  const tickStep = Math.max(1, Math.floor(count / 6));

  ctx.fillStyle = '#64748B';
  ctx.font = '9px monospace';
  ctx.textAlign = 'center';

  for (let i = 0; i < count - 1; i += tickStep) {
    const b = visibleBars[i];
    if (!b) continue;
    const x = i * (chartW / count) + (chartW / count) / 2;

    ctx.strokeStyle = '#2A364F';
    ctx.beginPath();
    ctx.moveTo(x, axisY);
    ctx.lineTo(x, axisY + 4);
    ctx.stroke();

    const parts = b.date.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]?.slice(2)}` : b.date;
    ctx.fillText(label, x, axisY + 14);
  }
}

function drawWickAndBody(
  ctx: CanvasRenderingContext2D,
  b: DailyBar,
  x: number,
  chartH: number,
  volBaseY: number,
  volMaxH: number,
  cw: number,
  bounds: PriceBounds
): void {
  const open = b.open ?? b.prev_close;
  const high = b.high ?? Math.max(open, b.close) * 1.004;
  const low = b.low ?? Math.min(open, b.close) * 0.996;
  const isUp = b.close >= open;
  const color = isUp ? '#00F2FE' : '#FF4B72';

  const yOpen = chartH - ((open - bounds.minPrice) / bounds.priceRange) * chartH;
  const yClose = chartH - ((b.close - bounds.minPrice) / bounds.priceRange) * chartH;
  const yHigh = chartH - ((high - bounds.minPrice) / bounds.priceRange) * chartH;
  const yLow = chartH - ((low - bounds.minPrice) / bounds.priceRange) * chartH;

  // Wick
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, yHigh);
  ctx.lineTo(x, yLow);
  ctx.stroke();

  // Body
  const top = Math.min(yOpen, yClose);
  const bodyH = Math.max(2, Math.abs(yClose - yOpen));
  ctx.fillStyle = color;
  ctx.fillRect(x - cw / 2, top, cw, bodyH);

  // Volume Bar
  const volH = (b.volume / bounds.maxVolume) * volMaxH;
  ctx.fillStyle = isUp ? '#00F2FE25' : '#FF4B7225';
  ctx.fillRect(x - cw / 2, volBaseY - volH, cw, volH);
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  bar: DailyBar,
  x: number,
  chartH: number,
  chartAreaH: number,
  chartW: number,
  rightMargin: number,
  bounds: PriceBounds
): void {
  const y = chartH - ((bar.close - bounds.minPrice) / bounds.priceRange) * chartH;
  ctx.strokeStyle = '#D4AF37';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, chartAreaH);
  ctx.moveTo(0, y);
  ctx.lineTo(chartW, y);
  ctx.stroke();
  ctx.setLineDash([]);

  // Y-axis Price badge
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(chartW + 2, y - 8, rightMargin - 4, 16);
  ctx.fillStyle = '#0B0E14';
  ctx.font = 'bold 10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`₹${bar.close.toFixed(1)}`, chartW + 6, y + 4);

  // X-axis Date badge
  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(Math.max(0, x - 34), chartAreaH + 2, 68, 16);
  ctx.fillStyle = '#0B0E14';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(bar.date, Math.max(34, x), chartAreaH + 13);
}

export const PriceCandleCanvas: React.FC<PriceCandleCanvasProps> = ({
  bars,
  currentIndex,
  activeDate,
  duration: controlledDuration,
  onDurationChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 700, h: 420 });
  const [internalDuration, setInternalDuration] = useState<ChartDuration>('6M');

  const duration = controlledDuration ?? internalDuration;
  const setDuration = (d: ChartDuration) => {
    setInternalDuration(d);
    onDurationChange?.(d);
  };

  const latestTradedBar = bars.length > 0 ? bars[Math.min(bars.length - 1, Math.max(0, currentIndex))] : null;
  const isFutureEvaluation = Boolean(
    activeDate && latestTradedBar && activeDate > latestTradedBar.date
  );

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 100 && height > 100) setDims({ w: Math.floor(width), h: Math.floor(height) });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = dims.w * dpr;
    canvas.height = dims.h * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, dims.w, dims.h);

    const bottomMargin = 22;
    const rightMargin = 70;
    const chartW = dims.w - rightMargin;
    const chartAreaH = dims.h - bottomMargin;
    const chartH = chartAreaH * 0.78;
    const volBaseY = chartAreaH;
    const volMaxH = chartAreaH * 0.18;

    const limit = DURATION_LIMITS[duration];
    const activeEnd = Math.min(bars.length, Math.max(1, currentIndex + 1));
    const visibleBars = bars.slice(Math.max(0, activeEnd - limit), activeEnd);
    if (visibleBars.length === 0) return;

    const slotW = chartW / visibleBars.length;
    const candleW = Math.max(1.5, Math.min(18, slotW * 0.7));
    const bounds = calculatePriceBounds(visibleBars);

    drawGrid(ctx, chartH, chartW, bounds.maxPrice, bounds.priceRange);

    for (let i = 0; i < visibleBars.length; i++) {
      const b = visibleBars[i];
      if (b) drawWickAndBody(ctx, b, i * slotW + slotW / 2, chartH, volBaseY, volMaxH, candleW, bounds);
    }

    drawXAxis(ctx, visibleBars, chartW, dims.h, bottomMargin);

    const latest = visibleBars[visibleBars.length - 1];
    if (latest) {
      drawCursor(ctx, latest, (visibleBars.length - 1) * slotW + slotW / 2, chartH, chartAreaH, chartW, rightMargin, bounds);
    }
  }, [bars, currentIndex, dims, duration]);

  useEffect(() => { render(); }, [render]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {/* Anchor Status Pill */}
      {isFutureEvaluation && latestTradedBar && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            left: '12px',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(11, 14, 20, 0.94)',
            border: '1px solid #D4AF37',
            borderRadius: '6px',
            padding: '5px 12px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}
        >
          <span style={{ color: '#94A3B8' }}>📌 ANCHORED AT LATEST CLOSE:</span>
          <span style={{ color: '#38BDF8', fontWeight: 'bold' }}>
            ₹{latestTradedBar.close.toFixed(1)} ({latestTradedBar.date})
          </span>
          <span style={{ color: '#64748B' }}>|</span>
          <span style={{ color: '#FCD34D' }}>🔮 EVALUATING FUTURE ASTROLOGY:</span>
          <span style={{ color: '#4ADE80', fontWeight: 'bold' }}>{activeDate}</span>
        </div>
      )}

      {/* Duration Zoom Toggles (1M, 3M, 6M, 1Y, ALL) */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '76px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '2px',
          backgroundColor: 'rgba(11, 14, 20, 0.88)',
          border: '1px solid #1E2638',
          borderRadius: '5px',
          padding: '2px',
          backdropFilter: 'blur(4px)',
        }}
      >
        {(['1M', '3M', '6M', '1Y', 'ALL'] as ChartDuration[]).map((d) => (
          <button
            key={d}
            onClick={() => setDuration(d)}
            style={{
              padding: '3px 7px',
              borderRadius: '3px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '10px',
              fontWeight: 700,
              backgroundColor: duration === d ? '#D4AF37' : 'transparent',
              color: duration === d ? '#0B0E14' : '#94A3B8',
              transition: 'all 0.12s ease',
            }}
          >
            {d}
          </button>
        ))}
      </div>

      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', borderRadius: '8px' }} />
    </div>
  );
};
