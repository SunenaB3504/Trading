import { Pressable, StyleSheet, View } from 'react-native';
import { formatPaise, formatPercent } from '../format/rupees';
import type { Holding } from '../trading/paperSession';
import { colors } from '../ui/colors';
import { Note, Section } from '../ui/Section';
import { AppText as Text } from '../ui/typography';
import { ExitPlanPanel } from './ExitPlanPanel';
import type { PlanActions } from './ExitPlanPanel';

const tone = (paise: number | null): string =>
  paise === null || paise === 0 ? colors.muted : paise > 0 ? colors.gain : colors.loss;

/** "+₹26.80 (+1.4%)", or a dash when the stock has no price. */
export function profitText(pnl: number | null, ratio: number | null): string {
  if (pnl === null) return '–';
  const sign = pnl > 0 ? '+' : '';
  return `${sign}${formatPaise(pnl)} (${ratio !== null && ratio > 0 ? '+' : ''}${formatPercent(ratio)})`;
}

/** One line for the selected-stock card: what the person holds of it. */
export function holdingLine(h: Holding): string {
  return `You hold ${String(h.quantity)} · average ${formatPaise(h.averagePaise)} · ${profitText(h.pnlPaise, h.pnlRatio)}`;
}

function HoldingRow({
  h,
  onSell,
  plans,
  suggest,
}: {
  h: Holding;
  onSell: (h: Holding) => void;
  plans: PlanActions;
  suggest: { stop: string; target: string } | undefined;
}) {
  return (
    <View style={styles.holding}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Prepares a sell order for these shares"
        onPress={() => onSell(h)}
        style={styles.row}
        testID={`holding-${h.symbol}`}
      >
        <View style={styles.top}>
          <Text style={styles.name}>{`${h.symbol}, ${String(h.quantity)} shares`}</Text>
          <Text style={[styles.pnl, { color: tone(h.pnlPaise) }]}>
            {profitText(h.pnlPaise, h.pnlRatio)}
          </Text>
        </View>
        <Text style={styles.detail}>
          {`average ${formatPaise(h.averagePaise)} · now ${h.markPaise === null ? '–' : formatPaise(h.markPaise)} · value ${h.valuePaise === null ? '–' : formatPaise(h.valuePaise)}`}
        </Text>
        <Text style={styles.sell}>Tap to sell now</Text>
      </Pressable>
      <ExitPlanPanel h={h} actions={plans} {...(suggest === undefined ? {} : { suggest })} />
    </View>
  );
}

/**
 * Everything the person needs before selling, at the top of Trade: each holding with its quantity, average cost, value
 * at the last close and profit so far, and the totals. Tapping a holding prepares a sell order for all of it.
 */
export function Holdings(props: {
  cash: string;
  holdings: readonly Holding[];
  onSell: (h: Holding) => void;
  plans: PlanActions;
  /** Stop and target written in the journal of each stock's last buy, offered when a plan is set. */
  suggestions?: Readonly<Record<string, { stop: string; target: string }>>;
}) {
  const priced = props.holdings.filter((h) => h.valuePaise !== null);
  const invested = priced.reduce((a, h) => a + h.basisPaise, 0);
  const value = priced.reduce((a, h) => a + (h.valuePaise ?? 0), 0);
  const pnl = value - invested;
  return (
    <Section title="Your holdings">
      <View testID="holdings">
        {props.holdings.length === 0 ? <Note>You hold no shares yet.</Note> : null}
        {props.holdings.map((h) => (
          <HoldingRow
            key={h.instrumentId}
            h={h}
            onSell={props.onSell}
            plans={props.plans}
            suggest={props.suggestions?.[h.instrumentId]}
          />
        ))}
        {priced.length > 0 ? (
          <View style={styles.total} testID="holdings-total">
            <Text
              style={styles.detail}
            >{`Invested ${formatPaise(invested)} · value ${formatPaise(value)}`}</Text>
            <Text
              style={[styles.pnl, { color: tone(pnl) }]}
            >{`Total ${profitText(pnl, invested === 0 ? null : pnl / invested)}`}</Text>
          </View>
        ) : null}
        <Text
          style={styles.detail}
        >{`Cash ${props.cash}. Profit is at the last close, before selling charges.`}</Text>
      </View>
    </Section>
  );
}

const styles = StyleSheet.create({
  holding: { borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 4 },
  row: { paddingVertical: 8, minHeight: 48, gap: 2 },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  name: { color: colors.text, fontWeight: '700', fontSize: 15, flexShrink: 1 },
  pnl: { fontWeight: '700', flexShrink: 0 },
  detail: { color: colors.muted, fontSize: 13 },
  sell: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 8,
  },
});
