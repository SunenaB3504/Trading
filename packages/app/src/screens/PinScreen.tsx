import { useState } from 'react';
import { ScrollView, StyleSheet, TextInput } from 'react-native';
import type { Profile } from '../profiles/profiles';
import { Button } from '../ui/Button';
import { Note, Section, colors } from '../ui/Section';
import { AppText as Text } from '../ui/typography';

/** Asks for a profile's PIN before its data is shown, and lets the person open another profile instead. */
export function PinScreen(props: {
  profile: Profile;
  others: Profile[];
  check: (pin: string) => Promise<boolean>;
  onUnlock: () => void;
  onSwitch: (id: string) => void;
}) {
  const [pin, setPin] = useState('');
  const [wrong, setWrong] = useState(false);
  const submit = async () => {
    if (await props.check(pin)) props.onUnlock();
    else {
      setWrong(true);
      setPin('');
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.page} testID="pin-screen">
      <Section title={`Open ${props.profile.name}`}>
        <Text style={styles.label}>PIN</Text>
        <TextInput
          testID="pin-input"
          value={pin}
          onChangeText={(t) => {
            setPin(t.replace(/\D/g, '').slice(0, 4));
            setWrong(false);
          }}
          keyboardType="number-pad"
          secureTextEntry
          maxLength={4}
          style={styles.input}
          accessibilityLabel="PIN"
          onSubmitEditing={() => void submit()}
        />
        {wrong ? <Text style={styles.wrong}>That PIN is not right.</Text> : null}
        <Button label="Open" onPress={() => void submit()} testID="pin-open" />
      </Section>
      {props.others.length > 0 ? (
        <Section title="Or open another profile">
          {props.others.map((p) => (
            <Button key={p.id} label={p.name} onPress={() => props.onSwitch(p.id)} quiet />
          ))}
        </Section>
      ) : null}
      <Note>A PIN keeps family members out of each other's practice by accident; it is not strong security.</Note>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 480, width: '100%', alignSelf: 'center' },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 10,
    minHeight: 44,
    fontSize: 20,
    letterSpacing: 8,
    color: colors.text,
  },
  wrong: { color: colors.warn, marginTop: 6 },
});
