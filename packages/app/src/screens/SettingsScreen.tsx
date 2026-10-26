import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import type { Profile } from '../profiles/profiles';
import {
  AI_MODES,
  loadProfileSettings,
  profileSettingsSchema,
  saveDeviceSettings,
  saveProfileSettings,
} from '../settings/settings';
import type { DeviceSettings, ProfileSettings } from '../settings/settings';
import type { KeyValueStore } from '../store/kv';
import { Button } from '../ui/Button';
import { Note, Section, colors } from '../ui/Section';
import { AppText as Text } from '../ui/typography';

const MODE_TEXT: Record<DeviceSettings['aiMode'], string> = {
  off: 'Off',
  preview: 'Preview',
  on: 'On',
};

const MISTAKE_LABELS: Record<keyof ProfileSettings['mistakes'], string> = {
  maxPositionPct: 'Largest position, % of account',
  averagingDownPct: 'Averaging down: below cost by %',
  revengeLossPct: 'Revenge trade: after a loss of % of account',
  maxTradesPerWeek: 'Most trades in a week',
  leverageMarginPct: 'Margin used, % of account (F&O)',
  sectorPct: 'Most in one sector, %',
};

function AiSection(props: { device: DeviceSettings; owner: boolean; save: (d: DeviceSettings) => void }) {
  const [limit, setLimit] = useState(String(props.device.aiMonthlyLimitRupees));
  return (
    <Section title="AI tutor (whole device)">
      <View style={styles.choices}>
        {AI_MODES.map((m) => {
          const usable = props.owner && m !== 'on';
          const on = props.device.aiMode === m;
          return (
            <Pressable
              key={m}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: !usable }}
              disabled={!usable}
              onPress={() => props.save({ ...props.device, aiMode: m })}
              style={[styles.choice, on ? styles.choiceOn : null, usable ? null : styles.choiceOff]}
              testID={`ai-mode-${m}`}
            >
              <Text style={on ? styles.choiceTextOn : styles.choiceText}>{MODE_TEXT[m]}</Text>
            </Pressable>
          );
        })}
      </View>
      <Note>Preview shows sample tutor conversations with no cost. Live AI ("On") arrives with the tutor itself.</Note>
      <Text style={styles.label}>Monthly AI limit for this device, in rupees</Text>
      <TextInput
        value={limit}
        onChangeText={(t) => setLimit(t.replace(/\D/g, ''))}
        editable={props.owner}
        keyboardType="number-pad"
        style={styles.input}
        accessibilityLabel="Monthly AI limit in rupees"
        testID="ai-limit"
      />
      {props.owner ? (
        <Button
          label="Save limit"
          quiet
          onPress={() => props.save({ ...props.device, aiMonthlyLimitRupees: Number(limit || '0') })}
        />
      ) : (
        <Note>Only the device owner can change the AI settings.</Note>
      )}
    </Section>
  );
}

function MistakesSection(props: { kv: KeyValueStore; onSaved: (msg: string) => void }) {
  const [values, setValues] = useState<Record<string, string> | null>(null);
  useEffect(() => {
    void loadProfileSettings(props.kv).then((s) =>
      setValues(Object.fromEntries(Object.entries(s.mistakes).map(([k, v]) => [k, String(v)]))),
    );
  }, [props.kv]);
  if (values === null) return <Note>Loading...</Note>;
  const save = () => {
    const mistakes = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v)]));
    const parsed = profileSettingsSchema.safeParse({ mistakes });
    if (!parsed.success) {
      props.onSaved('Some values are out of range: percentages are 0 to 100, trades per week 1 to 500.');
      return;
    }
    void saveProfileSettings(props.kv, parsed.data).then(() => props.onSaved('Saved.'));
  };
  return (
    <Section title="Mistake checker (this profile)">
      {(Object.keys(MISTAKE_LABELS) as Array<keyof typeof MISTAKE_LABELS>).map((k) => (
        <View key={k}>
          <Text style={styles.label}>{MISTAKE_LABELS[k]}</Text>
          <TextInput
            value={values[k] ?? ''}
            onChangeText={(t) => setValues({ ...values, [k]: t.replace(/[^\d.]/g, '') })}
            keyboardType="numeric"
            style={styles.input}
            accessibilityLabel={MISTAKE_LABELS[k]}
          />
        </View>
      ))}
      <Button label="Save checker settings" onPress={save} testID="save-mistakes" />
      <Note>The checker that uses these arrives with the journal; you can set your limits now.</Note>
    </Section>
  );
}

/** Settings → General (MIP Stage 1.5): device-wide AI settings and this profile's mistake-checker limits. */
export function SettingsScreen(props: {
  profile: Profile;
  profileKv: KeyValueStore;
  deviceKv: KeyValueStore;
  device: DeviceSettings;
  onDevice: (d: DeviceSettings) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const saveDevice = (d: DeviceSettings) => {
    void saveDeviceSettings(props.deviceKv, d).then(() => {
      props.onDevice(d);
      setMessage('Saved.');
    });
  };
  return (
    <ScrollView contentContainerStyle={styles.page} testID="settings-screen">
      {message !== null ? <Text style={styles.message} testID="settings-message">{message}</Text> : null}
      <AiSection device={props.device} owner={props.profile.owner} save={saveDevice} />
      <MistakesSection kv={props.profileKv} onSaved={setMessage} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  label: { color: colors.muted, fontSize: 13, marginTop: 8, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 10,
    minHeight: 44,
    color: colors.text,
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  choiceOn: { borderColor: colors.accent, backgroundColor: '#e8f0fe' },
  choiceOff: { opacity: 0.5 },
  choiceText: { color: colors.text },
  choiceTextOn: { color: colors.accent, fontWeight: '600' },
  message: { color: colors.text, marginBottom: 12 },
});
