/**
 * packages/simulator/src/core/ai/copilotClient.ts
 * Zero-Hardware Cloud AI Copilot Client (Google Gemini Flash Free Tier API).
 * 0 MB local GPU VRAM / 0 MB local RAM footprint with deterministic offline fallback.
 * Enforces strict modularity (< 300 LOC, functions < 60 LOC, complexity <= 10).
 */

import { COPILOT_SYSTEM_PROMPT, buildUserPromptWithContext } from './promptTemplates';

export interface CopilotRequest {
  userQuery: string;
  cockpitTelemetry: string;
  apiKey?: string | undefined;
}

export interface CopilotResponse {
  answer: string;
  provider: 'gemini-flash' | 'offline-heuristic';
  latencyMs: number;
}

function buildOfflineHeuristicResponse(query: string, telemetry: string): string {
  const isMalayalam = /[\u0D00-\u0D7F]/.test(query);

  if (isMalayalam) {
    return `[ഓഫ്‌ലൈൻ കോപൈലറ്റ് വിശകലനം]\nലഭ്യമായ കോക്ക്പിറ്റ് വിവരങ്ങൾ:\n${telemetry}\nനിങ്ങളുടെ അന്വേഷണം (${query}) വിശകലനം ചെയ്തു. ഫണ്ടമെന്റൽ റേറ്റിംഗും ദശാകാലവും അനുസരിച്ച് കൃത്യമായ റിസ്ക് മാനേജ്മെന്റ് പാലിക്കുക.`;
  }

  return `[Offline Copilot Synthesis]\nActive Telemetry:\n${telemetry}\nBased on the active Vimshottari period and PIT balance sheet health, ensure your position sizing strictly honors the Multiplicative Formula (Equity * RiskBudget * Omega * Phi * Theta).`;
}

async function fetchGeminiContent(apiKey: string, prompt: string): Promise<string | null> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: COPILOT_SYSTEM_PROMPT }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 1024 },
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

function resolveApiKey(reqKey?: string): string | undefined {
  if (reqKey) return reqKey;
  if (typeof process !== 'undefined') return process.env?.GEMINI_API_KEY;
  return undefined;
}

export async function askCopilot(req: CopilotRequest): Promise<CopilotResponse> {
  const startTime = Date.now();
  const apiKey = resolveApiKey(req.apiKey);

  if (apiKey) {
    try {
      const prompt = buildUserPromptWithContext(req.userQuery, req.cockpitTelemetry);
      const text = await fetchGeminiContent(apiKey, prompt);
      if (text) {
        return { answer: text, provider: 'gemini-flash', latencyMs: Date.now() - startTime };
      }
    } catch {
      // Fall through to offline heuristic
    }
  }

  return {
    answer: buildOfflineHeuristicResponse(req.userQuery, req.cockpitTelemetry),
    provider: 'offline-heuristic',
    latencyMs: Date.now() - startTime,
  };
}
