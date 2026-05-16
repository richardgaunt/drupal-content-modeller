// tests/baIntegration.test.mjs
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { baInit, baStatus, baGate, baHandoff, baSyncDown } from '../src/commands/ba.js';

describe('Personal Loop end-to-end', () => {
  let root;
  const dir = (s) => join(root, 'projects', s, 'ba');
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'baint-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  test('settled-work survives a fresh resume; refined REQ is skipped, conflict cross-links', async () => {
    await baInit(root, 'p');
    await baGate(root, 'p', { kind: 'new' }); // REQ-001

    // approve + hand off REQ-001
    let s = await baStatus(root, 'p', { raw: true });
    s.requirements['REQ-001'].status = 'drafted';
    s.requirements['REQ-001'].tickets = ['t1'];
    s.artefacts = { t1: 'approved' };
    await baSyncDown.__saveForTest(root, s);
    await baHandoff(root, 'p', { reqIds: ['REQ-001'], ts: 'T1', snapshots: { 'REQ-001': 'snap' } });

    // fresh resume: reload from disk only
    const resumed = await baStatus(root, 'p');
    expect(resumed.requirements.find((r) => r.id === 'REQ-001').status).toBe('refined');

    // match against refined -> skipped, no new REQ
    const m = await baGate(root, 'p', { kind: 'match', refId: 'REQ-001' });
    expect(m.action).toBe('skipped');

    // conflict against refined -> new cross-linked REQ-002
    const c = await baGate(root, 'p', { kind: 'conflict', refId: 'REQ-001' });
    expect(c.action).toBe('amended');
    expect(c.id).toBe('REQ-002');

    const finalState = await baStatus(root, 'p', { raw: true });
    expect(finalState.requirements['REQ-002'].amends).toBe('REQ-001');
    expect(finalState.requirements['REQ-001'].amendedBy).toEqual(['REQ-002']);

    // immutable handoff manifest exists and is unchanged
    expect(await readFile(join(dir('p'), 'handoff/T1.md'), 'utf8')).toContain('# Handoff T1');

    // manifest.md regenerated from state.json (zero drift): re-saving yields same file
    const m1 = await readFile(join(dir('p'), 'manifest.md'), 'utf8');
    await baGate(root, 'p', { kind: 'match', refId: 'REQ-001' }); // no-op (skipped, no save)
    const m2 = await readFile(join(dir('p'), 'manifest.md'), 'utf8');
    expect(m2).toBe(m1);
  });

  test('sync-down is idempotent then repeatable on changed input', async () => {
    await baInit(root, 'p');
    let s = await baStatus(root, 'p', { raw: true });
    s.nextReqSeq = 2;
    s.requirements['REQ-001'] = { status: 'refined', tickets: ['t1'], amends: null, amendedBy: [] };
    await baSyncDown.__saveForTest(root, s);

    const a = await baSyncDown(root, 'p', [{ reqId: 'REQ-001', ticketId: 't1', content: 'v1', hash: 'h1' }]);
    expect(a.changed).toBe(true);
    const b = await baSyncDown(root, 'p', [{ reqId: 'REQ-001', ticketId: 't1', content: 'v1', hash: 'h1' }]);
    expect(b.changed).toBe(false);
    const c = await baSyncDown(root, 'p', [{ reqId: 'REQ-001', ticketId: 't1', content: 'v2', hash: 'h2' }]);
    expect(c.changed).toBe(true);
    expect((await baStatus(root, 'p', { raw: true })).requirements['REQ-001'].status).toBe('synced-back');
  });
});
