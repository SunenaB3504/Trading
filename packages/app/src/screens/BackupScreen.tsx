import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { backupStatus, exportBundle, importBundle } from '../backup/backupService';
import type { BackupStatus, Exported } from '../backup/backupService';
import { downloadText, requestPersistence, secureRandomHex } from '../backup/platform';
import type { Persistence } from '../backup/platform';
import type { KeyValueStore } from '../store/kv';
import { demoMarket } from '../trading/paperSession';
import { Note, Row, Section, colors } from '../ui/Section';

function Button(props: { label: string; onPress: () => void; testID: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={styles.button}
      testID={props.testID}
    >
      <Text style={styles.buttonText}>{props.label}</Text>
    </Pressable>
  );
}

function persistenceText(p: Persistence | null): string {
  if (p === null) return 'Checking...';
  if (p === 'granted') return 'Kept: the browser will not clear this data on its own';
  if (p === 'refused') return 'Not guaranteed: the browser may clear this data, so export often';
  return 'Not available here';
}

function useBackup(kv: KeyValueStore, now: () => number) {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [persistence, setPersistence] = useState<Persistence | null>(null);
  const refresh = useCallback(async () => setStatus(await backupStatus(kv, now())), [kv, now]);
  useEffect(() => {
    void refresh();
    void requestPersistence().then(setPersistence);
  }, [refresh]);
  return { status, persistence, refresh };
}

function ExportSection(props: { kv: KeyValueStore; now: () => number; onDone: () => void }) {
  const [out, setOut] = useState<Exported | null>(null);
  const run = async () => {
    const { snapshot } = demoMarket();
    setOut(await exportBundle(props.kv, snapshot.id, props.now(), secureRandomHex));
    props.onDone();
  };
  return (
    <Section title="Export">
      <Button label="Export my book" onPress={() => void run()} testID="export-button" />
      {out !== null ? (
        <>
          <Note>{`Exported ${out.count} orders. Copy this text somewhere safe, or download it.`}</Note>
          <TextInput
            testID="bundle-text"
            value={out.text}
            multiline
            editable={false}
            style={styles.box}
            accessibilityLabel="Exported bundle"
          />
          <Button
            label="Download as a file"
            onPress={() => downloadText('mock-trading-bundle.json', out.text)}
            testID="download-button"
          />
          <Note>{`Signing key (keep it with the file; it proves the file is yours): ${out.keyHex}`}</Note>
        </>
      ) : null}
    </Section>
  );
}

function ImportSection(props: { kv: KeyValueStore; now: () => number; onDone: () => void }) {
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [armed, setArmed] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const press = async () => {
    if (!armed) {
      setArmed(true);
      setMessage('Importing replaces the book on this device. Press the button again to confirm.');
      return;
    }
    setArmed(false);
    const r = await importBundle(props.kv, text, key, demoMarket().snapshot.id, props.now());
    setMessage(
      r.ok
        ? `Imported ${r.count} orders. ${r.level === 'signed' ? 'The signature was checked.' : 'The signature could not be checked without the key; the file was checked for changes.'}`
        : r.message,
    );
    if (r.ok) props.onDone();
  };
  return (
    <Section title="Import">
      <Text style={styles.label}>Bundle text</Text>
      <TextInput
        testID="import-text"
        value={text}
        onChangeText={(t) => {
          setText(t);
          setArmed(false);
        }}
        multiline
        style={styles.box}
        accessibilityLabel="Bundle text"
      />
      <Text style={styles.label}>Signing key (optional)</Text>
      <TextInput
        testID="import-key"
        value={key}
        onChangeText={setKey}
        style={styles.input}
        accessibilityLabel="Signing key"
      />
      <Button
        label={armed ? 'Confirm: replace my book' : 'Import (replaces my book)'}
        onPress={() => void press()}
        testID="import-button"
      />
      {message !== null ? (
        <Text style={styles.message} testID="import-message">
          {message}
        </Text>
      ) : null}
    </Section>
  );
}

export function BackupScreen({ kv, now }: { kv: KeyValueStore; now: () => number }) {
  const { status, persistence, refresh } = useBackup(kv, now);
  return (
    <ScrollView contentContainerStyle={styles.page} testID="backup-screen">
      <Section title="Protect your data">
        <Row label="Browser storage" value={persistenceText(persistence)} />
        <Row
          label="Last export"
          value={
            status === null
              ? '...'
              : status.daysSince === null
                ? 'never'
                : `${status.daysSince} days ago`
          }
        />
        {status?.due ? (
          <Note>
            Export your book now: a cleared browser or a new device loses it otherwise. Export
            weekly and before anything that deletes data.
          </Note>
        ) : null}
      </Section>
      <ExportSection kv={kv} now={now} onDone={() => void refresh()} />
      <ImportSection kv={kv} now={now} onDone={() => void refresh()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  label: { color: colors.muted, fontSize: 13, marginTop: 6 },
  box: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 8,
    minHeight: 100,
    color: colors.text,
    fontSize: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 10,
    minHeight: 44,
    color: colors.text,
  },
  message: { marginTop: 6, color: colors.text },
});
