import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { scrollBench } from './shared/bench';
import type { BenchResult } from './shared/bench';
import { fmtPaise, makeBundle } from './shared/data';
import type { Bundle } from './shared/data';
import { idbStore } from './shared/idbStore';
import { timeStore } from './shared/store';
import type { Timing } from './shared/store';
import { sqliteWasmStore } from './sqliteStore';

const ROW_H = 36;
const VIEW_H = 600;
const bundle = makeBundle();

function Chart({ series }: { series: number[] }) {
  const w = 900;
  const h = 160;
  const lo = Math.min(...series);
  const hi = Math.max(...series);
  const d = series
    .map(
      (v, i) =>
        `${i === 0 ? 'M' : 'L'}${((i / (series.length - 1)) * w).toFixed(1)},${(h - ((v - lo) / (hi - lo)) * h).toFixed(1)}`,
    )
    .join('');
  return (
    <svg width={w} height={h} style={{ background: '#f6f6f6' }}>
      <path d={d} fill="none" stroke="#1a56db" strokeWidth={1.2} />
    </svg>
  );
}

function Table({ b, boxRef }: { b: Bundle; boxRef: React.RefObject<HTMLDivElement | null> }) {
  const [top, setTop] = useState(0);
  const first = Math.max(0, Math.floor(top / ROW_H) - 5);
  const last = Math.min(b.rows.length, first + Math.ceil(VIEW_H / ROW_H) + 10);
  return (
    <div
      ref={boxRef}
      onScroll={(e) => setTop(e.currentTarget.scrollTop)}
      style={{ height: VIEW_H, overflow: 'auto', border: '1px solid #ccc' }}
    >
      <div style={{ height: b.rows.length * ROW_H, position: 'relative' }}>
        {b.rows.slice(first, last).map((r) => (
          <div
            key={r.id}
            style={{
              position: 'absolute',
              top: r.id * ROW_H,
              height: ROW_H,
              display: 'flex',
              gap: 16,
              alignItems: 'center',
              padding: '0 8px',
              borderBottom: '1px solid #eee',
              fontSize: 13,
            }}
          >
            <span style={{ width: 60 }}>{r.id}</span>
            <span style={{ width: 80 }}>{r.symbol}</span>
            <span style={{ width: 90 }}>{r.date}</span>
            <span style={{ width: 80 }}>{fmtPaise(r.open)}</span>
            <span style={{ width: 80 }}>{fmtPaise(r.high)}</span>
            <span style={{ width: 80 }}>{fmtPaise(r.low)}</span>
            <span style={{ width: 80 }}>{fmtPaise(r.close)}</span>
            <span style={{ width: 90 }}>{r.volume}</span>
            <span style={{ width: 90, color: r.pnl < 0 ? '#b00020' : '#0a7d33' }}>{fmtPaise(r.pnl)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function App() {
  const box = useRef<HTMLDivElement | null>(null);
  const [timings, setTimings] = useState<Timing[]>([]);
  const [bench, setBench] = useState<BenchResult | null>(null);
  const [shown, setShown] = useState<Bundle | null>(null);
  const run = async () => {
    const t: Timing[] = [];
    for (const s of [idbStore, sqliteWasmStore]) t.push(await timeStore(s, bundle));
    setTimings(t);
    setShown(await sqliteWasmStore.load());
    return t;
  };
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__spike = {
      run,
      bench: async () => {
        const r = await scrollBench(box.current!);
        setBench(r);
        return r;
      },
      loadOnly: async () => ({
        idb: (await idbStore.load())?.rows.length ?? 0,
        sqlite: (await sqliteWasmStore.load())?.rows.length ?? 0,
      }),
      ready: true,
    };
  });
  return (
    <div style={{ padding: 16, width: 950 }}>
      <h3>Plain React shell (Vite)</h3>
      <button onClick={() => void run()}>Run store timings + open bundle</button>{' '}
      <button onClick={() => void scrollBench(box.current!).then(setBench)}>Run scroll benchmark</button>
      <pre>{JSON.stringify({ timings, bench }, null, 1)}</pre>
      <Chart series={bundle.series} />
      <Table b={shown ?? bundle} boxRef={box} />
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
