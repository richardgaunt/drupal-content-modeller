// tests/baStore.test.mjs
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setProjectsDir, writeRegistryStub, resolveBaDir } from '../src/io/fileSystem.js';
import { createInitialState } from '../src/ba/state.js';
import { loadState, saveState, appendHandoffManifest, rewriteRequirementBlock } from '../src/io/baStore.js';

describe('ba store IO (project-model resolved)', () => {
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

  test('saveState writes state.json AND regenerated manifest.md in the resolved dir', async () => {
    const s = createInitialState('my-site');
    await saveState(s);
    const dir = await resolveBaDir('my-site');
    const written = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
    expect(written).toEqual(s);
    expect(await readFile(join(dir, 'manifest.md'), 'utf8')).toContain('GENERATED FROM state.json');
  });

  test('externalized project writes under <baseDirectory>/.dcm/ba', async () => {
    await writeRegistryStub('ext-site', { slug: 'ext-site', baseDirectory: repoDir });
    await saveState(createInitialState('ext-site'));
    expect(await readFile(join(repoDir, '.dcm', 'ba', 'state.json'), 'utf8')).toContain('"project": "ext-site"');
  });

  test('loadState returns null when absent, the state when present', async () => {
    expect(await loadState('ghost')).toBeNull();
    const s = createInitialState('my-site');
    await saveState(s);
    expect(await loadState('my-site')).toEqual(s);
  });

  test('loadState throws on invalid stored state', async () => {
    const dir = await resolveBaDir('broken');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'state.json'), '{"version":1,"phase":"bogus"}', 'utf8');
    await expect(loadState('broken')).rejects.toThrow(/invalid/i);
  });

  test('appendHandoffManifest writes immutable file and refuses overwrite', async () => {
    await saveState(createInitialState('my-site'));
    await appendHandoffManifest('my-site', 'handoff/2026.md', '# Handoff');
    const dir = await resolveBaDir('my-site');
    expect(await readFile(join(dir, 'handoff/2026.md'), 'utf8')).toBe('# Handoff');
    await expect(
      appendHandoffManifest('my-site', 'handoff/2026.md', '# Other')
    ).rejects.toThrow(/exists/);
  });

  test('rewriteRequirementBlock creates a marked block when absent, rewrites it in place when present', async () => {
    await saveState(createInitialState('my-site'));
    const file = join(await resolveBaDir('my-site'), 'requirements.md');

    await rewriteRequirementBlock('my-site', 'REQ-001', 'original body');
    let md = await readFile(file, 'utf8');
    expect(md).toContain('<!-- REQ-001 START -->');
    expect(md).toContain('original body');
    expect(md).toContain('<!-- REQ-001 END -->');

    await rewriteRequirementBlock('my-site', 'REQ-002', 'second body');

    await rewriteRequirementBlock('my-site', 'REQ-001', 'team-adjusted body\n\n_realised as t1 (team-adjusted)_');
    md = await readFile(file, 'utf8');
    expect(md).not.toContain('original body');
    expect(md).toContain('team-adjusted body');
    expect(md).toContain('_realised as t1 (team-adjusted)_');
    expect(md).toContain('second body');
    expect(md.match(/<!-- REQ-001 START -->/g)).toHaveLength(1);
    expect(md.match(/<!-- REQ-001 END -->/g)).toHaveLength(1);
  });
});
