/**
 * packages/simulator/src/ui/components/copilot/CopilotChatCard.tsx
 * Zero-Hardware Cloud AI Copilot Chat Card with English & Malayalam support.
 * Decomposed into small sub-components (< 60 LOC each).
 */

import React, { useState } from 'react';
import { askCopilot, type CopilotResponse } from '../../../core/ai/copilotClient';

export interface CopilotChatCardProps {
  cockpitTelemetry: string;
}

const SUGGESTIONS = [
  'Explain active Dasha risk',
  'Audit balance sheet',
  'Kota fortress status',
  'മലയാളത്തിൽ വിശദീകരിക്കുക',
];

function SuggestionChips({ onSelect }: { onSelect: (s: string) => void }): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
      {SUGGESTIONS.map((s) => (
        <button
          key={s}
          onClick={() => onSelect(s)}
          style={{
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '10px',
            backgroundColor: '#1E2638',
            color: '#94A3B8',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

function MessageWindow({
  response,
  isLoading,
}: {
  response: CopilotResponse | null;
  isLoading: boolean;
}): React.ReactElement {
  return (
    <div
      style={{
        minHeight: '80px',
        maxHeight: '160px',
        overflowY: 'auto',
        padding: '10px',
        borderRadius: '6px',
        backgroundColor: '#111827',
        color: '#E2E8F0',
        fontSize: '12px',
        lineHeight: '1.5',
        whiteSpace: 'pre-wrap',
        fontFamily: 'sans-serif',
      }}
    >
      {isLoading ? (
        <span style={{ color: '#D4AF37', fontStyle: 'italic' }}>Analyzing live cockpit telemetry...</span>
      ) : response ? (
        response.answer
      ) : (
        <span style={{ color: '#64748B' }}>Ask questions about active Dasha, Kota defense, or balance-sheet PIT gates...</span>
      )}
    </div>
  );
}

function ChatInputBar({
  query,
  isLoading,
  onChange,
  onSend,
}: {
  query: string;
  isLoading: boolean;
  onChange: (val: string) => void;
  onSend: () => void;
}): React.ReactElement {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSend();
        }}
        placeholder="Ask Copilot (English or മലയാളം)..."
        style={{
          flex: 1,
          padding: '8px 12px',
          borderRadius: '6px',
          backgroundColor: '#111827',
          border: '1px solid #1E2638',
          color: '#FFFFFF',
          fontSize: '12px',
        }}
      />
      <button
        onClick={onSend}
        disabled={isLoading}
        style={{
          padding: '8px 16px',
          borderRadius: '6px',
          backgroundColor: '#D4AF37',
          color: '#0B0E14',
          fontWeight: 700,
          fontSize: '12px',
          border: 'none',
          cursor: isLoading ? 'default' : 'pointer',
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        {isLoading ? '...' : 'Send'}
      </button>
    </div>
  );
}

export const CopilotChatCard: React.FC<CopilotChatCardProps> = ({ cockpitTelemetry }) => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<CopilotResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;
    setIsLoading(true);
    try {
      const res = await askCopilot({ userQuery: text, cockpitTelemetry });
      setResponse(res);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        padding: '16px',
        background: '#0B0E14',
        border: '1px solid #1E2638',
        borderRadius: '8px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#D4AF37', fontSize: '13px', fontWeight: 700, letterSpacing: '0.05em' }}>
          CLOUD AI COPILOT (ZERO-HARDWARE FOOTPRINT)
        </span>
        {response && (
          <span style={{ fontSize: '10px', color: '#64748B', fontFamily: 'monospace' }}>
            {response.provider} ({response.latencyMs}ms)
          </span>
        )}
      </div>

      <SuggestionChips onSelect={(s) => { setQuery(s); void handleSend(s); }} />
      <MessageWindow response={response} isLoading={isLoading} />
      <ChatInputBar query={query} isLoading={isLoading} onChange={setQuery} onSend={() => void handleSend(query)} />
    </div>
  );
};
