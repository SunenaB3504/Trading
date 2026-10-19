import type { TextKey } from './keys';

export type Lang = 'en' | 'ml' | 'hi';

/** The names of the classical items, indexed the way the engine indexes them (0 = Aries, 0 = Ashwini). */
export interface Names {
  /** 27 stars. */
  stars: readonly string[];
  /** 12 signs. */
  signs: readonly string[];
  /** 9 planets by key: sun, moon, mars, mercury, jupiter, venus, saturn, rahu, ketu. */
  planets: Readonly<Record<string, string>>;
  /** The 9 Tara classes, Janma first. */
  tara: readonly string[];
}

/** One language for the Profile tab: its names, its sentences, and the spellings accepted when typing a star. */
export interface Pack {
  lang: Lang;
  /** The language's own name, shown on the switcher. */
  native: string;
  /** True until the owner has reviewed the pack; the screen then says so. */
  draft: boolean;
  names: Names;
  text: Readonly<Record<TextKey, string>>;
  /** Extra star spellings in this language's script, beyond the star names themselves: [spelling, star index]. */
  spellings: ReadonlyArray<readonly [string, number]>;
}
