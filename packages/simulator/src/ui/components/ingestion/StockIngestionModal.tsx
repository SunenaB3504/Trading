/**
 * packages/simulator/src/ui/components/ingestion/StockIngestionModal.tsx
 * Slide-over / modal dialog for importing missing large-caps or newly listed IPOs.
 * Enforces strict modularity (< 350 LOC, functions < 60 LOC).
 */

import React, { useState } from 'react';
import { useStockStore } from '../../../state/stockStore';
import {
  parseRawCsvText,
  processAndCompoundDailyBars,
  buildNatalPreview,
  type IngestionPreviewResult,
} from '../../../core/data/ingestion/stockIngestionEngine';

interface StockIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSymbol?: string;
}

export const StockIngestionModal: React.FC<StockIngestionModalProps> = ({
  isOpen,
  onClose,
  defaultSymbol = 'RELIANCE',
}) => {
  const [symbolInput, setSymbolInput] = useState(defaultSymbol);
  const [listingDate, setListingDate] = useState('1995-11-29');
  const [listingTime, setListingTime] = useState('10:00:00');
  const [csvContent, setCsvContent] = useState('');
  const [preview, setPreview] = useState<IngestionPreviewResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const { registerCustomStock } = useStockStore();

  if (!isOpen) return null;

  const handleResolveNatal = () => {
    try {
      setErrorMsg(null);
      const res = buildNatalPreview(symbolInput, listingDate, listingTime);
      setPreview(res);
      setListingDate(res.listingDate);
      setListingTime(res.listingTime);
      setStatusMsg(`Resolved natal metadata for ${res.symbol}`);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to compute natal profile');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
      setStatusMsg(`Loaded ${file.name} (${Math.round(text.length / 1024)} KB)`);
    };
    reader.readAsText(file);
  };

  const handleExecuteIngestion = () => {
    try {
      setErrorMsg(null);
      if (!csvContent.trim()) {
        throw new Error('Please upload or paste CSV data with Date and Close columns');
      }

      const rawBars = parseRawCsvText(csvContent);
      const { bars, splitCount } = processAndCompoundDailyBars(symbolInput.trim().toUpperCase(), rawBars);

      if (bars.length === 0) {
        throw new Error('No valid trading bars parsed from input');
      }

      registerCustomStock(symbolInput.trim().toUpperCase(), bars, {
        listing_date: listingDate,
        listing_time: listingTime,
      });

      setStatusMsg(`Successfully ingested ${bars.length} bars (${splitCount} split adjustments)!`);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Ingestion failed');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          width: '680px',
          maxHeight: '90vh',
          backgroundColor: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
          color: '#E2E8F0',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, color: '#F8FAFC', fontSize: '18px', fontWeight: 800 }}>
              Import Stock & Horoscopic Calibration
            </h2>
            <p style={{ margin: '4px 0 0 0', color: '#94A3B8', fontSize: '12px' }}>
              Add unpartitioned equities or newly listed IPOs to the local workstation cache.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94A3B8',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#450A0A',
              border: '1px solid #DC2626',
              borderRadius: '6px',
              color: '#FCA5A5',
              fontSize: '12px',
            }}
          >
            {errorMsg}
          </div>
        )}

        {statusMsg && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#064E3B',
              border: '1px solid #059669',
              borderRadius: '6px',
              color: '#6EE7B7',
              fontSize: '12px',
            }}
          >
            {statusMsg}
          </div>
        )}

        {/* Section 1: Symbol & Natal Setup */}
        <div
          style={{
            backgroundColor: '#1E293B',
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8' }}>
            1. Stock Identification & Natal Horoscope Calibration
          </span>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '8px' }}>
            <input
              type="text"
              placeholder="Symbol (e.g. RELIANCE)"
              value={symbolInput}
              onChange={(e) => setSymbolInput(e.target.value.toUpperCase())}
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                color: '#FFF',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '13px',
              }}
            />
            <input
              type="date"
              value={listingDate}
              onChange={(e) => setListingDate(e.target.value)}
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                color: '#FFF',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <input
              type="text"
              placeholder="10:00:00"
              value={listingTime}
              onChange={(e) => setListingTime(e.target.value)}
              style={{
                backgroundColor: '#0F172A',
                border: '1px solid #334155',
                color: '#FFF',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
            <button
              onClick={handleResolveNatal}
              style={{
                backgroundColor: '#0284C7',
                border: 'none',
                color: '#FFF',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
              }}
            >
              Resolve Natal
            </button>
          </div>

          {preview && (
            <div
              style={{
                fontSize: '11px',
                color: '#CBD5E1',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '6px',
                marginTop: '6px',
              }}
            >
              <div>Company: <strong>{preview.companyName}</strong></div>
              <div>Janma Nakshatra: <strong>{preview.janmaNakshatra}</strong></div>
              <div>Birth Mahadasha: <strong>{preview.birthMdLord.toUpperCase()}</strong></div>
              <div>Balance: <strong>{preview.balanceYears} Years (Calibrated Start)</strong></div>
            </div>
          )}
        </div>

        {/* Section 2: CSV Bar Input */}
        <div
          style={{
            backgroundColor: '#1E293B',
            borderRadius: '8px',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#38BDF8' }}>
            2. Historical Market Data Ingestion
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label
              style={{
                backgroundColor: '#334155',
                color: '#F8FAFC',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Upload CSV File
              <input type="file" accept=".csv" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            <span style={{ fontSize: '11px', color: '#94A3B8' }}>
              Or paste historical CSV lines (Date, Open, High, Low, Close, Volume) below:
            </span>
          </div>

          <textarea
            rows={5}
            placeholder="Date,Open,High,Low,Close,Volume&#10;2024-01-01,1200,1210,1190,1205,100000"
            value={csvContent}
            onChange={(e) => setCsvContent(e.target.value)}
            style={{
              backgroundColor: '#0F172A',
              border: '1px solid #334155',
              color: '#CBD5E1',
              fontFamily: 'monospace',
              fontSize: '11px',
              padding: '8px',
              borderRadius: '6px',
              resize: 'vertical',
            }}
          />
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #475569',
              color: '#CBD5E1',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '13px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteIngestion}
            style={{
              backgroundColor: '#10B981',
              border: 'none',
              color: '#FFF',
              padding: '8px 20px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '13px',
            }}
          >
            Ingest & Launch Terminal
          </button>
        </div>
      </div>
    </div>
  );
};

