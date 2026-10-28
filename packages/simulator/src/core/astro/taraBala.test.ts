/**
 * packages/simulator/src/core/astro/taraBala.test.ts
 * Unit tests verifying Tara Bala 9-star calculation and Tithi classification.
 */

import { describe, it, expect } from 'vitest';
import { calculateTaraBala, calculateTithi, mapConsonantToNakshatra } from './taraBala';

describe('Tara Bala & Panchanga Engine', () => {
  it('correctly calculates Tara 1 (Janma) when transit Moon matches Janma Nakshatra', () => {
    const tara = calculateTaraBala(0, 0); // Ashwini -> Ashwini
    expect(tara.taraNumber).toBe(1);
    expect(tara.taraName).toBe('Janma');
    expect(tara.category).toBe('NEUTRAL');
    expect(tara.isAuspicious).toBe(false);
  });

  it('correctly calculates Tara 2 (Sampat - Wealth) on next nakshatra station', () => {
    const tara = calculateTaraBala(0, 1); // Ashwini -> Bharani
    expect(tara.taraNumber).toBe(2);
    expect(tara.taraName).toBe('Sampat');
    expect(tara.category).toBe('AUSPICIOUS');
    expect(tara.isAuspicious).toBe(true);
  });

  it('correctly calculates Tara 3 (Vipat - Danger)', () => {
    const tara = calculateTaraBala(0, 2); // Ashwini -> Krittika
    expect(tara.taraNumber).toBe(3);
    expect(tara.taraName).toBe('Vipat');
    expect(tara.category).toBe('INAUSPICIOUS');
    expect(tara.isAuspicious).toBe(false);
  });

  it('correctly identifies Tara 7 (Naidhana - Fatal/Vadha) across 2nd cycle (Anujanma)', () => {
    // 0 + 6 = 6 (Sadhana), 0 + 15 = 15 -> (15 % 9) + 1 = 6 + 1 = 7 (Naidhana)
    const tara = calculateTaraBala(0, 15); // Ashwini -> Vishakha
    expect(tara.taraNumber).toBe(7);
    expect(tara.taraName).toBe('Naidhana');
    expect(tara.category).toBe('INAUSPICIOUS');
    expect(tara.isFatal).toBe(true);
    expect(tara.cycle).toBe(2);
  });

  it('correctly computes Tithi and detects Rikta Tithi (Chaturthi, Navami, Chaturdashi)', () => {
    // Sun at 0 deg, Moon at 40 deg -> diff = 40 deg.
    // 40 / 12 = 3.33 -> Tithi 4 (Chaturthi, Rikta)
    const tithi = calculateTithi(0, 40);
    expect(tithi.tithiNumber).toBe(4);
    expect(tithi.paksha).toBe('SHUKLA');
    expect(tithi.isRiktaTithi).toBe(true);

    // Full Moon (Purnima): diff = 175 deg -> 175 / 12 = 14.58 -> Tithi 15
    const purnima = calculateTithi(0, 175);
    expect(purnima.tithiNumber).toBe(15);
    expect(purnima.paksha).toBe('SHUKLA');
    expect(purnima.isRiktaTithi).toBe(false);
  });

  it('maps consonants to valid nakshatra stations', () => {
    expect(mapConsonantToNakshatra('A')).toBe(2);
    expect(mapConsonantToNakshatra('Ra')).toBe(13);
    expect(mapConsonantToNakshatra('Unknown')).toBe(0);
  });
});
