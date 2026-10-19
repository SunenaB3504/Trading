import { createContext, useContext } from 'react';
import { StyleSheet, Text, TextInput } from 'react-native';
import type { TextInputProps, TextProps } from 'react-native';

/**
 * An optional typeface for a part of the app. A screen that provides fonts gets them in every Text and
 * TextInput below it; with nothing provided (the default) these behave exactly like the plain components,
 * so the rest of the app is unchanged.
 */
export interface Fonts {
  regular: string;
  bold: string;
}

const FontContext = createContext<Fonts | null>(null);

export const FontProvider = FontContext.Provider;

const isBold = (w: unknown): boolean =>
  w === 'bold' ||
  (typeof w === 'string' && Number(w) >= 600) ||
  (typeof w === 'number' && w >= 600);

export function AppText(props: TextProps) {
  const fonts = useContext(FontContext);
  if (fonts === null) return <Text {...props} />;
  const bold = isBold(StyleSheet.flatten(props.style)?.fontWeight);
  return (
    <Text
      {...props}
      style={[props.style, { fontFamily: bold ? fonts.bold : fonts.regular, fontWeight: 'normal' }]}
    />
  );
}

export function AppInput(props: TextInputProps) {
  const fonts = useContext(FontContext);
  if (fonts === null) return <TextInput {...props} />;
  return <TextInput {...props} style={[props.style, { fontFamily: fonts.regular }]} />;
}
