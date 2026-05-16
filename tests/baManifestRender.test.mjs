// tests/baManifestRender.test.mjs
import { describe, test, expect } from '@jest/globals';
import { createInitialState } from '../src/ba/state.js';
import { renderManifest } from '../src/ba/manifestRender.js';

describe('ba manifest render', () => {
  test('renders a deterministic markdown view from state', () => {
    const s = createInitialState('my-site');
    s.phase = 'requirements';
    s.round = 2;
    s.requirements = {
      'REQ-001': { status: 'refined', tickets: ['t1'], amends: null, amendedBy: ['REQ-003'] },
      'REQ-002': { status: 'open', tickets: [], amends: null, amendedBy: [] },
      'REQ-003': { status: 'open', tickets: [], amends: 'REQ-001', amendedBy: [] }
    };
    const md = renderManifest(s);
    expect(md).toContain('# Personal Loop manifest — my-site');
    expect(md).toContain('**Phase:** requirements');
    expect(md).toContain('**Round:** 2');
    expect(md).toContain('| REQ-001 | refined | t1 | — | REQ-003 |');
    expect(md).toContain('| REQ-003 | open | — | REQ-001 | — |');
    // Generated-file banner so no one hand-edits it
    expect(md).toContain('<!-- GENERATED FROM state.json — DO NOT EDIT -->');
  });

  test('is a pure function of state (same input -> identical output)', () => {
    const s = createInitialState('x');
    expect(renderManifest(s)).toBe(renderManifest(s));
  });
});
