/**
 * packages/simulator/src/core/engine/astroProvenanceSerializer.ts
 * Serializer and deserializer for astrological trade provenance.
 * Preserves exact planetary rationale, triad codes, and planned exit cusps.
 * Enforces strict modularity (< 150 LOC, functions < 60 LOC, complexity <= 10).
 */

import type { MasterTradeTicket } from './advisorySynthesizer';
import type { ActiveDashaState } from '../astro/types';

export interface ParsedAstroProvenance {
  triadCode: string;
  dashaHierarchy: string;
  signal: string;
  reason: string;
  targetPrice: number;
  stopPrice: number;
  plannedCuspExit: string;
  executionMode?: string | undefined;
  ingressStatus?: string | undefined;
  daysToCusp?: number | undefined;
  debtToEquity?: string | undefined;
  roce?: string | undefined;
  promoterPledge?: string | undefined;
  multipliers: {
    omega: number;
    phi: number;
    theta: number;
  };
}

export interface ExtraProvenanceContext {
  ingressStatus?: string | undefined;
  daysToIngress?: number | undefined;
  debtToEquity?: number | undefined;
  roce?: number | undefined;
  promoterPledge?: number | undefined;
}

export function serializeAstroProvenance(
  ticket: MasterTradeTicket,
  dashaState?: ActiveDashaState | null,
  extra?: ExtraProvenanceContext
): string {
  const p = ticket.provenance;
  const triad = p.triadCode || '[N/A]';
  const dasha = dashaState
    ? `${dashaState.mahadasha}-${dashaState.antardasha}-${dashaState.pratyantardasha}`
    : 'N/A';
  const target = ticket.exitRules?.profitTargetPrice ?? 0;
  const stop = ticket.exitRules?.stopLossPrice ?? 0;
  const cusp = ticket.exitRules?.calendarCuspExitDate || 'N/A';
  const omega = p.omegaTrader?.toFixed(2) ?? '1.00';
  const phi = p.phiFinancial?.toFixed(2) ?? '1.00';
  const theta = p.thetaAstro?.toFixed(2) ?? '1.00';
  const mode = ticket.executionMode || 'ALGORITHMIC';
  const ingress = extra?.ingressStatus || (ticket.executionMode === 'ANTICIPATORY_INGRESS' ? 'INGRESS_WARNING' : 'STANDARD');
  const dToCusp = extra?.daysToIngress ?? (dashaState ? Math.round(dashaState.pdRemainingDays) : 0);
  const de = extra?.debtToEquity !== undefined ? extra.debtToEquity.toFixed(2) : 'N/A';
  const roce = extra?.roce !== undefined ? extra.roce.toFixed(1) : 'N/A';
  const pledge = extra?.promoterPledge !== undefined ? extra.promoterPledge.toFixed(1) : 'N/A';

  return `TRIAD:${triad}|DASHA:${dasha}|SIG:${p.signal}|REASON:${p.reason}|TGT:${target}|STP:${stop}|CUSP:${cusp}|MULT:Ω${omega},Φ${phi},Θ${theta}|MODE:${mode}|INGRESS:${ingress}|CUSPDAYS:${dToCusp}|DE:${de}|ROCE:${roce}|PLG:${pledge}`;
}

export function parseAstroProvenance(raw: string): ParsedAstroProvenance {
  const parts = raw.split('|');
  const dict: Record<string, string> = {};

  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx > -1) {
      dict[part.slice(0, idx)] = part.slice(idx + 1);
    }
  }

  const multStr = dict['MULT'] || '';
  const omega = parseFloat(multStr.match(/Ω([\d.]+)/)?.[1] || '1');
  const phi = parseFloat(multStr.match(/Φ([\d.]+)/)?.[1] || '1');
  const theta = parseFloat(multStr.match(/Θ([\d.]+)/)?.[1] || '1');

  return {
    triadCode: dict['TRIAD'] || '[N/A]',
    dashaHierarchy: dict['DASHA'] || 'N/A',
    signal: dict['SIG'] || 'N/A',
    reason: dict['REASON'] || raw,
    targetPrice: parseFloat(dict['TGT'] || '0'),
    stopPrice: parseFloat(dict['STP'] || '0'),
    plannedCuspExit: dict['CUSP'] || 'N/A',
    executionMode: dict['MODE'] || 'ALGORITHMIC',
    ingressStatus: dict['INGRESS'] || 'STANDARD',
    daysToCusp: dict['CUSPDAYS'] ? parseInt(dict['CUSPDAYS'], 10) : undefined,
    debtToEquity: dict['DE'],
    roce: dict['ROCE'],
    promoterPledge: dict['PLG'],
    multipliers: { omega, phi, theta },
  };
}

export interface ParsedExitProvenance {
  exitReason: string;
  exitDate: string;
  exitPrice: number;
  exitTriad: string;
  exitDasha: string;
}

export function serializeExitProvenance(params: {
  exitReason: 'CUSP_DIRECTIVE' | 'TARGET_HIT' | 'STOP_HIT' | 'MANUAL_EXIT';
  exitDate: string;
  exitPrice: number;
  exitTriad?: string | undefined;
  exitDasha?: string | undefined;
}): string {
  return `EXIT_REASON:${params.exitReason}|EXIT_DATE:${params.exitDate}|EXIT_PX:${params.exitPrice}|EXIT_TRIAD:${params.exitTriad || 'N/A'}|EXIT_DASHA:${params.exitDasha || 'N/A'}`;
}

export function parseExitProvenance(raw: string): ParsedExitProvenance {
  const parts = raw.split('|');
  const dict: Record<string, string> = {};
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx > -1) {
      dict[part.slice(0, idx)] = part.slice(idx + 1);
    }
  }
  return {
    exitReason: dict['EXIT_REASON'] || 'MANUAL_EXIT',
    exitDate: dict['EXIT_DATE'] || '',
    exitPrice: parseFloat(dict['EXIT_PX'] || '0'),
    exitTriad: dict['EXIT_TRIAD'] || 'N/A',
    exitDasha: dict['EXIT_DASHA'] || 'N/A',
  };
}

