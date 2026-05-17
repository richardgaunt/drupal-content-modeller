// tests/baHandoffManifest.test.mjs
import { describe, test, expect } from '@jest/globals';
import { createInitialState } from '../src/ba/state.js';
import { allocateReq } from '../src/ba/reqId.js';
import { buildHandoff } from '../src/ba/handoffManifest.js';

describe('ba handoff manifest', () => {
  function approvedState() {
    let s = createInitialState('my-site');
    s = allocateReq(s).state; // REQ-001
    s = allocateReq(s).state; // REQ-002
    s.requirements['REQ-001'] = { status: 'drafted', tickets: ['t1'], amends: null, amendedBy: [] };
    s.requirements['REQ-002'] = { status: 'drafted', tickets: ['t2'], amends: null, amendedBy: [] };
    s.artefacts = { t1: 'approved', t2: 'approved' };
    return s;
  }

  test('marks named REQs refined, records handoff, builds immutable markdown', () => {
    const s = approvedState();
    const ts = '2026-05-16T10-00-00Z';
    const snapshots = { 'REQ-001': 'REQ-001 text', t1: 'ticket t1 body' };
    const out = buildHandoff(s, { reqIds: ['REQ-001'], ts, snapshots });

    expect(out.state.requirements['REQ-001'].status).toBe('refined');
    expect(out.state.requirements['REQ-002'].status).toBe('drafted'); // untouched
    expect(out.state.handoffs).toEqual([
      { ts, file: `handoff/${ts}.md`, reqs: ['REQ-001'] }
    ]);
    expect(out.file).toBe(`handoff/${ts}.md`);
    expect(out.markdown).toContain(`# Handoff ${ts}`);
    expect(out.markdown).toContain('REQ-001');
    expect(out.markdown).toContain('ticket t1 body');
    expect(out.markdown).toContain('<!-- IMMUTABLE — append a new handoff manifest to correct -->');
  });

  test('refuses to hand off a REQ whose ticket is not approved', () => {
    const s = approvedState();
    s.artefacts.t1 = 'refining';
    expect(() =>
      buildHandoff(s, { reqIds: ['REQ-001'], ts: 'x', snapshots: {} })
    ).toThrow(/not approved/);
  });

  test('refuses to re-hand-off an already refined REQ', () => {
    const s = approvedState();
    s.requirements['REQ-001'].status = 'refined';
    expect(() =>
      buildHandoff(s, { reqIds: ['REQ-001'], ts: 'x', snapshots: {} })
    ).toThrow(/already refined/);
  });

  test('does not mutate input state', () => {
    const s = approvedState();
    const snap = JSON.stringify(s);
    buildHandoff(s, { reqIds: ['REQ-001'], ts: 'x', snapshots: {} });
    expect(JSON.stringify(s)).toBe(snap);
  });
});
