import { generateKeyPairSync } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

/**
 * Makes an Ed25519 key pair for signing the daily snapshot (D26) and prints only the public half, as the 64 hex
 * characters the app pins. The private key is written to the file you name, which must be outside this repository
 * and must not exist yet. Use it for a test key; with cloud KMS the private key never leaves KMS.
 *
 *   pnpm tsx tools/genSnapshotKey.ts C:\keys\snapshot_k1.pem k1
 */
const [target, keyId = 'k1'] = process.argv.slice(2);
if (target === undefined) {
  console.error('usage: genSnapshotKey <private-key-file outside the repo> [keyId]');
  process.exit(2);
}
const path = resolve(target);
const inside = !relative(resolve('.'), path).startsWith('..');
if (inside) {
  console.error('refusing: the private key file must be outside this repository');
  process.exit(2);
}
if (existsSync(path)) {
  console.error('refusing: that file already exists');
  process.exit(2);
}
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const x = publicKey.export({ format: 'jwk' }).x ?? '';
const hex = Buffer.from(x, 'base64url').toString('hex');
writeFileSync(path, privateKey.export({ format: 'pem', type: 'pkcs8' }), { mode: 0o600 });
console.log(`keyId:      ${keyId}`);
console.log(`public key: ${hex}`);
console.log(`private key written to ${path} (keep it secret; never commit or paste it)`);
