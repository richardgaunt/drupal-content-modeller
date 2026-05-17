// tests/baLedger.test.mjs
import { describe, test, expect } from '@jest/globals';
import { createInitialState } from '../src/ba/state.js';
import { allocateReq } from '../src/ba/reqId.js';
import { applySignal } from '../src/ba/ledger.js';

function stateWith(reqStatuses) {
  let s = createInitialState('x');
  for (const status of reqStatuses) {
    const out = allocateReq(s);
    s = out.state;
    s.requirements[out.id].status = status;
  }
  return s;
}

describe('ba ledger settled-work gate', () => {
  test('new signal allocates a fresh open REQ', () => {
    const s = createInitialState('x');
    const r = applySignal(s, { kind: 'new' });
    expect(r.action).toBe('created');
    expect(r.id).toBe('REQ-001');
    expect(r.state.requirements['REQ-001'].status).toBe('open');
  });

  test('match against a refined REQ is skipped (no rework)', () => {
    const s = stateWith(['refined']); // REQ-001 refined
    const r = applySignal(s, { kind: 'match', refId: 'REQ-001' });
    expect(r.action).toBe('skipped');
    expect(r.state).toBe(s); // unchanged reference
  });

  test('conflict against a refined REQ creates a cross-linked superseding REQ', () => {
    const s = stateWith(['refined']); // REQ-001 refined
    const r = applySignal(s, { kind: 'conflict', refId: 'REQ-001' });
    expect(r.action).toBe('amended');
    expect(r.id).toBe('REQ-002');
    expect(r.state.requirements['REQ-002'].amends).toBe('REQ-001');
    expect(r.state.requirements['REQ-002'].status).toBe('open');
    // old req untouched in content/status, only gains forward pointer
    expect(r.state.requirements['REQ-001'].status).toBe('refined');
    expect(r.state.requirements['REQ-001'].amendedBy).toEqual(['REQ-002']);
  });

  test('conflict against a non-refined REQ reopens its mapped artefact', () => {
    let s = stateWith(['drafted']); // REQ-001 drafted
    s.requirements['REQ-001'].tickets = ['ticket-a'];
    s.artefacts['ticket-a'] = 'approved';
    const r = applySignal(s, { kind: 'conflict', refId: 'REQ-001' });
    expect(r.action).toBe('reopened');
    expect(r.state.artefacts['ticket-a']).toBe('reopened');
    expect(r.state.requirements['REQ-001'].status).toBe('drafted'); // ledger status unchanged
  });

  test('unknown refId throws', () => {
    const s = createInitialState('x');
    expect(() => applySignal(s, { kind: 'match', refId: 'REQ-999' })).toThrow(/REQ-999/);
  });
});
