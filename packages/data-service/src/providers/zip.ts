import { inflateRawSync } from 'node:zlib';
import { ProviderError } from './rawBar';

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

/**
 * Extracts the first file of a .zip archive (store or deflate). NSE bhavcopy archives hold exactly
 * one CSV. Reads the central directory, so archives written with data descriptors also work.
 */
export function unzipFirst(bytes: Uint8Array): { name: string; data: Uint8Array } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65_535); i -= 1) {
    if (view.getUint32(i, true) === EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new ProviderError('malformed', 'not a zip archive');
  const centralStart = view.getUint32(eocd + 16, true);
  if (view.getUint32(centralStart, true) !== CENTRAL)
    throw new ProviderError('malformed', 'bad zip directory');
  const method = view.getUint16(centralStart + 10, true);
  const compressed = view.getUint32(centralStart + 20, true);
  const size = view.getUint32(centralStart + 24, true);
  const nameLength = view.getUint16(centralStart + 28, true);
  const localOffset = view.getUint32(centralStart + 42, true);
  const name = new TextDecoder().decode(
    bytes.subarray(centralStart + 46, centralStart + 46 + nameLength),
  );
  if (view.getUint32(localOffset, true) !== LOCAL)
    throw new ProviderError('malformed', 'bad zip entry');
  const dataStart =
    localOffset +
    30 +
    view.getUint16(localOffset + 26, true) +
    view.getUint16(localOffset + 28, true);
  const raw = bytes.subarray(dataStart, dataStart + compressed);
  if (method !== 0 && method !== 8)
    throw new ProviderError('unsupported', `zip method ${String(method)}`);
  const data = method === 0 ? raw : new Uint8Array(inflateRawSync(raw));
  if (data.length !== size) throw new ProviderError('malformed', 'zip size mismatch');
  return { name, data };
}
