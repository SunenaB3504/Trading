/**
 * packages/simulator/src/ui/components/chart/PriceCandleCanvas.tsx
 * High-performance HTML5 Canvas Candlestick & Volume engine with full OHLC wicks.
 * Responsive auto-resizing (< 400 LOC, functions < 60 LOC, complexity <= 10).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { DailyBar } from '../../../core/data/types';

export interface PriceCandleCanvasProps {
  bars: DailyBar[];
  currentIndex: number;
  activeDate?: string;
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

function drawGrid(ctx: CanvasRenderingContext2D, h: number, w: number, maxPrice: number, range: number): void {
  ctx.strokeStyle = '#161C28';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748B';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';

  for (let i = 0; i <= 5; i++) {
    const y = (h * 0.78 / 5) * i;
    const price = maxPrice - (range / 5) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
    ctx.fillText(`₹${price.toFixed(1)}`, w + 6, y + 3);
  }
}

function drawWickAndBody(
  ctx: CanvasRenderingContext2D,
  b: DailyBar,
  x: number,
  h: number,
  cw: number,
  bounds: PriceBounds
): void {
  const open = b.open ?? b.prev_close;
  const high = b.high ?? Math.max(open, b.close) * 1.004;
  const low = b.low ?? Math.min(open, b.close) * 0.996;
  const isUp = b.close >= open;
  const color = isUp ? '#00F2FE' : '#FF4B72';
  const chartH = h * 0.78;

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

  // Volume Bar at bottom
  const volH = (b.volume / bounds.maxVolume) * (h * 0.18);
  ctx.fillStyle = isUp ? '#00F2FE25' : '#FF4B7225';
  ctx.fillRect(x - cw / 2, h - volH, cw, volH);
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  bar: DailyBar,
  x: number,
  h: number,
  chartW: number,
  rightMargin: number,
  bounds: PriceBounds
): void {
  const chartH = h * 0.78;
  const y = chartH - ((bar.close - bounds.minPrice) / bounds.priceRange) * chartH;
  ctx.strokeStyle = '#D4AF37';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, h);
  ctx.moveTo(0, y);
  ctx.lineTo(chartW, y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(chartW + 2, y - 8, rightMargin - 4, 16);
  ctx.fillStyle = '#0B0E14';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`₹${bar.close.toFixed(1)}`, chartW + 6, y + 4);
}

export const PriceCandleCanvas: React.FC<PriceCandleCanvasProps> = ({
  bars,
  currentIndex,
  activeDate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 700, h: 420 });

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

    const activeEnd = Math.min(bars.length, Math.max(1, currentIndex + 1));
    const visibleBars = bars.slice(Math.max(0, activeEnd - 80), activeEnd);
    if (visibleBars.length === 0) return;

    const rightMargin = 70;
    const chartW = dims.w - rightMargin;
    const slotW = chartW / visibleBars.length;
    const candleW = Math.max(2, slotW * 0.7);
    const bounds = calculatePriceBounds(visibleBars);

    drawGrid(ctx, dims.h, chartW, bounds.maxPrice, bounds.priceRange);

    for (let i = 0; i < visibleBars.length; i++) {
      const b = visibleBars[i];
      if (b) drawWickAndBody(ctx, b, i * slotW + slotW / 2, dims.h, candleW, bounds);
    }

    const latest = visibleBars[visibleBars.length - 1];
    if (latest) {
      drawCursor(ctx, latest, (visibleBars.length - 1) * slotW + slotW / 2, dims.h, chartW, rightMargin, bounds);
    }
  }, [bars, currentIndex, dims]);

  useEffect(() => { render(); }, [render]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
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
            padding: '6px 12px',
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
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', borderRadius: '8px' }} />
    </div>
  );
};
