/**
 * Where the app gets its daily snapshot (D26). The origin is the owner's data host and the keys are the public
 * Ed25519 keys the app trusts, by key id. While `origin` is null the feature is off and the app makes no request.
 */
export interface SnapshotConfig {
  origin: string | null;
  /** key id to 64-hex-digit Ed25519 public key. */
  keys: Readonly<Record<string, string>>;
}

/** D26, owner choice 2026-10-23: the host runs on the owner's own machine (`pnpm snapshot:serve`), signed with a local key. */
export const SNAPSHOT_CONFIG: SnapshotConfig = {
  origin: 'http://127.0.0.1:8787',
  keys: { k1: 'f9919706890135b3f515399055288d2cebc5eb084f036c8a753a6131daab989e' },
};
