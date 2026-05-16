// tests/baStore.test.mjs
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, readFile, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInitialState } from '../src/ba/state.js';
import { loadState, saveState, appendHandoffManifest, rewriteRequirementBlock, baDir } from '../src/io/baStore.js';

describe('ba store IO', () => {
  let root;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), 'ba-')); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  test('baDir composes projects/<slug>/ba', () => {
    expect(baDir(root, 'my-site')).toBe(join(root, 'projects', 'my-site', 'ba'));
  });

  test('saveState writes state.json AND regenerated manifest.md', async () => {
    const s = createInitialState('my-site');
    await saveState(root, s);
    const dir = baDir(root, 'my-site');
    const written = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8'));
    expect(written).toEqual(s);
    const manifest = await readFile(join(dir, 'manifest.md'), 'utf8');
    expect(manifest).toContain('GENERATED FROM state.json');
  });

  test('loadState returns null when absent, the state when present', async () => {
    expect(await loadState(root, 'ghost')).toBeNull();
    const s = createInitialState('my-site');
    await saveState(root, s);
    expect(await loadState(root, 'my-site')).toEqual(s);
  });

  test('loadState throws on invalid stored state', async () => {
    const dir = baDir(root, 'broken');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, 'state.json'), '{"version":1,"phase":"bogus"}', 'utf8');
    await expect(loadState(root, 'broken')).rejects.toThrow(/invalid/i);
  });

  test('appendHandoffManifest writes immutable file and refuses overwrite', async () => {
    await saveState(root, createInitialState('my-site'));
    await appendHandoffManifest(root, 'my-site', 'handoff/2026.md', '# Handoff');
    const dir = baDir(root, 'my-site');
    expect(await readFile(join(dir, 'handoff/2026.md'), 'utf8')).toBe('# Handoff');
    await expect(
      appendHandoffManifest(root, 'my-site', 'handoff/2026.md', '# Other')
    ).rejects.toThrow(/exists/);
  });

  test('rewriteRequirementBlock creates a marked block when absent, rewrites it in place when present', async () => {
    await saveState(root, createInitialState('my-site'));
    const file = join(baDir(root, 'my-site'), 'requirements.md');

    // First write for REQ-001 -> creates a wrapped block.
    await rewriteRequirementBlock(root, 'my-site', 'REQ-001', 'original body');
    let md = await readFile(file, 'utf8');
    expect(md).toContain('<!-- REQ-001 START -->');
    expect(md).toContain('original body');
    expect(md).toContain('<!-- REQ-001 END -->');

    // Add a second REQ so we can prove the first is replaced, not duplicated.
    await rewriteRequirementBlock(root, 'my-site', 'REQ-002', 'second body');

    // Rewrite REQ-001 in place -> old text gone, new text present, REQ-002 untouched, no duplicate markers.
    await rewriteRequirementBlock(root, 'my-site', 'REQ-001', 'team-adjusted body\n\n_realised as t1 (team-adjusted)_');
    md = await readFile(file, 'utf8');
    expect(md).not.toContain('original body');
    expect(md).toContain('team-adjusted body');
    expect(md).toContain('_realised as t1 (team-adjusted)_');
    expect(md).toContain('second body');
    expect(md.match(/<!-- REQ-001 START -->/g)).toHaveLength(1);
    expect(md.match(/<!-- REQ-001 END -->/g)).toHaveLength(1);
  });
});
