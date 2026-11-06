import { CorporateActionError, parseNseActionsFile } from '@trading/core';
import type { NseActionsFile } from '@trading/core';
import { ProviderError } from '../providers/rawBar';

/**
 * Corporate actions from NSE's `bc` file. The reader lives in `@trading/core` so the phone's daily catch-up can apply
 * splits and bonuses too (D44); these are the names the laptop pipeline has always used.
 */
export {
  NSE_EQUITY_SERIES as EQUITY_SERIES,
  classifyNsePurpose as classify,
  mergeNseActions as mergeActions,
  nseIsoDate as isoDate,
  nseToCorporateActions as toCorporateActions,
} from '@trading/core';
export type {
  NseActionsFile as ActionsFile,
  NseConverted as Converted,
  NseAction,
  NseActionType,
} from '@trading/core';

/** Reads one `bc` file; a file with the wrong header is a malformed provider response. */
export function parseActionsFile(text: string, series?: readonly string[]): NseActionsFile {
  try {
    return series === undefined ? parseNseActionsFile(text) : parseNseActionsFile(text, series);
  } catch (e) {
    if (e instanceof CorporateActionError) throw new ProviderError('malformed', e.message);
    throw e;
  }
}
