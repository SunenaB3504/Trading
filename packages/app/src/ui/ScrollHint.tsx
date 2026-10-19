import { useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from './colors';

interface Box {
  /** Width of the visible strip, width of everything in it, and how far it is scrolled. */
  view: number;
  content: number;
  x: number;
}

/**
 * Tells a sideways-scrolling strip whether more of it is hidden to the right, so a phone user is not left
 * guessing that tabs exist off the edge (UAT H1).
 */
export function useScrollHint() {
  const [box, setBox] = useState<Box>({ view: 0, content: 0, x: 0 });
  return {
    box,
    showMore: box.content > box.view + 2 && box.x + box.view < box.content - 2,
    onLayout: (e: LayoutChangeEvent) => {
      const width = e.nativeEvent.layout.width;
      setBox((b) => ({ ...b, view: width }));
    },
    onContentSizeChange: (width: number) => setBox((b) => ({ ...b, content: width })),
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      setBox((b) => ({ ...b, x }));
    },
  };
}

/** A soft right-hand edge with a chevron; it does not catch taps. */
export function MoreHint({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <View pointerEvents="none" style={styles.edge} testID="tabs-more">
      <Text style={styles.chevron}>›</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  edge: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 1,
    width: 32,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 8,
    backgroundColor: colors.background,
    opacity: 0.92,
  },
  chevron: { color: colors.muted, fontSize: 22, fontWeight: '600' },
});
