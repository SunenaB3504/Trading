import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatPaise } from '../format/rupees';
import type { Market } from '../trading/market';
import type { OrderForm } from '../trading/orderRequest';
import type { Holding } from '../trading/paperSession';
import { quoteOf } from '../trading/quote';
import { colors } from '../ui/colors';
import { profitText } from './Holdings';

/** Sets one field of the order form. */
export type SetField = <K extends keyof OrderForm>(k: K, v: OrderForm[K]) => void;

/** What the bar says the order comes to; a sell of a holding also says the profit at the last close. */
function orderSummary(market: Market, form: OrderForm, holding: Holding | undefined, when: string): string {
  const quote = form.instrumentId === '' ? null : quoteOf(market, form.instrumentId, form.date);
  const qty = Number(form.quantity);
  const name = market.symbols[form.instrumentId] ?? form.instrumentId;
  const verb = form.side === 'buy' ? 'Buy' : 'Sell';
  if (form.instrumentId === '') return 'Choose a stock to trade, or tap a holding to sell it.';
  if (quote === null || !Number.isSafeInteger(qty) || qty <= 0) return `${verb} ${name}: enter a quantity.`;
  const value = `${verb} ${String(qty)} × ${name} ≈ ${formatPaise(quote.close * qty)}`;
  const at = when === '' ? '' : `, ${when}`;
  return form.side === 'buy' ? `${value} at the last close${at}` : `${value}${sellNote(holding, qty, quote.close, name)}${at}`;
}

/** After a sell's value: the profit at the last close, or why the sell cannot go through as typed. */
function sellNote(holding: Holding | undefined, qty: number, close: number, name: string): string {
  if (holding === undefined) return `. You hold none of ${name}: a sell needs shares you own.`;
  if (qty > holding.quantity) return `. You hold only ${String(holding.quantity)}.`;
  const profit = (close - holding.averagePaise) * qty;
  const cost = holding.averagePaise * qty;
  return ` · profit ≈ ${profitText(profit, cost === 0 ? null : profit / cost)} before charges`;
}

/**
 * Always in reach at the bottom: "I want to: Buy | Sell" as a switch (a choice, not an action), what the order comes to
 * and when it trades, and the one button that places it, coloured by side so a sell never looks like a buy.
 */
export function OrderBar(props: {
  market: Market;
  form: OrderForm;
  set: SetField;
  submit: () => void;
  message: string | null;
  holding: Holding | undefined;
  /** "at today's close (…)", or empty. */
  when: string;
  /** Why the order cannot be placed as it stands, or empty. */
  problem: string;
}) {
  const { market, form, set } = props;
  const summary = orderSummary(market, form, props.holding, props.when);
  return (
    <View style={styles.bar} testID="order-bar">
      {props.message !== null ? (
        <Text style={styles.message} testID="order-message">
          {props.message}
        </Text>
      ) : null}
      <View style={styles.wantRow}>
        <Text style={styles.want}>I want to</Text>
        <View style={styles.switch} testID="pick-side" accessibilityRole="radiogroup">
          {(['buy', 'sell'] as const).map((side) => {
            const on = form.side === side;
            const tone = side === 'buy' ? colors.gain : colors.loss;
            return (
              <Pressable
                key={side}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => set('side', side)}
                style={[styles.segment, on ? { backgroundColor: tone } : null]}
              >
                <Text style={[styles.segmentText, { color: on ? '#fff' : colors.muted }]}>{side === 'buy' ? 'Buy' : 'Sell'}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
      <Text style={styles.summary} testID="order-summary">
        {summary}
      </Text>
      {props.problem !== '' && form.instrumentId !== '' ? (
        <Text style={styles.problem} testID="order-problem">
          {props.problem}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={props.submit}
        style={[styles.place, { backgroundColor: form.side === 'buy' ? colors.gain : colors.loss }]}
        testID="place-order"
      >
        <Text style={styles.placeText}>{`Place ${form.side} order`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 6,
  },
  message: { color: colors.text },
  wantRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  want: { color: colors.muted, fontSize: 13 },
  switch: { flex: 1, flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: 22, padding: 2, backgroundColor: colors.selected },
  segment: { flex: 1, minHeight: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  segmentText: { fontWeight: '700', fontSize: 15 },
  summary: { color: colors.text, fontSize: 13 },
  problem: { color: colors.warn, fontSize: 12 },
  place: { borderRadius: 6, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  placeText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
