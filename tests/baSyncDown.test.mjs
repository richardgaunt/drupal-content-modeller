// tests/baSyncDown.test.mjs
import { describe, test, expect } from '@jest/globals';
import { createInitialState } from '../src/ba/state.js';
import { reconcileSyncDown } from '../src/ba/syncDown.js';

function refinedState() {
  const s = createInitialState('my-site');
  s.nextReqSeq = 2;
  s.requirements['REQ-001'] = {
    status: 'refined', tickets: ['t1'], amends: null, amendedBy: []
  };
  return s;
}

describe('ba sync-down (tickets win, idempotent, repeatable)', () => {
  test('rewrites mapped REQ, annotates, sets synced-back', () => {
    const s = refinedState();
    const out = reconcileSyncDown(s, [
      { reqId: 'REQ-001', ticketId: 't1', content: 'team adjusted body', hash: 'h1' }
    ]);
    expect(out.state.requirements['REQ-001'].status).toBe('synced-back');
    expect(out.state.requirements['REQ-001'].lastSyncHash).toBe('h1');
    expect(out.annotations).toEqual([
      { reqId: 'REQ-001', text: 'team adjusted body', note: 'realised as t1 (team-adjusted)' }
    ]);
    expect(out.changed).toBe(true);
  });

  test('idempotent on identical input (same hash) -> no change', () => {
    let s = refinedState();
    s = reconcileSyncDown(s, [{ reqId: 'REQ-001', ticketId: 't1', content: 'b', hash: 'h1' }]).state;
    const again = reconcileSyncDown(s, [{ reqId: 'REQ-001', ticketId: 't1', content: 'b', hash: 'h1' }]);
    expect(again.changed).toBe(false);
    expect(again.annotations).toEqual([]);
    expect(again.state).toBe(s);
  });

  test('repeatable: changed hash on synced-back REQ re-reconciles', () => {
    let s = refinedState();
    s = reconcileSyncDown(s, [{ reqId: 'REQ-001', ticketId: 't1', content: 'b1', hash: 'h1' }]).state;
    const out = reconcileSyncDown(s, [{ reqId: 'REQ-001', ticketId: 't1', content: 'b2', hash: 'h2' }]);
    expect(out.changed).toBe(true);
    expect(out.state.requirements['REQ-001'].status).toBe('synced-back');
    expect(out.state.requirements['REQ-001'].lastSyncHash).toBe('h2');
  });

  test('unknown reqId throws', () => {
    const s = refinedState();
    expect(() =>
      reconcileSyncDown(s, [{ reqId: 'REQ-404', ticketId: 't', content: 'c', hash: 'h' }])
    ).toThrow(/REQ-404/);
  });
});
