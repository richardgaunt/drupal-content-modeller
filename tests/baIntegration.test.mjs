// tests/baIntegration.test.mjs
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  setProjectsDir, getProjectJsonPath, writeJsonFile, writeRegistryStub, resolveBaDir
} from '../src/io/fileSystem.js';
import { baInit, baStatus, baGate, baHandoff, baSyncDown } from '../src/commands/ba.js';

async function seedLegacy(slug) {
  await writeJsonFile(getProjectJsonPath(slug), { slug, name: slug, configDirectory: '/tmp/cfg' });
}

describe('Personal Loop end-to-end (project-gated)', () => {
  let projectsDir, repoDir;
  beforeEach(async () => {
    projectsDir = await mkdtemp(join(tmpdir(), 'pdir-'));
    repoDir = await mkdtemp(join(tmpdir(), 'repo-'));
    setProjectsDir(projectsDir);
  });
  afterEach(async () => {
    setProjectsDir(null);
    await rm(projectsDir, { recursive: true, force: true });
    await rm(repoDir, { recursive: true, force: true });
  });

  test('settled-work survives a fresh resume; refined REQ is skipped, conflict cross-links', async () => {
    await seedLegacy('p');
    await baInit('p');
    await baGate('p', { kind: 'new' }); // REQ-001

    let s = await baStatus('p', { raw: true });
    s.requirements['REQ-001'].status = 'drafted';
    s.requirements['REQ-001'].tickets = ['t1'];
    s.artefacts = { t1: 'approved' };
    await baSyncDown.__saveForTest(s);
    await baHandoff('p', { reqIds: ['REQ-001'], ts: 'T1', snapshots: { 'REQ-001': 'snap' } });

    const resumed = await baStatus('p');
    expect(resumed.requirements.find((r) => r.id === 'REQ-001').status).toBe('refined');

    const m = await baGate('p', { kind: 'match', refId: 'REQ-001' });
    expect(m.action).toBe('skipped');

    const c = await baGate('p', { kind: 'conflict', refId: 'REQ-001' });
    expect(c.action).toBe('amended');
    expect(c.id).toBe('REQ-002');

    const finalState = await baStatus('p', { raw: true });
    expect(finalState.requirements['REQ-002'].amends).toBe('REQ-001');
    expect(finalState.requirements['REQ-001'].amendedBy).toEqual(['REQ-002']);

    const dir = await resolveBaDir('p');
    expect(await readFile(join(dir, 'handoff/T1.md'), 'utf8')).toContain('# Handoff T1');

    const m1 = await readFile(join(dir, 'manifest.md'), 'utf8');
    await baGate('p', { kind: 'match', refId: 'REQ-001' }); // no-op (skipped, no save)
    const m2 = await readFile(join(dir, 'manifest.md'), 'utf8');
    expect(m2).toBe(m1);
  });

  test('externalized project: artefacts land under <baseDirectory>/.dcm/ba', async () => {
    await writeRegistryStub('ext', { slug: 'ext', baseDirectory: repoDir });
    await writeJsonFile(join(repoDir, '.dcm', 'project.json'), { slug: 'ext', name: 'ext', configDirectory: '/tmp/cfg' });
    await baInit('ext');
    await baGate('ext', { kind: 'new' });
    const st = await baStatus('ext');
    expect(st.phase).toBe('audit');
    expect(await readFile(join(repoDir, '.dcm', 'ba', 'state.json'), 'utf8')).toContain('"project": "ext"');
  });

  test('sync-down is idempotent then repeatable on changed input', async () => {
    await seedLegacy('p');
    await baInit('p');
    let s = await baStatus('p', { raw: true });
    s.nextReqSeq = 2;
    s.requirements['REQ-001'] = { status: 'refined', tickets: ['t1'], amends: null, amendedBy: [] };
    await baSyncDown.__saveForTest(s);

    const a = await baSyncDown('p', [{ reqId: 'REQ-001', ticketId: 't1', content: 'v1', hash: 'h1' }]);
    expect(a.changed).toBe(true);
    const b = await baSyncDown('p', [{ reqId: 'REQ-001', ticketId: 't1', content: 'v1', hash: 'h1' }]);
    expect(b.changed).toBe(false);
    const c = await baSyncDown('p', [{ reqId: 'REQ-001', ticketId: 't1', content: 'v2', hash: 'h2' }]);
    expect(c.changed).toBe(true);
    expect((await baStatus('p', { raw: true })).requirements['REQ-001'].status).toBe('synced-back');
  });
});
