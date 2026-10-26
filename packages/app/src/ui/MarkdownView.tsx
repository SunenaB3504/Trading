import { StyleSheet, View } from 'react-native';
import type { Block, Span } from '@trading/content';
import { colors } from './colors';
import { AppText as Text } from './typography';

function Spans({ spans, style }: { spans: readonly Span[]; style?: object }) {
  return (
    <Text style={[styles.body, style]}>
      {spans.map((s, i) => (
        <Text key={i} style={[s.bold === true ? styles.bold : null, s.italic === true ? styles.italic : null]}>
          {s.text}
        </Text>
      ))}
    </Text>
  );
}

/**
 * A table on a phone: each row becomes a small card, one line per column, headed by its first cell. A wide table
 * would otherwise run off the screen.
 */
function Table({ head, rows }: { head: Span[][]; rows: Span[][][] }) {
  return (
    <View style={styles.table}>
      {rows.map((row, r) => (
        <View key={r} style={styles.card}>
          {row.map((cell, c) => {
            const label = (head[c] ?? []).map((s) => s.text).join('');
            return c === 0 ? (
              <Spans key={c} spans={cell.map((s) => ({ ...s, bold: true as const }))} />
            ) : (
              <Text key={c} style={styles.body}>
                <Text style={styles.label}>{`${label}: `}</Text>
                {cell.map((s, i) => (
                  <Text key={i} style={s.bold === true ? styles.bold : null}>
                    {s.text}
                  </Text>
                ))}
              </Text>
            );
          })}
        </View>
      ))}
    </View>
  );
}

function BlockView({ block }: { block: Block }) {
  if (block.t === 'h') return <Spans spans={block.spans} style={block.level <= 2 ? styles.h2 : styles.h3} />;
  if (block.t === 'p') return <Spans spans={block.spans} style={styles.p} />;
  if (block.t === 'table') return <Table head={block.head} rows={block.rows} />;
  return (
    <View style={styles.list}>
      {block.items.map((item, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.marker}>{block.t === 'ul' ? '•' : `${String(i + 1)}.`}</Text>
          <View style={styles.itemBody}>
            <Spans spans={item} />
          </View>
        </View>
      ))}
    </View>
  );
}

export function MarkdownView({ blocks }: { blocks: readonly Block[] }) {
  return (
    <View testID="lesson-body">
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { color: colors.text, fontSize: 15, lineHeight: 22 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  label: { color: colors.muted },
  p: { marginBottom: 12 },
  h2: { fontSize: 18, fontWeight: '700', marginTop: 8, marginBottom: 8 },
  h3: { fontSize: 16, fontWeight: '700', marginTop: 6, marginBottom: 6 },
  table: { marginBottom: 12, gap: 8 },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, gap: 2 },
  list: { marginBottom: 12, gap: 4 },
  item: { flexDirection: 'row', gap: 8 },
  marker: { color: colors.muted, width: 22, fontSize: 15, lineHeight: 22 },
  itemBody: { flex: 1 },
});
