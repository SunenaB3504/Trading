import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { ENGLISH, tr } from './index';
import type { Pack, TextKey } from './index';

/** The language of the Profile tab, available to every component inside it without passing it down. */
const PackContext = createContext<Pack>(ENGLISH);

export function PackProvider(props: { pack: Pack; children: ReactNode }) {
  return <PackContext.Provider value={props.pack}>{props.children}</PackContext.Provider>;
}

export const usePack = (): Pack => useContext(PackContext);

export type Translate = (key: TextKey, vars?: Readonly<Record<string, string | number>>) => string;

/** `t('form.save')`: a sentence of the current language, with its placeholders filled. */
export function useT(): Translate {
  const pack = useContext(PackContext);
  return (key, vars) => tr(pack, key, vars);
}
