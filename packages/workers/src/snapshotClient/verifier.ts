/** Checks a signature. Several implementations can stand behind this: WebCrypto where it has Ed25519, a library elsewhere. */
export interface SignatureVerifier {
  verify(message: Uint8Array, signatureHex: string, keyId: string): Promise<boolean>;
}

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from((hex.match(/../g) ?? []).map((h) => parseInt(h, 16)));

type SubtleLike = {
  importKey(
    format: 'raw',
    key: Uint8Array,
    algorithm: string,
    extractable: boolean,
    usages: string[],
  ): Promise<unknown>;
  verify(
    algorithm: string,
    key: unknown,
    signature: Uint8Array,
    data: Uint8Array,
  ): Promise<boolean>;
};

/**
 * Ed25519 through WebCrypto with the public keys pinned in the app, keyed by key id. An unknown key id, a signature
 * of the wrong length or any error in the platform is "not verified"; nothing here ever answers yes by default.
 */
export function pinnedEd25519(
  keys: Readonly<Record<string, string>>,
  subtle: SubtleLike = (globalThis as unknown as { crypto: { subtle: SubtleLike } }).crypto.subtle,
): SignatureVerifier {
  return {
    async verify(message, signatureHex, keyId) {
      const keyHex = keys[keyId];
      if (keyHex === undefined || !/^[0-9a-f]{64}$/.test(keyHex) || signatureHex.length !== 128)
        return false;
      try {
        const key = await subtle.importKey('raw', hexToBytes(keyHex), 'Ed25519', false, ['verify']);
        return await subtle.verify('Ed25519', key, hexToBytes(signatureHex), message);
      } catch {
        return false;
      }
    },
  };
}
