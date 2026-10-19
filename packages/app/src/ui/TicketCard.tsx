import { StyleSheet, Text, View } from 'react-native';
import type { TicketView } from '../viewModels/ticketView';
import { Note, Row, Section, colors } from './Section';

/** A read-only experimental arm ticket (SSD §5.9). It has no buttons: nothing here places an order. */
export function TicketCard({ view }: { view: TicketView }) {
  return (
    <Section title={view.label}>
      <Text style={styles.headline} testID="ticket-headline">
        {view.headline}
      </Text>
      <View>
        {view.rows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
      </View>
      <Note>{view.footnote}</Note>
    </Section>
  );
}

const styles = StyleSheet.create({
  headline: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 6 },
});
