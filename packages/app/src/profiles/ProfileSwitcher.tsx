import { useEffect, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { colors } from '../ui/colors';
import { AppText as Text } from '../ui/typography';
import { unsavedWork } from '../ui/unsaved';
import { ProfileError } from './profiles';
import type { Profile, ProfileStore } from './profiles';

/** One profile in the list: the open one is ticked, a PIN is shown as a lock. */
function ProfileRow(props: { p: Profile; open: boolean; onPress: () => void }) {
  const { p } = props;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: props.open }}
      onPress={props.onPress}
      style={[styles.row, props.open ? styles.rowOn : null]}
      testID={`switch-to-${p.name}`}
    >
      <Text style={styles.tick}>{props.open ? '✓' : ''}</Text>
      <Text style={styles.name}>{p.name}</Text>
      <Text style={styles.tags}>{[props.open ? 'open now' : null, p.hasPin ? '🔒 PIN' : null].filter((t) => t !== null).join(' · ')}</Text>
    </Pressable>
  );
}

/** "+ Add a profile": a name box that creates the profile and opens it. */
function AddRow(props: { onAdd: (name: string) => Promise<void> }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  if (!adding)
    return (
      <Pressable accessibilityRole="button" onPress={() => setAdding(true)} style={styles.row} testID="switcher-add">
        <Text style={styles.action}>+ Add a profile</Text>
      </Pressable>
    );
  const add = () => {
    Keyboard.dismiss();
    props.onAdd(name).catch((e: unknown) => setError(e instanceof ProfileError ? e.message : 'That did not work.'));
  };
  return (
    <View style={styles.addBox}>
      <TextInput
        value={name}
        onChangeText={setName}
        onSubmitEditing={add}
        autoFocus
        placeholder="Name, for example Neil"
        placeholderTextColor={colors.muted}
        style={styles.input}
        accessibilityLabel="New profile name"
        testID="switcher-new-name"
      />
      <Pressable accessibilityRole="button" onPress={add} style={styles.addButton} testID="switcher-add-confirm">
        <Text style={styles.addButtonText}>Add and open</Text>
      </Pressable>
      {error !== null ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

/** Asks before a switch throws away unsaved work on the screen. */
function DiscardAsk(props: { what: string; target: Profile; onDiscard: () => void; onKeep: () => void }) {
  return (
    <View style={styles.ask} testID="switcher-discard">
      <Text style={styles.askText}>{`You have ${props.what}. Discard it and open ${props.target.name}?`}</Text>
      <View style={styles.askButtons}>
        <Pressable accessibilityRole="button" onPress={props.onKeep} style={[styles.askButton, styles.keep]}>
          <Text style={styles.action}>Keep editing</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={props.onDiscard} style={[styles.askButton, styles.discard]} testID="switcher-discard-confirm">
          <Text style={styles.discardText}>Discard and switch</Text>
        </Pressable>
      </View>
    </View>
  );
}

/**
 * The panel under the profile name in the header: every profile on the device, one tap to open it (a profile with a
 * PIN asks for it first), a quick "add", and the way to the full Profiles tab.
 */
export function ProfileSwitcher(props: {
  profiles: ProfileStore;
  open: Profile;
  onSwitch: (id: string) => void;
  onManage: () => void;
  onClose: () => void;
}) {
  const [list, setList] = useState<Profile[]>([]);
  const [asking, setAsking] = useState<Profile | null>(null);
  useEffect(() => {
    void props.profiles.list().then(setList);
  }, [props.profiles]);
  const go = (p: Profile) => {
    props.onClose();
    if (p.id !== props.open.id) props.onSwitch(p.id);
  };
  const choose = (p: Profile) => {
    if (p.id === props.open.id) return props.onClose();
    if (unsavedWork() !== null) return setAsking(p);
    return go(p);
  };
  const add = async (name: string) => {
    const p = await props.profiles.create(name);
    go(p);
  };
  return (
    <View style={styles.layer} testID="profile-switcher">
      <Pressable accessibilityRole="button" accessibilityLabel="Close the profile list" onPress={props.onClose} style={styles.backdrop} />
      <View style={styles.panel}>
        <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
          {list.map((p) => (
            <ProfileRow key={p.id} p={p} open={p.id === props.open.id} onPress={() => choose(p)} />
          ))}
          {asking !== null ? (
            <DiscardAsk what={unsavedWork() ?? 'unsaved work'} target={asking} onKeep={() => setAsking(null)} onDiscard={() => go(asking)} />
          ) : null}
          <AddRow onAdd={add} />
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              props.onClose();
              props.onManage();
            }}
            style={styles.row}
            testID="switcher-manage"
          >
            <Text style={styles.action}>Manage profiles…</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 10 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.25)' },
  panel: {
    marginHorizontal: 16,
    backgroundColor: colors.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    maxHeight: '80%',
    alignSelf: 'stretch',
    maxWidth: 480,
    width: '100%',
    marginLeft: 'auto',
    elevation: 8,
  },
  scroll: { paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 14, gap: 8 },
  rowOn: { backgroundColor: colors.selected },
  tick: { width: 16, color: colors.accent, fontWeight: '700' },
  name: { color: colors.text, fontWeight: '600', fontSize: 16, flexShrink: 1 },
  tags: { color: colors.muted, fontSize: 12, marginLeft: 'auto', flexShrink: 0 },
  action: { color: colors.accent, fontWeight: '600' },
  addBox: { paddingHorizontal: 14, paddingVertical: 8, gap: 8 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 10, minHeight: 44, color: colors.text },
  addButton: { backgroundColor: colors.accent, borderRadius: 6, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: '#fff', fontWeight: '700' },
  error: { color: colors.loss },
  ask: { marginHorizontal: 14, marginVertical: 6, padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.warn, gap: 8 },
  askText: { color: colors.text },
  askButtons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  askButton: { minHeight: 44, borderRadius: 6, paddingHorizontal: 12, justifyContent: 'center', flexGrow: 1, alignItems: 'center' },
  keep: { borderWidth: 1, borderColor: colors.line },
  discard: { backgroundColor: colors.loss },
  discardText: { color: '#fff', fontWeight: '700' },
});
