import type { HttpResponse } from '../http/fetchPolicy';

/**
 * The OpenTimestamps adapter (D16, WP-4.5, WP-5.1). It sends a SHA-256 digest, and only the digest, to public
 * OpenTimestamps calendar servers and keeps the proof they return. The calendar answers at once with a pending
 * timestamp promising to commit the digest to the Bitcoin chain within hours; the proof can later be upgraded
 * to a full Bitcoin attestation with any OpenTimestamps client. A digest is stamped by at least one calendar
 * or the submission fails: a missing or wrong answer never counts as anchored.
 */

/** Anything that can POST bytes to a URL. The real one wraps `fetch`; tests inject a fake. */
export interface HttpPoster {
  post(url: string, body: Uint8Array, headers?: Record<string, string>): Promise<HttpResponse>;
}

export const DEFAULT_CALENDARS: readonly string[] = [
  'https://alice.btc.calendar.opentimestamps.org',
  'https://bob.btc.calendar.opentimestamps.org',
  'https://finney.calendar.eternitywall.com',
];

export interface OtsProof {
  provider: string;
  /** The digest that was stamped (hex). */
  digest: string;
  /** When a calendar accepted it, UTC ms. */
  submittedAt: number;
  /** An OpenTimestamps `.ots` file in hex: pending until the Bitcoin attestation is added. */
  proof: string;
}

const HEADER_MAGIC = Uint8Array.from([
  0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00,
  0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
]);
const VERSION = 0x01;
const OP_SHA256 = 0x08;

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from((hex.match(/../g) ?? []).map((h) => parseInt(h, 16)));
const bytesToHex = (b: Uint8Array): string =>
  [...b].map((x) => x.toString(16).padStart(2, '0')).join('');

/** The standard `.ots` container: header, version, the hash operation and digest, then the calendar's timestamp. */
export function otsFile(digestHex: string, calendarReply: Uint8Array): Uint8Array {
  const digest = hexToBytes(digestHex);
  const out = new Uint8Array(HEADER_MAGIC.length + 2 + digest.length + calendarReply.length);
  out.set(HEADER_MAGIC, 0);
  out[HEADER_MAGIC.length] = VERSION;
  out[HEADER_MAGIC.length + 1] = OP_SHA256;
  out.set(digest, HEADER_MAGIC.length + 2);
  out.set(calendarReply, HEADER_MAGIC.length + 2 + digest.length);
  return out;
}

export interface OtsOptions {
  poster: HttpPoster;
  now: () => number;
  calendars?: readonly string[];
}

export class OpenTimestampsAnchorer {
  private readonly calendars: readonly string[];

  constructor(private readonly o: OtsOptions) {
    this.calendars = o.calendars ?? DEFAULT_CALENDARS;
    if (this.calendars.length === 0) throw new RangeError('at least one calendar is needed');
  }

  /** Stamps a 64-hex-digit SHA-256 digest. Tries each calendar in order and uses the first good answer. */
  async submit(digestHex: string): Promise<OtsProof> {
    if (!/^[0-9a-f]{64}$/.test(digestHex))
      throw new TypeError('a SHA-256 digest is 64 lowercase hex digits');
    const failures: string[] = [];
    for (const calendar of this.calendars) {
      try {
        const res = await this.o.poster.post(`${calendar}/digest`, hexToBytes(digestHex), {
          Accept: 'application/vnd.opentimestamps.v1',
          'Content-Type': 'application/x-www-form-urlencoded',
        });
        if (res.status === 200 && res.body.length > 0)
          return {
            provider: `opentimestamps:${calendar}`,
            digest: digestHex,
            submittedAt: this.o.now(),
            proof: bytesToHex(otsFile(digestHex, res.body)),
          };
        failures.push(
          `${calendar}: HTTP ${String(res.status)}${res.body.length === 0 ? ' with no proof' : ''}`,
        );
      } catch (e) {
        failures.push(`${calendar}: ${e instanceof Error ? e.message : 'failed'}`);
      }
    }
    throw new Error(`no OpenTimestamps calendar stamped the digest (${failures.join('; ')})`);
  }
}

/** `HttpPoster` over Node's global `fetch`, with a timeout. Not used by tests. */
export function nodeHttpPoster(timeoutMs = 20_000): HttpPoster {
  return {
    async post(url, body, headers = {}): Promise<HttpResponse> {
      const controller = new AbortController();
      const timer = setTimeout(() => {
        controller.abort();
      }, timeoutMs);
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: body as unknown as ArrayBuffer,
          signal: controller.signal,
        });
        return { status: res.status, body: new Uint8Array(await res.arrayBuffer()), headers: {} };
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
