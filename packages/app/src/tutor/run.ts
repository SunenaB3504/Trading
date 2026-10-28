import { GLOSSARY, LESSONS, SAMPLES } from '@trading/content';
import { askTutor } from '@trading/tutor';
import type { AskDeps, ModelProvider, TutorAnswer, TutorContext } from '@trading/tutor';
import type { SecureStore } from '../secure/secureStore';
import type { DeviceSettings } from '../settings/settings';
import type { KeyValueStore } from '../store/kv';
import { claudeProvider } from './claudeProvider';
import { featureOn, keepAnswer, loadKey, loadUsage, modelFor, saveUsage } from './aiStore';

/** What a tutor call needs from the device. `makeProvider` is replaced by a fake in tests. */
export interface TutorEnv {
  device: KeyValueStore;
  profile: KeyValueStore;
  secure: SecureStore;
  settings: DeviceSettings;
  /** Names to strip from journal text before it is sent: the open profile's name. */
  names: string[];
  now: () => number;
  makeProvider?: (key: string) => ModelProvider;
}

/** Capitalised words the verifier accepts: the glossary and every acronym the lessons use. */
export const KNOWN_TERMS: ReadonlySet<string> = new Set([
  ...GLOSSARY.flatMap((g) => g.term.toUpperCase().split(/[^A-Z0-9&]+/)),
  ...LESSONS.flatMap((l) => l.blocks.flatMap((b) => JSON.stringify(b).match(/\b[A-Z][A-Z0-9&]{2,11}\b/g) ?? [])),
]);

/**
 * One tutor answer for a feature: reads the mode, key, model and usage, asks (see `askTutor`), then saves the new usage
 * total and keeps a live answer. Nothing it does can change an order or an account.
 */
export async function runAsk(env: TutorEnv, ctx: TutorContext): Promise<TutorAnswer> {
  const now = env.now();
  const key = await loadKey(env.secure);
  const provider = key === null ? null : (env.makeProvider ?? claudeProvider)(key);
  const usage = await loadUsage(env.device, now);
  const deps: AskDeps = {
    mode: env.settings.aiMode,
    provider,
    model: modelFor(env.settings, ctx.feature),
    featureOn: featureOn(env.settings, ctx.feature),
    usage,
    limitRupees: env.settings.aiMonthlyLimitRupees,
    sample: SAMPLES[ctx.feature] ?? null,
    knownTerms: KNOWN_TERMS,
  };
  const answer = await askTutor(ctx, deps);
  if (answer.usage !== usage) await saveUsage(env.device, answer.usage, now);
  await keepAnswer(env.profile, answer, now);
  return answer;
}

/** "Test key": one tiny call with the saved key, to say whether it works. Counts against the limit like any call. */
export async function testKey(env: TutorEnv): Promise<{ ok: true } | { ok: false; message: string }> {
  const key = await loadKey(env.secure);
  if (key === null) return { ok: false, message: 'No key is saved.' };
  const provider = (env.makeProvider ?? claudeProvider)(key);
  try {
    const r = await provider.complete({ system: 'Reply with the single word ready.', user: 'ready?', model: modelFor(env.settings, 'ask_screen'), maxTokens: 50 });
    if (r.refused === true) return { ok: false, message: 'The model declined the test message.' };
    return { ok: true };
  } catch {
    return { ok: false, message: 'The key was refused or the API could not be reached.' };
  }
}
