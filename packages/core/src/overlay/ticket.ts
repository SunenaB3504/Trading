import { canonicalJson } from '../hash/canonicalJson';
import { sha256Hex } from '../hash/sha256';
import { mulDiv, subPaise, addPaise } from '../money';
import type { Candidate, OverlayResult, StateCode } from './contract';

/**
 * The experimental rule-arm ticket (SSD §5.9, WP-5.7). A ticket is what a frozen arm produced for one
 * candidate, shown read-only and always labelled "Experimental arm output" with its hypothesis ID and evidence
 * tag. It never says buy, sell, strong or recommended: the arm action is one of ENTER, ENTER-LIMIT, HOLD, EXIT
 * and BLOCK. Every number comes from rules registered and frozen per hypothesis; none is a forecast.
 * Multiples are whole thousandths (1500 = 1.5 x ATR14), so all money stays in integer paise.
 */

export type ArmAction = 'ENTER' | 'ENTER-LIMIT' | 'HOLD' | 'EXIT' | 'BLOCK';

export interface TicketRules {
  version: string;
  /** ENTER-LIMIT instead of ENTER: limit = previous close - limitMilli x ATR14 (fills per FR-T11). */
  useLimitEntry: boolean;
  limitMilli: number;
  target1Milli: number;
  target2Milli: number;
  stopMilli: number;
  /** Trailing stop = highest close since entry - trailingMilli x ATR14 (D14). */
  trailingMilli: number;
  /** Exit after this many sessions without reaching target 1. */
  timeStopSessions: number;
  /** Registered holding horizon, in sessions. */
  horizonSessions: number;
  /** Position size per state, in basis points of the book (500 = 5%), within the FR-T8 caps. */
  sizingBps: Readonly<Record<'GREEN' | 'YELLOW' | 'RED', number>>;
}

export const TICKET_RULES_PROPOSED: TicketRules = {
  version: 'ticket-proposed-1',
  useLimitEntry: false,
  limitMilli: 250,
  target1Milli: 1500,
  target2Milli: 3000,
  stopMilli: 1000,
  trailingMilli: 2000,
  timeStopSessions: 15,
  horizonSessions: 20,
  sizingBps: { GREEN: 500, YELLOW: 250, RED: 0 },
};

export const ticketRulesHash = (r: TicketRules): string => sha256Hex(canonicalJson(r));

/** What the ticket needs besides the arm's answer: prices known before the decision. */
export interface TicketMarket {
  previousClosePaise: number;
  atr14Paise: number;
}

export interface Ticket {
  action: ArmAction;
  /** The only label the ticket may carry, e.g. "Experimental arm output · PH-12 · [M]". */
  label: string;
  hypothesisId: string;
  evidenceTag: string;
  reasonCode: string;
  stateCode: StateCode | null;
  instrumentId: string;
  date: string;
  horizonSessions: number;
  /** Prices in paise; null when the action places no order (HOLD, EXIT, BLOCK). */
  entryPaise: number | null;
  limitPaise: number | null;
  target1Paise: number | null;
  target2Paise: number | null;
  stopPaise: number | null;
  /** Reward to risk on target 1, in thousandths (1500 = 1.5 : 1); null when there is no entry. */
  rewardToRiskMilli: number | null;
  timeStopSessions: number | null;
  sizeBps: number | null;
  rulesHash: string;
}

const atrOf = (m: TicketMarket, milli: number): number =>
  mulDiv(m.atr14Paise, milli, 1000, 'half_up');

function actionFor(candidate: Candidate, answer: OverlayResult, rules: TicketRules): ArmAction {
  const blocked = answer.decision === 'deny';
  if (candidate.side === 'sell') return blocked ? 'HOLD' : 'EXIT';
  if (blocked) return 'BLOCK';
  return rules.useLimitEntry ? 'ENTER-LIMIT' : 'ENTER';
}

function sizeFor(answer: OverlayResult, rules: TicketRules): number | null {
  const base =
    answer.stateCode === 'GREEN' || answer.stateCode === 'YELLOW' || answer.stateCode === 'RED'
      ? rules.sizingBps[answer.stateCode]
      : rules.sizingBps.GREEN;
  if (answer.decision === 'deny') return 0;
  return answer.decision === 'resize' ? Math.round(base * (answer.sizeMultiplier ?? 1)) : base;
}

const EMPTY_PRICES = {
  entryPaise: null,
  limitPaise: null,
  target1Paise: null,
  target2Paise: null,
  stopPaise: null,
  rewardToRiskMilli: null,
  timeStopSessions: null,
} as const;

function pricesFor(action: ArmAction, m: TicketMarket, rules: TicketRules) {
  if (action !== 'ENTER' && action !== 'ENTER-LIMIT') return EMPTY_PRICES;
  const limit = subPaise(m.previousClosePaise, atrOf(m, rules.limitMilli));
  const entry = action === 'ENTER-LIMIT' ? limit : m.previousClosePaise;
  const risk = atrOf(m, rules.stopMilli);
  const reward = atrOf(m, rules.target1Milli);
  return {
    entryPaise: entry,
    limitPaise: action === 'ENTER-LIMIT' ? limit : null,
    target1Paise: addPaise(entry, reward),
    target2Paise: addPaise(entry, atrOf(m, rules.target2Milli)),
    stopPaise: subPaise(entry, risk),
    rewardToRiskMilli: risk === 0 ? null : mulDiv(reward, 1000, risk, 'half_up'),
    timeStopSessions: rules.timeStopSessions,
  };
}

export interface TicketInput {
  candidate: Candidate;
  answer: OverlayResult;
  market: TicketMarket;
  rules: TicketRules;
  hypothesisId: string;
  /** The evidence tag of the hypothesis, such as "[H]" or "[M]". */
  evidenceTag: string;
}

/** Builds the read-only ticket for one candidate from the arm's answer and the registered rules. */
export function buildTicket(input: TicketInput): Ticket {
  const { candidate, answer, rules } = input;
  if (!(input.market.atr14Paise > 0)) throw new RangeError('ATR14 must be above zero');
  const action = actionFor(candidate, answer, rules);
  return {
    action,
    label: `Experimental arm output · ${input.hypothesisId} · ${input.evidenceTag}`,
    hypothesisId: input.hypothesisId,
    evidenceTag: input.evidenceTag,
    reasonCode: answer.reasonCode,
    stateCode: answer.stateCode ?? null,
    instrumentId: candidate.instrumentId,
    date: candidate.date,
    horizonSessions: rules.horizonSessions,
    ...pricesFor(action, input.market, rules),
    sizeBps: action === 'ENTER' || action === 'ENTER-LIMIT' ? sizeFor(answer, rules) : null,
    rulesHash: ticketRulesHash(rules),
  };
}
