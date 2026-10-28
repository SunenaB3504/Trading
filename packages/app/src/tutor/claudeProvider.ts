import Anthropic from '@anthropic-ai/sdk';
import { ProviderError } from '@trading/tutor';
import type { ModelProvider, ProviderReply, ProviderRequest } from '@trading/tutor';

/** Statuses worth one more try: too many requests, a busy or failing server. Everything else (a bad key) will not pass. */
const RETRYABLE = new Set([408, 409, 429, 500, 502, 503, 504, 529]);

function asProviderError(e: unknown): ProviderError {
  if (e instanceof Anthropic.APIConnectionError) return new ProviderError('no connection', true);
  if (e instanceof Anthropic.APIError) return new ProviderError(`the API answered ${String(e.status)}`, e.status !== undefined && RETRYABLE.has(e.status));
  return new ProviderError('the request failed', false);
}

/**
 * The Claude provider (SSD v4.1 §7.3), through the official Anthropic SDK. The key comes from the secure store and is
 * used only here. The SDK's own retries are off: the tutor engine tries a passing failure once more itself. The system
 * prompt is marked for caching. No tools, no browsing and no stored conversation are used.
 */
export function claudeProvider(apiKey: string, fetchImpl?: typeof fetch): ModelProvider {
  // The app runs on a phone or in the person's own browser, with the person's own key, so the browser check is waived.
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, maxRetries: 0, ...(fetchImpl === undefined ? {} : { fetch: fetchImpl }) });
  return {
    id: 'claude',
    async complete(req: ProviderRequest): Promise<ProviderReply> {
      try {
        const res = await client.messages.create({
          model: req.model,
          max_tokens: req.maxTokens,
          system: [{ type: 'text', text: req.system, cache_control: { type: 'ephemeral' } }],
          messages: [{ role: 'user', content: req.user }],
          output_config: { effort: 'low' },
        });
        const text = res.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('\n');
        return { text, inputTokens: res.usage.input_tokens, outputTokens: res.usage.output_tokens, refused: res.stop_reason === 'refusal' };
      } catch (e) {
        throw asProviderError(e);
      }
    },
  };
}
