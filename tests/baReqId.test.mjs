// tests/baReqId.test.mjs
import { describe, test, expect } from '@jest/globals';
import { createInitialState } from '../src/ba/state.js';
import { allocateReq, formatReqId } from '../src/ba/reqId.js';

describe('ba reqId', () => {
  test('formatReqId zero-pads to 3 digits', () => {
    expect(formatReqId(1)).toBe('REQ-001');
    expect(formatReqId(42)).toBe('REQ-042');
    expect(formatReqId(1234)).toBe('REQ-1234');
  });

  test('allocateReq returns a new id and advances nextReqSeq, never reusing', () => {
    let s = createInitialState('x');
    let out = allocateReq(s);
    expect(out.id).toBe('REQ-001');
    s = out.state;
    expect(s.requirements['REQ-001']).toEqual({ status: 'open', tickets: [], amends: null, amendedBy: [] });
    expect(s.nextReqSeq).toBe(2);

    out = allocateReq(s);
    expect(out.id).toBe('REQ-002');
    s = out.state;

    // Even if REQ-001 is deleted, the next id is still 003 (no reuse).
    delete s.requirements['REQ-001'];
    out = allocateReq(s);
    expect(out.id).toBe('REQ-003');
  });

  test('allocateReq does not mutate the input state', () => {
    const s = createInitialState('x');
    const snapshot = JSON.stringify(s);
    allocateReq(s);
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  test('allocateReq accepts amends and sets it on the new req', () => {
    let s = createInitialState('x');
    s = allocateReq(s).state; // REQ-001
    const out = allocateReq(s, { amends: 'REQ-001' });
    expect(out.id).toBe('REQ-002');
    expect(out.state.requirements['REQ-002'].amends).toBe('REQ-001');
  });
});
