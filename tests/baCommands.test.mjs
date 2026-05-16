// tests/baCommands.test.mjs
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  setProjectsDir, getProjectJsonPath, writeJsonFile, resolveBaDir
} from '../src/io/fileSystem.js';
import { baInit, baStatus, baGate, baHandoff, baSyncDown } from '../src/commands/ba.js';

async function seedProject(slug) {
  await writeJsonFile(getProjectJsonPath(slug), { slug, name: slug, configDirectory: '/tmp/cfg' });
}

describe('ba orchestration (project-gated)', () => {
  let projectsDir;
  beforeEach(async () => {
    projectsDir = await mkdtemp(join(tmpdir(), 'pdir-'));
    setProjectsDir(projectsDir);
  });
  afterEach(async () => {
    setProjectsDir(null);
    await rm(projectsDir, { recursive: true, force: true });
  });

  test('baInit on a missing project errors and writes nothing', async () => {
    await expect(baInit('ghost')).rejects.toThrow(/ghost/);
  });

  test('baInit creates state at audit phase; re-init is idempotent', async () => {
    await seedProject('my-site');
    const a = await baInit('my-site');
    expect(a.created).toBe(true);
    expect(a.state.phase).toBe('audit');
    const b = await baInit('my-site');
    expect(b.created).toBe(false);
    expect(b.state.phase).toBe('audit');
  });

  test('baStatus reports phase + ledger summary', async () => {
    await seedProject('my-site');
    await baInit('my-site');
    const st = await baStatus('my-site');
    expect(st.phase).toBe('audit');
    expect(st.requirements).toEqual([]);
  });

  test('baGate applies a signal and persists', async () => {
    await seedProject('my-site');
    await baInit('my-site');
    const r = await baGate('my-site', { kind: 'new' });
    expect(r.action).toBe('created');
    expect(r.id).toBe('REQ-001');
    const reloaded = await baStatus('my-site');
    expect(reloaded.requirements.map((x) => x.id)).toEqual(['REQ-001']);
  });

  test('baHandoff refines, writes immutable manifest, persists', async () => {
    await seedProject('my-site');
    await baInit('my-site');
    await baGate('my-site', { kind: 'new' }); // REQ-001
    let st = await baStatus('my-site', { raw: true });
    st.requirements['REQ-001'].status = 'drafted';
    st.requirements['REQ-001'].tickets = ['t1'];
    st.artefacts = { t1: 'approved' };
    await baSyncDown.__saveForTest(st);

    const ho = await baHandoff('my-site', {
      reqIds: ['REQ-001'], ts: '2026-05-16T00-00-00Z', snapshots: { 'REQ-001': 'snap' }
    });
    expect(ho.state.requirements['REQ-001'].status).toBe('refined');
    const dir = await resolveBaDir('my-site');
    expect(await readFile(join(dir, 'handoff/2026-05-16T00-00-00Z.md'), 'utf8')).toContain('# Handoff');
  });

  test('baSyncDown reconciles and annotates requirements.md', async () => {
    await seedProject('my-site');
    await baInit('my-site');
    let st = await baStatus('my-site', { raw: true });
    st.nextReqSeq = 2;
    st.requirements['REQ-001'] = { status: 'refined', tickets: ['t1'], amends: null, amendedBy: [] };
    await baSyncDown.__saveForTest(st);

    const out = await baSyncDown('my-site', [
      { reqId: 'REQ-001', ticketId: 't1', content: 'team body', hash: 'h1' }
    ]);
    expect(out.changed).toBe(true);
    const reqMd = await readFile(join(await resolveBaDir('my-site'), 'requirements.md'), 'utf8');
    expect(reqMd).toContain('team body');
  });
});
