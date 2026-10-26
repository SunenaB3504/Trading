import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { ProfileError } from '../profiles/profiles';
import type { Profile, ProfileStore } from '../profiles/profiles';
import { Button } from '../ui/Button';
import { Note, Section, colors } from '../ui/Section';
import { AppText as Text } from '../ui/typography';

const tags = (p: Profile, openId: string): string =>
  [p.id === openId ? 'open now' : null, p.owner ? 'device owner' : null, p.hasPin ? 'PIN' : null]
    .filter((t) => t !== null)
    .join(' · ');

type Run = (task: () => Promise<void>, done: string) => void;

function NameControls(props: { p: Profile; profiles: ProfileStore; run: Run }) {
  const [name, setName] = useState(props.p.name);
  const { p, profiles, run } = props;
  return (
    <>
      <TextInput value={name} onChangeText={setName} style={styles.input} accessibilityLabel={`Name of ${p.name}`} />
      <Button label="Rename" quiet onPress={() => run(() => profiles.rename(p.id, name), 'Renamed.')} />
    </>
  );
}

function PinControls(props: { p: Profile; profiles: ProfileStore; run: Run }) {
  const [pin, setPin] = useState('');
  const { p, profiles, run } = props;
  return (
    <>
      <TextInput
        value={pin}
        onChangeText={(t) => setPin(t.replace(/\D/g, '').slice(0, 4))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={4}
        style={styles.input}
        placeholder="New 4-digit PIN"
        accessibilityLabel="New PIN"
        testID="new-pin"
      />
      <Button label="Set PIN" quiet testID="set-pin" onPress={() => run(() => profiles.setPin(p.id, pin), 'PIN set.')} />
      {p.hasPin ? (
        <Button label="Remove PIN" quiet onPress={() => run(() => profiles.setPin(p.id, null), 'PIN removed.')} />
      ) : null}
    </>
  );
}

/** What only the device owner sees on another profile: hand over ownership, or delete it (asked twice). */
function OwnerControls(props: { p: Profile; isOpen: boolean; profiles: ProfileStore; run: Run }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const { p, profiles, run } = props;
  return (
    <>
      {!p.owner ? (
        <Button label="Make device owner" quiet onPress={() => run(() => profiles.makeOwner(p.id), `${p.name} is now the device owner.`)} />
      ) : null}
      {!props.isOpen ? (
        <Button
          label={confirmDelete ? `Confirm: delete ${p.name} and all its data` : 'Delete'}
          danger={confirmDelete}
          quiet={!confirmDelete}
          onPress={() => {
            if (!confirmDelete) setConfirmDelete(true);
            else run(() => profiles.remove(p.id), `${p.name} was deleted.`);
          }}
        />
      ) : null}
    </>
  );
}

function ProfileCard(props: { p: Profile; open: Profile; profiles: ProfileStore; run: Run; onSwitch: (id: string) => void }) {
  const { p, open, profiles, run } = props;
  const isOpen = p.id === open.id;
  return (
    <View style={styles.card} testID={`profile-${p.name}`}>
      <Text style={styles.name}>{p.name}</Text>
      <Text style={styles.tags}>{tags(p, open.id)}</Text>
      {!isOpen ? <Button label={`Open ${p.name}`} onPress={() => props.onSwitch(p.id)} /> : null}
      {isOpen || open.owner ? <NameControls p={p} profiles={profiles} run={run} /> : null}
      {isOpen ? <PinControls p={p} profiles={profiles} run={run} /> : null}
      {open.owner ? <OwnerControls p={p} isOpen={isOpen} profiles={profiles} run={run} /> : null}
    </View>
  );
}

/** Profiles on this device (MIP Stage 1.4): open, add, rename, PIN, owner and delete. */
export function ProfilesScreen(props: {
  profiles: ProfileStore;
  open: Profile;
  onSwitch: (id: string) => void;
  onChanged: () => void;
}) {
  const [list, setList] = useState<Profile[]>([]);
  const [newName, setNewName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const refresh = useCallback(async () => setList(await props.profiles.list()), [props.profiles]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const run: Run = (task, done) => {
    void task().then(
      async () => {
        setMessage(done);
        await refresh();
        props.onChanged();
      },
      (e: unknown) => setMessage(e instanceof ProfileError ? e.message : 'That did not work.'),
    );
  };
  return (
    <ScrollView contentContainerStyle={styles.page} testID="profiles-screen">
      {message !== null ? <Text style={styles.message} testID="profiles-message">{message}</Text> : null}
      <Section title="Profiles on this device">
        {list.map((p) => (
          <ProfileCard key={`${p.id}-${p.name}`} p={p} open={props.open} profiles={props.profiles} run={run} onSwitch={props.onSwitch} />
        ))}
      </Section>
      <Section title="Add a profile">
        <TextInput
          value={newName}
          onChangeText={setNewName}
          style={styles.input}
          placeholder="Name, for example Neil"
          accessibilityLabel="New profile name"
          testID="new-profile-name"
        />
        <Button
          label="Add profile"
          testID="add-profile"
          onPress={() =>
            run(async () => {
              await props.profiles.create(newName);
              setNewName('');
            }, 'Profile added.')
          }
        />
        <Note>Each profile has its own practice account, settings and backup.</Note>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, marginBottom: 12 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text },
  tags: { color: colors.muted, fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 10,
    minHeight: 44,
    color: colors.text,
    marginTop: 6,
  },
  message: { color: colors.text, marginBottom: 12 },
});
