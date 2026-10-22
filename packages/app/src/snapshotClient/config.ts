/**
 * Where the app gets its daily snapshot (D26). The origin is the owner's data host and the keys are the public
 * Ed25519 keys the app trusts, by key id. While `origin` is null the feature is off and the app makes no request.
 */
export interface SnapshotConfig {
  origin: string | null;
  /** key id to 64-hex-digit Ed25519 public key. */
  keys: Readonly<Record<string, string>>;
}

export const SNAPSHOT_CONFIG: SnapshotConfig = { origin: null, keys: {} };
