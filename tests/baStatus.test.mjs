// tests/baStatus.test.mjs
import { describe, test, expect } from '@jest/globals';
import {
  PHASES, ARTEFACT_STATUS, REQ_STATUS,
  isRefined, canTransitionReq
} from '../src/ba/status.js';

describe('ba status', () => {
  test('phase order is fixed', () => {
    expect(PHASES).toEqual(['audit', 'requirements', 'draft-tickets', 'ticket-refinement']);
  });

  test('requirement statuses', () => {
    expect(REQ_STATUS).toEqual(['open', 'drafted', 'refined', 'synced-back']);
  });

  test('isRefined treats refined and synced-back as not-re-analysed', () => {
    expect(isRefined('refined')).toBe(true);
    expect(isRefined('synced-back')).toBe(true);
    expect(isRefined('open')).toBe(false);
    expect(isRefined('drafted')).toBe(false);
  });

  test('requirement transitions are forward-only except synced-back self-loop', () => {
    expect(canTransitionReq('open', 'drafted')).toBe(true);
    expect(canTransitionReq('drafted', 'refined')).toBe(true);
    expect(canTransitionReq('refined', 'synced-back')).toBe(true);
    expect(canTransitionReq('synced-back', 'synced-back')).toBe(true); // re-sync
    expect(canTransitionReq('refined', 'drafted')).toBe(false);
    expect(canTransitionReq('synced-back', 'refined')).toBe(false);
  });
});
