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
function orderSummary(market: Market, form: OrderForm, holding: Holding | undefined): string {
  const quote = form.instrumentId === '' ? null : quoteOf(market, form.instrumentId, form.date);
  const qty = Number(form.quantity);
  const name = market.symbols[form.instrumentId] ?? form.instrumentId;
  const verb = form.side === 'buy' ? 'Buy' : 'Sell';
  if (form.instrumentId === '') return 'Choose a stock to trade, or tap a holding to sell it.';
  if (quote === null || !Number.isSafeInteger(qty) || qty <= 0) return `${verb} ${name}: enter a quantity.`;
  const value = `${verb} ${String(qty)} × ${name} ≈ ${formatPaise(quote.close * qty)}`;
  return form.side === 'buy' ? `${value} at the last close` : `${value}${sellNote(holding, qty, quote.close, name)}`;
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
 * Always in reach at the bottom: Buy or Sell, what the order comes to at the last close, and the button that places
 * it, coloured by side so a sell never looks like a buy.
 */
export function OrderBar(props: { market: Market; form: OrderForm; set: SetField; submit: () => void; message: string | null; holding: Holding | undefined }) {
  const { market, form, set } = props;
  const summary = orderSummary(market, form, props.holding);
  return (
    <View style={styles.bar} testID="order-bar">
      {props.message !== null ? (
        <Text style={styles.message} testID="order-message">
          {props.message}
        </Text>
      ) : null}
      <View style={styles.sides} testID="pick-side">
        {(['buy', 'sell'] as const).map((side) => {
          const on = form.side === side;
          const tone = side === 'buy' ? colors.gain : colors.loss;
          return (
            <Pressable
              key={side}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => set('side', side)}
              style={[styles.side, { borderColor: tone }, on ? { backgroundColor: tone } : null]}
            >
              <Text style={[styles.sideText, { color: on ? '#fff' : tone }]}>{side === 'buy' ? 'Buy' : 'Sell'}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.summary} testID="order-summary">
        {summary}
      </Text>
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
  sides: { flexDirection: 'row', gap: 8 },
  side: { flex: 1, borderWidth: 2, borderRadius: 8, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  sideText: { fontWeight: '700', fontSize: 16 },
  summary: { color: colors.text, fontSize: 13 },
  place: { borderRadius: 6, minHeight: 48, justifyContent: 'center', alignItems: 'center' },
  placeText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
