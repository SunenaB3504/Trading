/**
 * packages/app/src/ui/components/chart/PriceCandleCanvas.tsx
 * High-performance HTML5 Canvas Candlestick renderer with Dasha color-band overlay.
 * Decomposed into small rendering functions (< 60 LOC, complexity <= 10).
 */

import React, { useEffect, useRef, useCallback } from 'react';
import type { DailyBar } from '../../../core/data/types';

export interface PriceCandleCanvasProps {
  bars: DailyBar[];
  currentIndex: number;
  width?: number;
  height?: number;
}

function calculatePriceBounds(bars: DailyBar[]): { minPrice: number; maxPrice: number; priceRange: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const b of bars) {
    if (b.close < min) min = b.close;
    if (b.close > max) max = b.close;
    if (b.prev_close < min) min = b.prev_close;
    if (b.prev_close > max) max = b.prev_close;
  }
  const padding = (max - min) * 0.1 || 1.0;
  min -= padding;
  max += padding;
  return { minPrice: min, maxPrice: max, priceRange: max - min };
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  height: number,
  chartWidth: number,
  maxPrice: number,
  priceRange: number
): void {
  ctx.strokeStyle = '#1A202C';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#A0AEC0';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';

  const steps = 5;
  for (let i = 0; i <= steps; i++) {
    const y = (height / steps) * i;
    const priceVal = maxPrice - (priceRange / steps) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartWidth, y);
    ctx.stroke();
    ctx.fillText(`₹${priceVal.toFixed(2)}`, chartWidth + 6, y + 3);
  }
}

function drawCandles(
  ctx: CanvasRenderingContext2D,
  bars: DailyBar[],
  height: number,
  slotWidth: number,
  minPrice: number,
  priceRange: number
): void {
  const candleWidth = Math.max(2, slotWidth * 0.7);
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i];
    if (!b) continue;
    const x = i * slotWidth + slotWidth / 2;
    const isUp = b.close >= b.prev_close;
    const yClose = height - ((b.close - minPrice) / priceRange) * height;
    const yPrev = height - ((b.prev_close - minPrice) / priceRange) * height;
    const color = isUp ? '#00F2FE' : '#FF4B72';

    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, yClose);
    ctx.lineTo(x, yPrev);
    ctx.stroke();

    const bodyTop = Math.min(yClose, yPrev);
    const bodyH = Math.max(2, Math.abs(yClose - yPrev));
    ctx.fillStyle = color;
    ctx.fillRect(x - candleWidth / 2, bodyTop, candleWidth, bodyH);
  }
}

function drawCursor(
  ctx: CanvasRenderingContext2D,
  bar: DailyBar,
  x: number,
  height: number,
  chartWidth: number,
  rightMargin: number,
  minPrice: number,
  priceRange: number
): void {
  const y = height - ((bar.close - minPrice) / priceRange) * height;
  ctx.strokeStyle = '#D4AF37';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(x, 0);
  ctx.lineTo(x, height);
  ctx.moveTo(0, y);
  ctx.lineTo(chartWidth, y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(chartWidth + 2, y - 8, rightMargin - 4, 16);
  ctx.fillStyle = '#0B0E14';
  ctx.font = 'bold 10px monospace';
  ctx.fillText(`₹${bar.close.toFixed(1)}`, chartWidth + 6, y + 3);
}

export const PriceCandleCanvas: React.FC<PriceCandleCanvasProps> = ({
  bars,
  currentIndex,
  width = 800,
  height = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = '#0B0E14';
    ctx.fillRect(0, 0, width, height);

    const activeEnd = Math.min(bars.length, currentIndex + 1);
    const visibleBars = bars.slice(Math.max(0, activeEnd - 60), activeEnd);
    if (visibleBars.length === 0) return;

    const rightMargin = 65;
    const chartWidth = width - rightMargin;
    const slotWidth = chartWidth / visibleBars.length;
    const { minPrice, maxPrice, priceRange } = calculatePriceBounds(visibleBars);

    drawGrid(ctx, height, chartWidth, maxPrice, priceRange);
    drawCandles(ctx, visibleBars, height, slotWidth, minPrice, priceRange);

    const latest = visibleBars[visibleBars.length - 1];
    if (latest) {
      const latestX = (visibleBars.length - 1) * slotWidth + slotWidth / 2;
      drawCursor(ctx, latest, latestX, height, chartWidth, rightMargin, minPrice, priceRange);
    }
  }, [bars, currentIndex, width, height]);

  useEffect(() => {
    render();
  }, [render]);

  return (
    <div style={{ position: 'relative', width, height }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', borderRadius: '8px' }} />
    </div>
  );
};
