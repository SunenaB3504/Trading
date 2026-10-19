import type { KeyValueStore } from '../../store/kv';
import { ENGLISH } from './en';
import { HINDI } from './hi';
import { MALAYALAM } from './ml';
import type { TextKey } from './keys';
import type { Lang, Pack } from './types';

export type { Lang, Pack } from './types';
export type { TextKey } from './keys';
export { ENGLISH } from './en';

/** The packs available to the switcher, in the order shown. */
export const PACKS: readonly Pack[] = [MALAYALAM, ENGLISH, HINDI];

export const DEFAULT_LANG: Lang = 'en';

export function packFor(lang: Lang | string | null): Pack {
  return PACKS.find((p) => p.lang === lang) ?? ENGLISH;
}

/** Fills {placeholders} in a sentence. A placeholder with no value is left visible so a mistake shows. */
export function fmt(
  template: string,
  vars: Readonly<Record<string, string | number>> = {},
): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/** One sentence of a pack, with its placeholders filled. */
export function tr(
  pack: Pack,
  key: TextKey,
  vars: Readonly<Record<string, string | number>> = {},
): string {
  return fmt(pack.text[key], vars);
}

/** The names of the placeholders in a sentence, sorted: used to check that translations keep them all. */
export function placeholders(template: string): string[] {
  return [...new Set([...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string))].sort();
}

/**
 * Every star spelling any pack knows in its own script, so a star typed in one language is still understood
 * after the language is switched: [spelling, star index].
 */
export function allSpellings(): Array<readonly [string, number]> {
  return PACKS.flatMap((p) => [
    ...p.names.stars.map((n, i): readonly [string, number] => [n, i]),
    ...p.spellings,
  ]);
}

export const LANG_KEY = 'settings/profile-language';

/** The remembered language; English if none was chosen or the value is unknown. */
export async function readLang(kv: KeyValueStore): Promise<Lang> {
  return packFor(await kv.get(LANG_KEY)).lang;
}

/** Remembers the choice on this device. Only called from the Profile screen, which a locked device never shows. */
export async function saveLang(kv: KeyValueStore, lang: Lang): Promise<void> {
  await kv.set(LANG_KEY, lang);
}
