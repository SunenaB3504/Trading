import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput } from 'react-native';
import { applyImport, backupStatus, exportProfile, previewImport, readBackup } from '../backup/backupService';
import type { BackupStatus, Exported, ImportPreview, ReadBackup } from '../backup/backupService';
import { PLATFORM, offerFile, pickFileText, requestPersistence, secureRandomHex } from '../platform/device';
import type { Persistence } from '../platform/device';
import type { Profile, ProfileStore } from '../profiles/profiles';
import type { KeyValueStore } from '../store/kv';
import { demoMarket } from '../trading/paperSession';
import { Button } from '../ui/Button';
import { Note, Row, Section, colors } from '../ui/Section';
import { AppText as Text } from '../ui/typography';

function persistenceText(p: Persistence | null): string {
  if (p === null) return 'Checking...';
  if (p === 'granted') return PLATFORM === 'web' ? 'Kept: the browser will not clear this data on its own' : 'Kept on this phone';
  if (p === 'refused') return 'Not guaranteed: the browser may clear this data, so export often';
  return 'Not available here';
}

const fileName = (p: Profile): string =>
  `market-learning-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;

function ExportSection(props: { device: KeyValueStore; profileKv: KeyValueStore; profile: Profile; now: () => number; onDone: () => void }) {
  const [out, setOut] = useState<Exported | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const run = async () => {
    setOut(
      await exportProfile({
        device: props.device,
        profileKv: props.profileKv,
        profile: props.profile,
        snapshotId: demoMarket().snapshot.id,
        now: props.now(),
        randomHex: secureRandomHex,
      }),
    );
    props.onDone();
  };
  return (
    <Section title={`Export ${props.profile.name}`}>
      <Button label="Export this profile" onPress={() => void run()} testID="export-button" />
      {out !== null ? (
        <>
          <Note>{`Exported ${out.count} orders with this profile's settings. Save the file, or copy the text.`}</Note>
          <TextInput testID="bundle-text" value={out.text} multiline editable={false} style={styles.box} accessibilityLabel="Exported bundle" />
          <Button
            label={PLATFORM === 'web' ? 'Download as a file' : 'Save or share the file'}
            onPress={() => void offerFile(fileName(props.profile), out.text).then((ok) => setSaved(ok ? 'Done.' : 'Saving a file is not available here; copy the text instead.'))}
            testID="download-button"
          />
          {saved !== null ? <Note>{saved}</Note> : null}
          <Note>{`Signing key (keep it with the file; it proves the file is yours): ${out.keyHex}`}</Note>
          <Note>The file never holds a PIN or an AI key.</Note>
        </>
      ) : null}
    </Section>
  );
}

function previewText(p: ImportPreview): string {
  const what = `${p.ordersInFile} orders${p.settings ? ' and its settings' : ''}`;
  if (p.target === 'new') return `This adds a new profile, ${p.profileName}, with ${what}.`;
  if (p.target === 'fresh')
    return `This device has only its empty starting profile, ${p.replaces ?? ''}. It is replaced by ${p.profileName} from the file, with ${what}.`;
  if (p.target === 'existing') return `This replaces ${p.profileName} on this device (now ${p.ordersNow} orders) with ${what} from the file.`;
  return `This file comes from the earlier single-user app. It replaces the book of ${p.profileName} (now ${p.ordersNow} orders) with ${p.ordersInFile} orders.`;
}

const checkNote = (b: ReadBackup): string =>
  b.level === 'signed'
    ? 'The signature was checked.'
    : 'Without the key the signature could not be checked; the file was checked for changes.';

function ImportSection(props: { device: KeyValueStore; profiles: ProfileStore; now: () => number; onImported: (p: Profile) => void }) {
  const [text, setText] = useState('');
  const [key, setKey] = useState('');
  const [ready, setReady] = useState<ReadBackup | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const reset = () => setReady(null);
  const press = async () => {
    if (ready === null) {
      const r = await readBackup(props.device, text, key, demoMarket().snapshot.id);
      if (!r.ok) {
        setMessage(r.message);
        return;
      }
      setReady(r.backup);
      setMessage(`${previewText(await previewImport(r.backup, props.profiles))} ${checkNote(r.backup)} Press the button again to confirm.`);
      return;
    }
    const target = await applyImport(ready, props.profiles, props.now());
    setReady(null);
    setMessage(`Imported ${ready.orders.length} orders into ${target.name}. ${checkNote(ready)}`);
    props.onImported(target);
  };
  return (
    <Section title="Import">
      <Button
        label="Choose a backup file"
        quiet
        testID="pick-file"
        onPress={() =>
          void pickFileText().then((t) => {
            if (t !== null) {
              setText(t);
              reset();
            }
          })
        }
      />
      <Text style={styles.label}>Or paste the bundle text</Text>
      <TextInput
        testID="import-text"
        value={text}
        onChangeText={(t) => {
          setText(t);
          reset();
        }}
        multiline
        style={styles.box}
        accessibilityLabel="Bundle text"
      />
      <Text style={styles.label}>Signing key (optional)</Text>
      <TextInput testID="import-key" value={key} onChangeText={(t) => { setKey(t); reset(); }} style={styles.input} accessibilityLabel="Signing key" />
      <Button label={ready === null ? 'Check and import' : 'Confirm: import'} onPress={() => void press()} testID="import-button" />
      {message !== null ? <Text style={styles.message} testID="import-message">{message}</Text> : null}
    </Section>
  );
}

export function BackupScreen(props: {
  device: KeyValueStore;
  profiles: ProfileStore;
  profile: Profile;
  now: () => number;
  onImported: (p: Profile) => void;
}) {
  const profileKv = useMemo(() => props.profiles.scope(props.profile.id), [props.profiles, props.profile.id]);
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [persistence, setPersistence] = useState<Persistence | null>(null);
  const { now } = props;
  const refresh = useCallback(async () => setStatus(await backupStatus(profileKv, now())), [profileKv, now]);
  useEffect(() => {
    void refresh();
    void requestPersistence().then(setPersistence);
  }, [refresh]);
  return (
    <ScrollView contentContainerStyle={styles.page} testID="backup-screen">
      <Section title="Protect your data">
        <Row label={PLATFORM === 'web' ? 'Browser storage' : 'Phone storage'} value={persistenceText(persistence)} />
        <Row label="Last export" value={status === null ? '...' : status.daysSince === null ? 'never' : `${status.daysSince} days ago`} />
        {status?.due ? (
          <Note>Export this profile now: a cleared browser, a lost phone or a new device loses it otherwise. Export weekly and before anything that deletes data.</Note>
        ) : null}
      </Section>
      <ExportSection device={props.device} profileKv={profileKv} profile={props.profile} now={now} onDone={() => void refresh()} />
      <ImportSection device={props.device} profiles={props.profiles} now={now} onImported={props.onImported} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  label: { color: colors.muted, fontSize: 13, marginTop: 6 },
  box: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 8, minHeight: 100, color: colors.text, fontSize: 12 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 10, minHeight: 44, color: colors.text },
  message: { marginTop: 6, color: colors.text },
});
