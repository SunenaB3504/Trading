import { memo, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { scrollBench } from './src/shared/bench';
import type { BenchResult } from './src/shared/bench';
import { fmtPaise, makeBundle } from './src/shared/data';
import type { Bundle, Row } from './src/shared/data';
import { idbStore } from './src/shared/idbStore';
import { timeStore } from './src/shared/store';
import type { Timing } from './src/shared/store';
import { expoSqliteStore } from './src/expoSqliteStore';

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
    <Svg width={w} height={h} style={{ backgroundColor: '#f6f6f6' }}>
      <Path d={d} fill="none" stroke="#1a56db" strokeWidth={1.2} />
    </Svg>
  );
}

const Cell = ({ w, children, color }: { w: number; children: string | number; color?: string }) => (
  <Text style={[styles.cell, { width: w }, color ? { color } : null]}>{children}</Text>
);

const RowView = memo(function RowView({ r }: { r: Row }) {
  return (
    <View style={styles.row}>
      <Cell w={60}>{r.id}</Cell>
      <Cell w={80}>{r.symbol}</Cell>
      <Cell w={90}>{r.date}</Cell>
      <Cell w={80}>{fmtPaise(r.open)}</Cell>
      <Cell w={80}>{fmtPaise(r.high)}</Cell>
      <Cell w={80}>{fmtPaise(r.low)}</Cell>
      <Cell w={80}>{fmtPaise(r.close)}</Cell>
      <Cell w={90}>{r.volume}</Cell>
      <Cell w={90} color={r.pnl < 0 ? '#b00020' : '#0a7d33'}>
        {fmtPaise(r.pnl)}
      </Cell>
    </View>
  );
});

export default function App() {
  const list = useRef<FlatList<Row>>(null);
  const [timings, setTimings] = useState<Timing[]>([]);
  const [bench, setBench] = useState<BenchResult | null>(null);
  const [shown, setShown] = useState<Bundle | null>(null);

  const run = async () => {
    const t: Timing[] = [];
    for (const s of [idbStore, expoSqliteStore]) t.push(await timeStore(s, bundle));
    setTimings(t);
    setShown(await expoSqliteStore.load());
    return t;
  };
  const runBench = async () => {
    const node = list.current?.getScrollableNode() as HTMLElement;
    const r = await scrollBench(node);
    setBench(r);
    return r;
  };
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__spike = {
      run,
      bench: runBench,
      loadOnly: async () => ({
        idb: (await idbStore.load())?.rows.length ?? 0,
        sqlite: (await expoSqliteStore.load())?.rows.length ?? 0,
      }),
      ready: true,
    };
  });

  const data = (shown ?? bundle).rows;
  return (
    <View style={{ padding: 16, width: 950 }}>
      <Text style={{ fontSize: 18, fontWeight: '600' }}>Expo universal shell (react-native-web)</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginVertical: 8 }}>
        <Pressable onPress={() => void run()}>
          <Text>[Run store timings + open bundle]</Text>
        </Pressable>
        <Pressable onPress={() => void runBench()}>
          <Text>[Run scroll benchmark]</Text>
        </Pressable>
      </View>
      <Text style={{ fontFamily: 'monospace' }}>{JSON.stringify({ timings, bench })}</Text>
      <Chart series={bundle.series} />
      <FlatList
        ref={list}
        data={data}
        keyExtractor={(r) => String(r.id)}
        renderItem={({ item }) => <RowView r={item} />}
        getItemLayout={(_, index) => ({ length: ROW_H, offset: ROW_H * index, index })}
        initialNumToRender={25}
        windowSize={7}
        maxToRenderPerBatch={20}
        style={{ height: VIEW_H, borderWidth: 1, borderColor: '#ccc' }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    height: ROW_H,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cell: { fontSize: 13, marginRight: 16 },
});
