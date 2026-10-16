import { describe, expect, it } from 'vitest';
import { CORE_PACKAGE_NAME } from './index';

describe('core skeleton', () => {
  it('exports its package name', () => {
    expect(CORE_PACKAGE_NAME).toBe('@trading/core');
  });
});
