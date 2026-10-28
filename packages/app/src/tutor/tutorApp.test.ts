import { sha256Hex } from '@trading/core';
import { ProviderError, askScreen, learningGuide } from '@trading/tutor';
import type { ModelProvider, ProviderRequest } from '@trading/tutor';
import { describe, expect, it } from 'vitest';
import { MemorySecureStore } from '../secure/secureStore';
import { DEFAULT_DEVICE_SETTINGS } from '../settings/settings';
import type { DeviceSettings } from '../settings/settings';
import { MemoryKv } from '../store/kv';
import { PaperSession } from '../trading/paperSession';
import { KEY_NAME, ANSWERS_KEY, USAGE_KEY, keyLooksRight, loadAnswers, loadKey, loadUsage, saveKey } from './aiStore';
import { runAsk, testKey } from './run';
import type { TutorEnv } from './run';

const NOW = 1_760_000_000_000;
const KEY = 'sk-ant-test-0123456789abcdefghij';

const ok = (text: string): ModelProvider => ({
  id: 'fake',
  complete: (r: ProviderRequest) => Promise.resolve({ text, inputTokens: Math.ceil((r.system.length + r.user.length) / 3), outputTokens: 40, refused: false }),
});

function env(over: Partial<DeviceSettings> = {}, provider?: ModelProvider): TutorEnv {
  const e: TutorEnv = {
    device: new MemoryKv(),
    profile: new MemoryKv(),
    secure: new MemorySecureStore(),
    settings: { ...DEFAULT_DEVICE_SETTINGS, ...over },
    names: ['Asha'],
    now: () => NOW,
  };
  return provider === undefined ? e : { ...e, makeProvider: () => provider };
}

const guide = () => learningGuide({ done: 2, total: 15, nextLessonId: 'order-types', quizzes: [] });

describe('key and usage storage', () => {
  it('keeps the key in the secure store only', async () => {
    const e = env();
    await saveKey(e.secure, `  ${KEY}  `);
    expect(await loadKey(e.secure)).toBe(KEY);
    expect(await e.device.keys()).toEqual([]);
    expect(await e.profile.keys()).toEqual([]);
    expect(keyLooksRight(KEY)).toBe(true);
    expect(keyLooksRight('short')).toBe(false);
    expect(keyLooksRight('has space in it 12345678901234')).toBe(false);
    expect(KEY_NAME).toMatch(/^[A-Za-z0-9._-]+$/);
  });

  it('starts a new month at zero', async () => {
    const e = env();
    await e.device.set(USAGE_KEY, JSON.stringify({ savedAt: 1, value: { month: '2020-01', spentPaise: 5000, calls: 9 } }));
    expect(await loadUsage(e.device, NOW)).toMatchObject({ spentPaise: 0, calls: 0 });
  });
});

describe('runAsk', () => {
  it('Preview answers from the bundled sample with no key, no provider and no spend', async () => {
    const e = env({ aiMode: 'preview' });
    const a = await runAsk(e, guide());
    expect(a.source).toBe('preview');
    expect(a.text.length).toBeGreaterThan(0);
    expect(await e.device.keys()).toEqual([]);
    expect(await e.profile.keys()).toEqual([]);
  });

  it('Off gives the built-in coach answer', async () => {
    const a = await runAsk(env({ aiMode: 'off' }), guide());
    expect(a.source).toBe('coach');
    expect(a.reason).toBe('mode_off');
  });

  it('declines a request for a stock tip even when the AI is on', async () => {
    const e = env({ aiMode: 'on' }, ok('You should buy RELIANCE now.'));
    await saveKey(e.secure, KEY);
    const a = await runAsk(e, askScreen({ screen: 'Trade', screenText: 't', lessonId: null, facts: [], symbols: [], question: 'give me a stock tip' }));
    expect(a.source).toBe('declined');
    expect(await e.device.keys()).toEqual([]);
  });

  it('On with no key shows the coach answer', async () => {
    const a = await runAsk(env({ aiMode: 'on' }, ok('x')), guide());
    expect(a).toMatchObject({ source: 'coach', reason: 'no_key' });
  });

  it('a bad key (refused, not retryable) shows the coach answer and is tried once', async () => {
    let calls = 0;
    const bad: ModelProvider = { id: 'fake', complete: () => { calls += 1; return Promise.reject(new ProviderError('the API answered 401', false)); } };
    const e = env({ aiMode: 'on' }, bad);
    await saveKey(e.secure, KEY);
    const a = await runAsk(e, guide());
    expect(a).toMatchObject({ source: 'coach', reason: 'provider_error' });
    expect(calls).toBe(1);
    expect((await testKey(e)).ok).toBe(false);
  });

  it('no network (retryable) is tried twice, then shows the coach answer', async () => {
    let calls = 0;
    const down: ModelProvider = { id: 'fake', complete: () => { calls += 1; return Promise.reject(new ProviderError('no connection', true)); } };
    const e = env({ aiMode: 'on' }, down);
    await saveKey(e.secure, KEY);
    const a = await runAsk(e, guide());
    expect(a.source).toBe('coach');
    expect(calls).toBe(2);
  });

  it('a live answer is kept with its provenance and its spend is saved', async () => {
    const e = env({ aiMode: 'on' }, ok('You have done {{fact:lessons_done}}. Read the lesson on order types next.'));
    await saveKey(e.secure, KEY);
    const a = await runAsk(e, guide());
    expect(a.source).toBe('ai');
    expect(a.text).toContain('2 of 15');
    expect(a.provenance).toMatchObject({ model: 'claude-haiku-5-5' });
    const kept = await loadAnswers(e.profile);
    expect(kept).toHaveLength(1);
    expect(kept[0]?.provenance?.contextHash).toMatch(/^[0-9a-f]{64}$/);
    expect((await loadUsage(e.device, NOW)).calls).toBe(1);
    expect(await e.profile.keys()).toEqual([ANSWERS_KEY]);
  });

  it('stops at the monthly limit', async () => {
    const e = env({ aiMode: 'on', aiMonthlyLimitRupees: 0 }, ok('Read the lesson.'));
    await saveKey(e.secure, KEY);
    const a = await runAsk(e, guide());
    expect(a).toMatchObject({ source: 'coach', reason: 'limit_reached' });
  });

  it('an answer that gives advice is not shown', async () => {
    const e = env({ aiMode: 'on' }, ok('You should buy TCS today, it will go up.'));
    await saveKey(e.secure, KEY);
    const a = await runAsk(e, guide());
    expect(a).toMatchObject({ source: 'coach', reason: 'verifier_failed' });
  });
});

describe('the tutor never touches the account', () => {
  const order = { instrumentId: 'AAA', side: 'buy' as const, type: 'market' as const, quantity: '10', limit: '', stop: '', date: '2026-03-02' };

  async function accountHash(on: boolean): Promise<string> {
    const e = env({ aiMode: on ? 'on' : 'off' }, ok('Read the lesson on order types next.'));
    await saveKey(e.secure, KEY);
    const s = await PaperSession.open(e.profile, e.now);
    if (on) await runAsk(e, guide());
    await s.place(order);
    if (on) await runAsk(e, guide());
    const keys = (await e.profile.keys()).filter((k) => !k.startsWith('ai/'));
    const rows = await Promise.all(keys.map(async (k) => [k, JSON.parse((await e.profile.get(k)) ?? 'null')] as const));
    const view = await (await PaperSession.open(e.profile, e.now)).view();
    return sha256Hex(JSON.stringify({ rows, view }));
  }

  it('AI off and AI on give identical accounts', async () => {
    expect(await accountHash(true)).toBe(await accountHash(false));
  });
});
