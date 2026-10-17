import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProviderName } from '../providers/rawBar';

/** What was fetched, from where, when, and a checksum of exactly what came back (FR-D2). */
export interface RawRecord {
  provider: ProviderName;
  /** Kind of endpoint, for example `bhavcopy-udiff` or `yahoo-chart`. */
  urlClass: string;
  url: string;
  params: Record<string, string>;
  /** UTC milliseconds. */
  fetchedAt: number;
  status: number;
  bytes: number;
  /** Lower-case hex SHA-256 of the response body. */
  checksum: string;
}

export type RawMeta = Omit<RawRecord, 'checksum' | 'bytes'>;

export interface RawStore {
  /** Stores a body (de-duplicated by checksum) and records the fetch. */
  put(meta: RawMeta, body: Uint8Array): Promise<RawRecord>;
  get(checksum: string): Promise<Uint8Array | null>;
  list(): Promise<RawRecord[]>;
}

export const sha256 = (body: Uint8Array): string => createHash('sha256').update(body).digest('hex');

function recordFor(meta: RawMeta, body: Uint8Array): RawRecord {
  return { ...meta, bytes: body.length, checksum: sha256(body) };
}

export class MemoryRawStore implements RawStore {
  private readonly bodies = new Map<string, Uint8Array>();
  private readonly records: RawRecord[] = [];

  put(meta: RawMeta, body: Uint8Array): Promise<RawRecord> {
    const record = recordFor(meta, body);
    this.bodies.set(record.checksum, Uint8Array.from(body));
    this.records.push(record);
    return Promise.resolve(record);
  }

  get(checksum: string): Promise<Uint8Array | null> {
    return Promise.resolve(this.bodies.get(checksum) ?? null);
  }

  list(): Promise<RawRecord[]> {
    return Promise.resolve([...this.records]);
  }
}

/**
 * Raw responses on disk: `<dir>/<provider>/<checksum>.bin` (one file per distinct body) and an
 * append-only `<dir>/index.jsonl` with one line per fetch. Nothing is ever overwritten.
 */
export class FileRawStore implements RawStore {
  constructor(private readonly dir: string) {
    mkdirSync(dir, { recursive: true });
  }

  put(meta: RawMeta, body: Uint8Array): Promise<RawRecord> {
    const record = recordFor(meta, body);
    const folder = join(this.dir, meta.provider);
    mkdirSync(folder, { recursive: true });
    const file = join(folder, `${record.checksum}.bin`);
    if (!existsSync(file)) writeFileSync(file, body);
    appendFileSync(join(this.dir, 'index.jsonl'), `${JSON.stringify(record)}\n`);
    return Promise.resolve(record);
  }

  get(checksum: string): Promise<Uint8Array | null> {
    for (const provider of ['nse-bhavcopy', 'yahoo', 'csv']) {
      const file = join(this.dir, provider, `${checksum}.bin`);
      if (existsSync(file)) return Promise.resolve(new Uint8Array(readFileSync(file)));
    }
    return Promise.resolve(null);
  }

  list(): Promise<RawRecord[]> {
    const index = join(this.dir, 'index.jsonl');
    if (!existsSync(index)) return Promise.resolve([]);
    const lines = readFileSync(index, 'utf8')
      .split('\n')
      .filter((l) => l !== '');
    return Promise.resolve(lines.map((l) => JSON.parse(l) as RawRecord));
  }
}
