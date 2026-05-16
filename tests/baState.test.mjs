// tests/baState.test.mjs
import { describe, test, expect } from '@jest/globals';
import { createInitialState, validateState, STATE_VERSION } from '../src/ba/state.js';

describe('ba state', () => {
  test('createInitialState produces a valid audit-phase state', () => {
    const s = createInitialState('my-site');
    expect(s).toEqual({
      version: STATE_VERSION,
      project: 'my-site',
      phase: 'audit',
      round: 0,
      artefacts: {},
      requirements: {},
      nextReqSeq: 1,
      handoffs: []
    });
    expect(validateState(s)).toEqual({ ok: true, errors: [] });
  });

  test('validateState rejects unknown phase and bad req status', () => {
    const s = createInitialState('x');
    s.phase = 'bogus';
    s.requirements['REQ-001'] = { status: 'nope', tickets: [], amends: null, amendedBy: [] };
    const r = validateState(s);
    expect(r.ok).toBe(false);
    expect(r.errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('phase'),
        expect.stringContaining('REQ-001')
      ])
    );
  });

  test('validateState rejects missing project', () => {
    const s = createInitialState('x');
    delete s.project;
    expect(validateState(s).ok).toBe(false);
  });
});
