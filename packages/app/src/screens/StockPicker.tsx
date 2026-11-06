import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { formatPaise, formatPercent } from '../format/rupees';
import type { Market } from '../trading/market';
import { quoteOf, searchStocks } from '../trading/quote';
import { colors } from '../ui/colors';

/** A titled list of stocks shown before anything is typed: holdings, the watchlist, recent picks. */
export interface StockGroup {
  title: string;
  ids: readonly string[];
}

const nameOf = (market: Market, id: string): string => {
  const base = market.symbols[id] ?? id;
  return market.kinds[id] === 'etf' ? `${base} (ETF)` : base;
};

const changeColor = (change: number | null): string =>
  change === null || change === 0 ? colors.muted : change > 0 ? colors.gain : colors.loss;

/** One stock as a tappable row: symbol on the left, last close and the day's change on the right. */
function StockRow(props: { market: Market; id: string; selected: boolean; onPress: () => void }) {
  const q = quoteOf(props.market, props.id);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: props.selected }}
      onPress={props.onPress}
      style={[styles.row, props.selected ? styles.rowOn : null]}
    >
      <Text style={styles.symbol}>{nameOf(props.market, props.id)}</Text>
      <View style={styles.rowRight}>
        <Text style={styles.price}>{q === null ? 'no prices' : formatPaise(q.close)}</Text>
        {q !== null ? <Text style={[styles.change, { color: changeColor(q.change) }]}>{formatPercent(q.changeRatio)}</Text> : null}
      </View>
    </Pressable>
  );
}

/** The chosen stock: price, the day's change, the 52-week range and, when offered, a watchlist toggle. */
function SelectedCard(props: { market: Market; id: string; watched?: boolean; onToggleWatch?: () => void }) {
  const { market, id } = props;
  const q = quoteOf(market, id);
  const limited = market.rolling[id] === true;
  return (
    <View style={styles.card} testID="selected-stock">
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{`Selected: ${nameOf(market, id)}`}</Text>
        {props.onToggleWatch !== undefined ? (
          <Pressable accessibilityRole="button" onPress={props.onToggleWatch} style={styles.watch} testID="watch-toggle">
            <Text style={styles.watchText}>{props.watched === true ? '★ Watching' : '☆ Watch'}</Text>
          </Pressable>
        ) : null}
      </View>
      {q === null ? (
        <Text style={styles.muted}>No prices for this stock.</Text>
      ) : (
        <>
          <Text style={styles.cardPrice}>
            {formatPaise(q.close)}
            <Text style={{ color: changeColor(q.change) }}>
              {q.change === null ? '' : `  ${q.change >= 0 ? '+' : ''}${formatPaise(q.change)} (${formatPercent(q.changeRatio)})`}
            </Text>
          </Text>
          <Text style={styles.muted}>{`Close on ${q.date} · 52-week range ${formatPaise(q.low52)} to ${formatPaise(q.high52)}`}</Text>
        </>
      )}
      {limited ? <Text style={styles.muted}>Prices from the last 13 months (not one of the core stocks).</Text> : null}
    </View>
  );
}

/** A short list: every instrument as a button. */
function SmallPicker(props: { market: Market; value: string; onChange: (id: string) => void }) {
  const { market } = props;
  return (
    <View style={styles.chips} testID="pick-instrument">
      {market.instruments.map((id) => (
        <Pressable
          key={id}
          accessibilityRole="button"
          accessibilityState={{ selected: id === props.value }}
          onPress={() => props.onChange(id)}
          style={[styles.chip, id === props.value ? styles.rowOn : null]}
        >
          <Text style={id === props.value ? styles.chipTextOn : styles.symbol}>{nameOf(market, id)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** The matches of what was typed, or the groups when nothing is typed. */
function Results(props: { market: Market; query: string; value: string; groups: readonly StockGroup[]; pick: (id: string) => void }) {
  const { market, value, pick } = props;
  const typed = props.query.trim() !== '';
  const matches = searchStocks(market, props.query);
  const rows = (ids: readonly string[], key: string) =>
    ids.map((id) => <StockRow key={`${key}-${id}`} market={market} id={id} selected={id === value} onPress={() => pick(id)} />);
  return (
    <View testID="pick-instrument">
      {typed && matches.length === 0 ? <Text style={styles.muted}>No stock matches that name.</Text> : null}
      {typed ? rows(matches, 'match') : null}
      {typed
        ? null
        : props.groups.map((g) => (
            <View key={g.title} style={styles.group}>
              <Text style={styles.groupTitle}>{g.title}</Text>
              {rows(g.ids, g.title)}
            </View>
          ))}
    </View>
  );
}

/**
 * Picks one stock of a market. A short list is a row of buttons; a long one is a search box with matching rows, and
 * before anything is typed it shows the groups given (holdings, watchlist, recent) instead of the alphabet's first page.
 */
export function StockPicker(props: {
  market: Market;
  value: string;
  onChange: (id: string) => void;
  groups?: readonly StockGroup[];
  watched?: boolean;
  onToggleWatch?: () => void;
  onSearchFocus?: () => void;
}) {
  const { market } = props;
  const [query, setQuery] = useState('');
  if (market.instruments.length <= 6) return <SmallPicker market={market} value={props.value} onChange={props.onChange} />;
  const pick = (id: string) => {
    props.onChange(id);
    setQuery('');
  };
  return (
    <View>
      <Text style={styles.label}>{`Stock: type a name to search ${String(market.instruments.length)} stocks`}</Text>
      <TextInput
        testID="stock-search"
        value={query}
        onChangeText={setQuery}
        onFocus={props.onSearchFocus}
        placeholder="e.g. RELIANCE, TCS, ETF"
        placeholderTextColor={colors.muted}
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.input}
        accessibilityLabel="Search stocks"
      />
      <Results market={market} query={query} value={props.value} groups={(props.groups ?? []).filter((g) => g.ids.length > 0)} pick={pick} />
      {props.value !== '' ? (
        <SelectedCard
          market={market}
          id={props.value}
          {...(props.watched === undefined ? {} : { watched: props.watched })}
          {...(props.onToggleWatch === undefined ? {} : { onToggleWatch: props.onToggleWatch })}
        />
      ) : (
        <Text style={styles.muted} testID="no-stock">
          No stock chosen yet.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, minHeight: 48, color: colors.text, fontSize: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    gap: 8,
  },
  rowOn: { backgroundColor: colors.selected },
  rowRight: { alignItems: 'flex-end', flexShrink: 0 },
  symbol: { color: colors.text, fontWeight: '600', flexShrink: 1 },
  price: { color: colors.text },
  change: { fontSize: 12 },
  group: { marginTop: 10 },
  groupTitle: { color: colors.muted, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', marginBottom: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  chipTextOn: { color: colors.accent, fontWeight: '600' },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, marginTop: 10, gap: 4 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  cardTitle: { color: colors.text, fontWeight: '700', fontSize: 16, flexShrink: 1 },
  cardPrice: { color: colors.text, fontSize: 20, fontWeight: '700' },
  watch: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, flexShrink: 0 },
  watchText: { color: colors.accent, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 13, marginTop: 4 },
});
