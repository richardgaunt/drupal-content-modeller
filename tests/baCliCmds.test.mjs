// tests/baCliCmds.test.mjs
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cmdBaInit, cmdBaStatus } from '../src/cli/commands/baCmds.js';

describe('ba CLI handlers', () => {
  let root, logSpy, exitSpy;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'bacli-'));
    jest.spyOn(process, 'cwd').mockReturnValue(root);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {});
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await rm(root, { recursive: true, force: true });
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
});
