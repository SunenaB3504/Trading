import { inflateRawSync } from 'node:zlib';
import { ProviderError } from './rawBar';

const EOCD = 0x06054b50;
const CENTRAL = 0x02014b50;
const LOCAL = 0x04034b50;

function findEndRecord(view: DataView, length: number): number {
  for (let i = length - 22; i >= Math.max(0, length - 22 - 65_535); i -= 1) {
    if (view.getUint32(i, true) === EOCD) return i;
  }
  throw new ProviderError('malformed', 'not a zip archive');
}

interface Entry {
  name: string;
  data: Uint8Array;
}

/** Reads the entry whose central-directory record starts at `at`; returns it and where the next record starts. */
function readEntry(bytes: Uint8Array, view: DataView, at: number): { entry: Entry; next: number } {
  if (view.getUint32(at, true) !== CENTRAL)
    throw new ProviderError('malformed', 'bad zip directory');
  const method = view.getUint16(at + 10, true);
  const compressed = view.getUint32(at + 20, true);
  const size = view.getUint32(at + 24, true);
  const nameLength = view.getUint16(at + 28, true);
  const extraLength = view.getUint16(at + 30, true);
  const commentLength = view.getUint16(at + 32, true);
  const localOffset = view.getUint32(at + 42, true);
  const name = new TextDecoder().decode(bytes.subarray(at + 46, at + 46 + nameLength));
  if (view.getUint32(localOffset, true) !== LOCAL)
    throw new ProviderError('malformed', 'bad zip entry');
  const dataStart =
    localOffset +
    30 +
    view.getUint16(localOffset + 26, true) +
    view.getUint16(localOffset + 28, true);
  if (method !== 0 && method !== 8)
    throw new ProviderError('unsupported', `zip method ${String(method)}`);
  const raw = bytes.subarray(dataStart, dataStart + compressed);
  const data = method === 0 ? raw : new Uint8Array(inflateRawSync(raw));
  if (data.length !== size) throw new ProviderError('malformed', 'zip size mismatch');
  return { entry: { name, data }, next: at + 46 + nameLength + extraLength + commentLength };
}

/**
 * Extracts every file of a .zip archive (store or deflate). Reads the central directory, so archives
 * written with data descriptors also work. NSE's daily PR archive holds about fifteen files.
 */
export function unzipAll(bytes: Uint8Array): Entry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndRecord(view, bytes.length);
  const count = view.getUint16(eocd + 10, true);
  const out: Entry[] = [];
  let at = view.getUint32(eocd + 16, true);
  for (let i = 0; i < count; i += 1) {
    const { entry, next } = readEntry(bytes, view, at);
    out.push(entry);
    at = next;
  }
  return out;
}

/** The first file of an archive. NSE bhavcopy archives hold exactly one CSV. */
export function unzipFirst(bytes: Uint8Array): Entry {
  const first = unzipAll(bytes)[0];
  if (first === undefined) throw new ProviderError('malformed', 'empty zip archive');
  return first;
}
