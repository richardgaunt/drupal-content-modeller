// tests/baResolveDir.test.mjs
import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  setProjectsDir, getProjectPath, writeRegistryStub, resolveBaDir
} from '../src/io/fileSystem.js';

describe('resolveBaDir', () => {
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

  test('legacy project resolves DCM-side under projects/<slug>/ba', async () => {
    expect(await resolveBaDir('legacy-site')).toBe(join(getProjectPath('legacy-site'), 'ba'));
  });

  test('externalized project resolves to <baseDirectory>/.dcm/ba', async () => {
    await writeRegistryStub('ext-site', { slug: 'ext-site', baseDirectory: repoDir });
    expect(await resolveBaDir('ext-site')).toBe(join(repoDir, '.dcm', 'ba'));
  });
});
