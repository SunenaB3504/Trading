import { z } from 'zod';

export const healthSchema = z.object({
  status: z.literal('ok'),
  time: z.number(),
  providers: z.array(
    z.object({
      provider: z.string(),
      lastFetchAt: z.number().nullable(),
      lastStatus: z.number().nullable(),
      ok: z.boolean(),
    }),
  ),
  instruments: z.number(),
  snapshots: z.number(),
});

export const instrumentsSchema = z.array(
  z.object({
    instrumentId: z.string(),
    symbol: z.string(),
    isin: z.string(),
    status: z.string(),
    firstSeen: z.string().nullable(),
    lastSeen: z.string().nullable(),
  }),
);

export type Health = z.infer<typeof healthSchema>;
export type InstrumentRow = z.infer<typeof instrumentsSchema>[number];

/** Why a call failed, so the screen can say "offline" instead of showing an error code. */
export type ClientError =
  | { kind: 'offline'; message: string }
  | { kind: 'http'; status: number; message: string }
  | { kind: 'shape'; message: string };

export type Result<T> = { ok: true; data: T } | { ok: false; error: ClientError };

export type FetchLike = (
  url: string,
  init?: { method?: string; body?: string },
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

/** Typed client for the local data service (SSD §9.2). It is read-only apart from creating snapshots. */
export class DataServiceClient {
  constructor(
    private readonly fetchFn: FetchLike,
    private readonly baseUrl: string,
  ) {}

  health(): Promise<Result<Health>> {
    return this.get('/health', healthSchema);
  }

  instruments(): Promise<Result<InstrumentRow[]>> {
    return this.get('/instruments', instrumentsSchema);
  }

  private async get<T>(path: string, schema: z.ZodType<T>): Promise<Result<T>> {
    let response;
    try {
      response = await this.fetchFn(`${this.baseUrl}${path}`);
    } catch (e) {
      return {
        ok: false,
        error: { kind: 'offline', message: e instanceof Error ? e.message : 'unreachable' },
      };
    }
    if (!response.ok)
      return {
        ok: false,
        error: { kind: 'http', status: response.status, message: `HTTP ${response.status}` },
      };
    try {
      const parsed = schema.safeParse(await response.json());
      return parsed.success
        ? { ok: true, data: parsed.data }
        : { ok: false, error: { kind: 'shape', message: parsed.error.message } };
    } catch (e) {
      return {
        ok: false,
        error: { kind: 'shape', message: e instanceof Error ? e.message : 'bad json' },
      };
    }
  }
}
