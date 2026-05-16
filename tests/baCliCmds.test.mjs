// tests/baCliCmds.test.mjs
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setProjectsDir, getProjectJsonPath, writeJsonFile } from '../src/io/fileSystem.js';
import { cmdBaInit, cmdBaStatus } from '../src/cli/commands/baCmds.js';

describe('ba CLI handlers (project-gated)', () => {
  let projectsDir, logSpy, errSpy, exitSpy;
  beforeEach(async () => {
    projectsDir = await mkdtemp(join(tmpdir(), 'pdir-'));
    setProjectsDir(projectsDir);
    await writeJsonFile(getProjectJsonPath('my-site'), { slug: 'my-site', name: 'my-site', configDirectory: '/tmp/cfg' });
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    setProjectsDir(null);
    await rm(projectsDir, { recursive: true, force: true });
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
