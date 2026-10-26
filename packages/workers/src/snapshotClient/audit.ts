/**
 * The only way the snapshot client touches the network (SSD §7.6, FR-P2): a GET to one allow-listed origin, a path
 * that is a snapshot file name, no query string, no body, and only a fixed Accept header. Anything else throws before
 * a request is made. Every call is recorded so a test (and the settings screen) can show what was sent.
 */
export type RawFetch = (
  url: string,
  init: { method: 'GET'; headers: Record<string, string>; redirect: 'error' },
) => Promise<{ status: number; text(): Promise<string> }>;

export interface SentRequest {
  url: string;
  method: 'GET';
}

export class NetworkPolicyError extends Error {}

export const SNAPSHOT_PATH = /^\/base_tickets_\d{8}\.json$/;

export interface AuditedFetch {
  get(url: string): Promise<{ status: number; text: string }>;
  readonly sent: readonly SentRequest[];
}

export function auditedFetch(origin: string, raw: RawFetch): AuditedFetch {
  const allowed = new URL(origin);
  if (
    allowed.protocol !== 'https:' &&
    allowed.hostname !== '127.0.0.1' &&
    allowed.hostname !== 'localhost'
  )
    throw new NetworkPolicyError('the snapshot origin must be https (or a local test server)');
  const sent: SentRequest[] = [];
  return {
    sent,
    async get(url) {
      const u = new URL(url);
      if (u.origin !== allowed.origin)
        throw new NetworkPolicyError(`not the snapshot origin: ${u.origin}`);
      if (!SNAPSHOT_PATH.test(u.pathname))
        throw new NetworkPolicyError(`not a snapshot file name: ${u.pathname}`);
      if (u.search !== '' || u.hash !== '' || u.username !== '' || u.password !== '')
        throw new NetworkPolicyError('the request URL may carry no query, fragment or credentials');
      sent.push({ url: u.toString(), method: 'GET' });
      const res = await raw(u.toString(), {
        method: 'GET',
        headers: { Accept: 'application/json' },
        redirect: 'error',
      });
      return { status: res.status, text: await res.text() };
    },
  };
}
