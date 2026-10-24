import { EMPTY_REGISTRY, preRegister } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { DC_FAMILY, DC_P1_ID, DC_P2_ID, dcRuleHash, dcSpec } from './dashaCollapse';

const frozen = { listFileHash: 'a'.repeat(64), manifestHash: 'b'.repeat(64), stocks: 206 };

describe('PH-13 and PH-14, daśā and collapse', () => {
  it('gives each test its own stable rule hash', () => {
    expect(dcRuleHash('P1')).toMatch(/^[0-9a-f]{64}$/);
    expect(dcRuleHash('P1')).toBe(dcRuleHash('P1'));
    expect(dcRuleHash('P1')).not.toBe(dcRuleHash('P2'));
  });

  it('builds two specs in one family that the registry accepts', () => {
    const p1 = dcSpec('P1', frozen);
    const p2 = dcSpec('P2', frozen);
    expect([p1.id, p2.id]).toEqual([DC_P1_ID, DC_P2_ID]);
    expect(p1.family).toBe(DC_FAMILY);
    expect(p2.family).toBe(DC_FAMILY);
    const reg = preRegister(preRegister(EMPTY_REGISTRY, p1, 1), p2, 2);
    expect(reg.registrations).toHaveLength(2);
  });

  it('ties the spec to the frozen list, so a different list is a different registration', () => {
    const other = dcSpec('P1', { ...frozen, listFileHash: 'c'.repeat(64) });
    expect(other.params.listFileHash).not.toBe(dcSpec('P1', frozen).params.listFileHash);
    expect(other.ruleHash).toBe(dcSpec('P1', frozen).ruleHash);
  });

  it('claims an added share in percentage points, upward', () => {
    expect(dcSpec('P2', frozen).claimed).toMatchObject({ effectSizePct: 9, direction: 'up' });
    expect(dcSpec('P2', frozen).params.effectUnit).toBe('percentage points of event share');
  });
});
