import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * The height of the on-screen keyboard while it is open, 0 otherwise. Android draws the app edge to edge, so the
 * window is not resized for the keyboard on its own: the app leaves this much room at the bottom instead.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const shown = Keyboard.addListener('keyboardDidShow', (e) => setHeight(e.endCoordinates.height));
    const hidden = Keyboard.addListener('keyboardDidHide', () => setHeight(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);
  return height;
}
