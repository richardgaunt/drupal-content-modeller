// tests/baCliCmds.test.mjs
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  setProjectsDir, writeRegistryStub, writeJsonFile, getExternalProjectJsonPath
} from '../src/io/fileSystem.js';
import { cmdBaInit, cmdBaStatus } from '../src/cli/commands/baCmds.js';

async function seedProject(slug, repoDir, extra = {}) {
  await writeJsonFile(getExternalProjectJsonPath(repoDir), {
    name: slug, slug, configDirectory: repoDir, baseDirectory: repoDir,
    baseUrl: '', drupalRoot: '', drushCommand: 'drush',
    theme: null, editableBaseTheme: false, lastSync: null,
    entities: { node: {}, media: {}, paragraph: {}, taxonomy_term: {} },
    ...extra,
  });
  await writeRegistryStub(slug, { slug, baseDirectory: repoDir, createdAt: new Date().toISOString() });
}

describe('ba CLI handlers (project-gated)', () => {
  let projectsDir, repoDir, logSpy, errSpy, exitSpy;
  beforeEach(async () => {
    projectsDir = await mkdtemp(join(tmpdir(), 'pdir-'));
    repoDir = await mkdtemp(join(tmpdir(), 'repo-'));
    setProjectsDir(projectsDir);
    await seedProject('my-site', repoDir);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    setProjectsDir(null);
    await rm(projectsDir, { recursive: true, force: true });
    await rm(repoDir, { recursive: true, force: true });
  });

  test('cmdBaInit prints JSON when --json', async () => {
    await cmdBaInit({ project: 'my-site', json: true });
    const printed = JSON.parse(logSpy.mock.calls.at(-1)[0]);
    expect(printed.state.phase).toBe('audit');
  });

  test('cmdBaStatus after init reports audit phase', async () => {
    await cmdBaInit({ project: 'my-site', json: true });
    logSpy.mockClear();
    await cmdBaStatus({ project: 'my-site', json: true });
    const printed = JSON.parse(logSpy.mock.calls.at(-1)[0]);
    expect(printed.phase).toBe('audit');
  });

  test('cmdBaInit on a missing project reports the error via handleError', async () => {
    await cmdBaInit({ project: 'no-such', json: true });
    expect(errSpy).toHaveBeenCalled();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
