import type { Bundle } from './data';

/** The one storage seam the app would use on web and Android (SSD §7.5). */
export interface Store {
  readonly name: string;
  save(bundle: Bundle): Promise<void>;
  load(): Promise<Bundle | null>;
  clear(): Promise<void>;
}

export interface Timing {
  store: string;
  saveMs: number;
  loadMs: number;
  rows: number;
}

export async function timeStore(store: Store, bundle: Bundle): Promise<Timing> {
  await store.clear();
  const t0 = performance.now();
  await store.save(bundle);
  const t1 = performance.now();
  const loaded = await store.load();
  const t2 = performance.now();
  return {
    store: store.name,
    saveMs: Math.round(t1 - t0),
    loadMs: Math.round(t2 - t1),
    rows: loaded?.rows.length ?? 0,
  };
}
