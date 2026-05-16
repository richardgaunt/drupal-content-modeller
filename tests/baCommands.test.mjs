// tests/baCommands.test.mjs
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { baInit, baStatus, baGate, baHandoff, baSyncDown } from '../src/commands/ba.js';

describe('ba orchestration', () => {
  let root;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'bac-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  test('baInit creates state at audit phase; re-init is idempotent', async () => {
    const a = await baInit(root, 'my-site');
    expect(a.created).toBe(true);
    expect(a.state.phase).toBe('audit');
    const b = await baInit(root, 'my-site');
    expect(b.created).toBe(false);
    expect(b.state.phase).toBe('audit');
  });

  test('baStatus reports phase + ledger summary', async () => {
    await baInit(root, 'my-site');
    const st = await baStatus(root, 'my-site');
    expect(st.phase).toBe('audit');
    expect(st.requirements).toEqual([]);
  });

  test('baGate applies a signal and persists', async () => {
    await baInit(root, 'my-site');
    const r = await baGate(root, 'my-site', { kind: 'new' });
    expect(r.action).toBe('created');
    expect(r.id).toBe('REQ-001');
    const reloaded = await baStatus(root, 'my-site');
    expect(reloaded.requirements.map((x) => x.id)).toEqual(['REQ-001']);
  });

  test('baHandoff refines, writes immutable manifest, persists', async () => {
    await baInit(root, 'my-site');
    await baGate(root, 'my-site', { kind: 'new' }); // REQ-001
    // wire ticket + approve it through the store-level shape
    let st = await baStatus(root, 'my-site', { raw: true });
    st.requirements['REQ-001'].status = 'drafted';
    st.requirements['REQ-001'].tickets = ['t1'];
    st.artefacts = { t1: 'approved' };
    await baSyncDown.__saveForTest(root, st); // helper exported for tests (see impl)

    const ho = await baHandoff(root, 'my-site', {
      reqIds: ['REQ-001'], ts: '2026-05-16T00-00-00Z', snapshots: { 'REQ-001': 'snap' }
    });
    expect(ho.state.requirements['REQ-001'].status).toBe('refined');
    const dir = join(root, 'projects', 'my-site', 'ba');
    expect(await readFile(join(dir, 'handoff/2026-05-16T00-00-00Z.md'), 'utf8')).toContain('# Handoff');
  });

  test('baSyncDown reconciles and annotates requirements.md', async () => {
    await baInit(root, 'my-site');
    let st = await baStatus(root, 'my-site', { raw: true });
    st.nextReqSeq = 2;
    st.requirements['REQ-001'] = { status: 'refined', tickets: ['t1'], amends: null, amendedBy: [] };
    await baSyncDown.__saveForTest(root, st);

    const out = await baSyncDown(root, 'my-site', [
      { reqId: 'REQ-001', ticketId: 't1', content: 'team body', hash: 'h1' }
    ]);
    expect(out.changed).toBe(true);
    const reqMd = await readFile(join(root, 'projects', 'my-site', 'ba', 'requirements.md'), 'utf8');
    expect(reqMd).toContain('team body');
  });
});
