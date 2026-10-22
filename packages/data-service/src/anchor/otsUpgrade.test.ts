import { sha256Bytes } from '@trading/core';
import { describe, expect, it } from 'vitest';
import type { HttpClient } from '../http/fetchPolicy';
import { leaves, parseProof, serializeProof, upgradeProof } from './otsUpgrade';

const hex = (b: Uint8Array): string => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string): Uint8Array =>
  Uint8Array.from((s.match(/../g) ?? []).map((h) => parseInt(h, 16)));

/** A pending proof as a calendar makes it: append a nonce, hash, then the pending leaf for one calendar. */
function pendingProof(uri: string): { file: Uint8Array; commitment: Uint8Array } {
  const digest = sha256Bytes(new TextEncoder().encode('x'));
  const nonce = Uint8Array.from({ length: 16 }, (_, i) => i + 1);
  const appended = Uint8Array.from([...digest, ...nonce]);
  const commitment = sha256Bytes(appended);
  const tag = unhex('83dfe30d2ef90c8e');
  const text = new TextEncoder().encode(uri);
  const payload = Uint8Array.from([text.length, ...text]);
  const magic = unhex(
    '004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e8929401'.slice(0, 62),
  );
  const file = Uint8Array.from([
    ...magic,
    1,
    0x08,
    ...digest,
    0xf0,
    16,
    ...nonce,
    0x08,
    0x00,
    ...tag,
    payload.length,
    ...payload,
  ]);
  return { file, commitment };
}

/** What a calendar sends once Bitcoin has the commitment: a Bitcoin leaf at height 800000 (varuint). */
const bitcoinAnswer = Uint8Array.from([0x00, ...unhex('0588960d73d71901'), 3, 0x80, 0xea, 0x30]);

const http = (routes: Record<string, { status: number; body: Uint8Array }>) => {
  const asked: string[] = [];
  const client: HttpClient = {
    get: (url) => {
      asked.push(url);
      const hit = routes[url];
      return Promise.resolve({
        status: hit?.status ?? 404,
        body: hit?.body ?? new Uint8Array(0),
        headers: {},
      });
    },
  };
  return Object.assign(client, { asked });
};

/** The pending proof alice returned for the live probe on 2026-10-20 (a stamp of a fixed test sentence). */
const LIVE_PROBE =
  '004f70656e54696d657374616d7073000050726f6f6600bf89e2e884e8929401087704f5b1a2f8e9e1c4014c940a237575d143776315396189fe91a6fa271465b5f00833e611fb673f25d408f01047451adfa1ee71b818ed8dcefe87065608f020c44beb0b6b027e304d700c0e0a422ab174c0188079390586546ec53145a54a9b08f020416e56779ce942639cb03a447934986ae224c9e98f8b51e7c2c4a8eb11dcd6b908f0200365f3322a482c21f2d52f5723cd3d459c2961c965e30f6b986e48aa768d27a108f1046ad702b1f00870b56bb8ca05179b0083dfe30d2ef90c8e2e2d68747470733a2f2f616c6963652e6274632e63616c656e6461722e6f70656e74696d657374616d70732e6f7267';

const ALICE = 'https://alice.btc.calendar.opentimestamps.org';

describe('reading and writing a proof', () => {
  it('writes the real proof from the live probe back byte for byte', () => {
    const file = unhex(LIVE_PROBE);
    expect(hex(serializeProof(parseProof(file)))).toBe(hex(file));
    expect(leaves(parseProof(file).root)).toEqual([{ kind: 'pending', uri: ALICE }]);
  });
});

describe('upgrading a proof', () => {
  it('swaps the pending leaf for the completed path once the calendar has it', async () => {
    const { file, commitment } = pendingProof(ALICE);
    const client = http({
      [`${ALICE}/timestamp/${hex(commitment)}`]: { status: 200, body: bitcoinAnswer },
    });
    const r = await upgradeProof(file, client);
    expect(r.status).toBe('attested');
    expect(r.bitcoinHeights).toEqual([800000]);
    expect(r.pending).toEqual([]);
    expect(leaves(parseProof(r.proof).root)).toEqual([{ kind: 'bitcoin', height: 800000 }]);
    expect(client.asked).toEqual([`${ALICE}/timestamp/${hex(commitment)}`]);
  });

  it('leaves the proof as it was while the calendar still says pending', async () => {
    const { file } = pendingProof(ALICE);
    const r = await upgradeProof(file, http({}));
    expect(r.status).toBe('pending');
    expect(hex(r.proof)).toBe(hex(file));
    expect(r.notes[0]).toContain('still pending');
  });

  it('keeps the proof when the calendar errors or sends rubbish', async () => {
    const { file, commitment } = pendingProof(ALICE);
    const url = `${ALICE}/timestamp/${hex(commitment)}`;
    for (const reply of [
      { status: 500, body: new Uint8Array(0) },
      { status: 200, body: Uint8Array.of(1, 2, 3) },
      { status: 200, body: Uint8Array.from([...bitcoinAnswer, 9]) },
    ]) {
      const r = await upgradeProof(file, http({ [url]: reply }));
      expect(r.status).toBe('pending');
      expect(hex(r.proof)).toBe(hex(file));
    }
  });

  it('never asks a server that is not a trusted calendar', async () => {
    const { file } = pendingProof('https://evil.example.test');
    const client = http({});
    const r = await upgradeProof(file, client);
    expect(client.asked).toEqual([]);
    expect(r.notes[0]).toContain('not a calendar we trust');
  });

  it('refuses a file that is not a proof', async () => {
    await expect(upgradeProof(Uint8Array.of(1, 2, 3), http({}))).rejects.toThrow();
  });
});
