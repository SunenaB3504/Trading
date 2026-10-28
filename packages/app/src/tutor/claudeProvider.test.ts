import { describe, expect, it } from 'vitest';
import { claudeProvider } from './claudeProvider';

const REQ = { system: 's', user: 'u', model: 'claude-haiku-5-5', maxTokens: 50 };
const reply = (status: number, body: unknown): typeof fetch => () =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

describe('claudeProvider', () => {
  it('reads text, token counts and a refusal', async () => {
    const body = { id: 'm', type: 'message', role: 'assistant', model: 'x', content: [{ type: 'text', text: 'hello' }], stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 7, output_tokens: 3 } };
    expect(await claudeProvider('k', reply(200, body)).complete(REQ)).toEqual({ text: 'hello', inputTokens: 7, outputTokens: 3, refused: false });
    const refused = await claudeProvider('k', reply(200, { ...body, stop_reason: 'refusal' })).complete(REQ);
    expect(refused.refused).toBe(true);
  });

  it('a bad key is not retryable, a busy server is', async () => {
    const err = { type: 'error', error: { type: 'x', message: 'm' } };
    await expect(claudeProvider('k', reply(401, err)).complete(REQ)).rejects.toMatchObject({ retryable: false });
    await expect(claudeProvider('k', reply(429, err)).complete(REQ)).rejects.toMatchObject({ retryable: true });
    await expect(claudeProvider('k', reply(529, err)).complete(REQ)).rejects.toMatchObject({ retryable: true });
  });

  it('no network is retryable', async () => {
    const down: typeof fetch = () => Promise.reject(new TypeError('failed'));
    await expect(claudeProvider('k', down).complete(REQ)).rejects.toMatchObject({ retryable: true });
  });
});
