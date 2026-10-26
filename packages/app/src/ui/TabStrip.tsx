import { useEffect, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { colors } from './Section';
import { MoreHint, useScrollHint } from './ScrollHint';

type Spot = (id: string, x: number, width: number) => void;

function TabButton(props: {
  id: string;
  label: string;
  active: string;
  onSelect: (id: string) => void;
  onSpot: Spot;
  small: boolean;
}) {
  const selected = props.id === props.active;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => props.onSelect(props.id)}
      onLayout={(e) => props.onSpot(props.id, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      style={[props.small ? styles.subTab : styles.tab, selected ? styles.tabActive : null]}
    >
      <Text style={selected ? styles.tabTextActive : styles.tabText}>{props.label}</Text>
    </Pressable>
  );
}

/**
 * A row of tabs that scrolls sideways on a narrow screen and shows a "more" hint when tabs are cut off. Used for
 * the main sections and, smaller, for the screens inside Practise and Settings.
 */
export function TabStrip<T extends string>(props: {
  tabs: ReadonlyArray<readonly [T, string]>;
  active: T;
  onSelect: (id: T) => void;
  small?: boolean;
}) {
  const ref = useRef<ScrollViewInstance>(null);
  const spots = useRef<Record<string, { x: number; width: number }>>({});
  const hint = useScrollHint();
  const view = useRef(hint.box);
  view.current = hint.box;
  // Selecting a tab that is cut off by the edge slides it fully into view.
  useEffect(() => {
    const spot = spots.current[props.active];
    const b = view.current;
    if (spot === undefined || b.view === 0) return;
    if (spot.x < b.x || spot.x + spot.width > b.x + b.view) {
      ref.current?.scrollTo({ x: Math.max(0, spot.x - 16), animated: true });
    }
  }, [props.active]);
  const onSpot: Spot = (id, x, width) => {
    spots.current[id] = { x, width };
  };
  return (
    <View style={styles.wrap}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.scroll, props.small === true ? styles.scrollSmall : null]}
        contentContainerStyle={styles.tabs}
        accessibilityRole="tablist"
        onLayout={hint.onLayout}
        onContentSizeChange={hint.onContentSizeChange}
        onScroll={hint.onScroll}
        scrollEventThrottle={16}
      >
        {props.tabs.map(([id, label]) => (
          <TabButton
            key={id}
            id={id}
            label={label}
            active={props.active}
            onSelect={(t) => props.onSelect(t as T)}
            onSpot={onSpot}
            small={props.small === true}
          />
        ))}
      </ScrollView>
      <MoreHint show={hint.showMore} />
    </View>
  );
}

const styles = StyleSheet.create({
  // flexShrink 0: a long screen below must never squeeze the tab strip to nothing (found in UAT, G1)
  wrap: { flexShrink: 0 },
  scroll: { flexGrow: 0, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: colors.line },
  scrollSmall: { backgroundColor: '#f6f7f9' },
  tabs: { flexDirection: 'row' },
  tab: { paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' },
  subTab: { paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { color: colors.muted },
  tabTextActive: { color: colors.accent, fontWeight: '600' },
});
