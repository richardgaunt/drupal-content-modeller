import { jest } from '@jest/globals';
import { mkdtemp, rm, chmod } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  setPermissionErrorHandler,
  setProjectsDir,
  writeJsonFile,
  writeYamlFile,
  writeTextFile,
} from '../src/io/fileSystem';

let tempDir;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'perm-retry-'));
  setProjectsDir(tempDir);
  setPermissionErrorHandler(null);
});

afterEach(async () => {
  setPermissionErrorHandler(null);
  setProjectsDir(null);
  await rm(tempDir, { recursive: true, force: true });
});

describe('Permission error retry', () => {
  test('handler is called on EACCES error', async () => {
    const handler = jest.fn().mockResolvedValue(false);
    setPermissionErrorHandler(handler);

    const filePath = join(tempDir, 'readonly', 'test.json');
    // Create the directory, then make it read-only
    const { mkdir } = await import('fs/promises');
    await mkdir(join(tempDir, 'readonly'));
    await chmod(join(tempDir, 'readonly'), 0o444);

    await expect(writeJsonFile(filePath, { key: 'value' })).rejects.toThrow();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].code).toMatch(/EACCES|EPERM/);

    // Restore permissions for cleanup
    await chmod(join(tempDir, 'readonly'), 0o755);
  });

  test('retry succeeds on second attempt when handler returns true', async () => {
    const handler = jest.fn().mockImplementation(async () => {
      // On first call, fix the permissions so retry works
      await chmod(join(tempDir, 'retrydir'), 0o755);
      return true;
    });
    setPermissionErrorHandler(handler);

    const { mkdir } = await import('fs/promises');
    await mkdir(join(tempDir, 'retrydir'));
    await chmod(join(tempDir, 'retrydir'), 0o444);

    const filePath = join(tempDir, 'retrydir', 'test.json');
    await writeJsonFile(filePath, { retried: true });

    expect(handler).toHaveBeenCalledTimes(1);
    // Verify the file was actually written
    const { readFile } = await import('fs/promises');
    const content = JSON.parse(await readFile(filePath, 'utf-8'));
    expect(content).toEqual({ retried: true });
  });

  test('error is re-thrown when handler returns false', async () => {
    const handler = jest.fn().mockResolvedValue(false);
    setPermissionErrorHandler(handler);

    const { mkdir } = await import('fs/promises');
    await mkdir(join(tempDir, 'noretry'));
    await chmod(join(tempDir, 'noretry'), 0o444);

    const filePath = join(tempDir, 'noretry', 'test.yml');
    await expect(writeYamlFile(filePath, 'key: value')).rejects.toThrow();
    expect(handler).toHaveBeenCalledTimes(1);

    await chmod(join(tempDir, 'noretry'), 0o755);
  });

  test('non-permission errors bypass handler entirely', async () => {
    const handler = jest.fn().mockResolvedValue(true);
    setPermissionErrorHandler(handler);

    // Try to read a non-existent file via writeJsonFile with an invalid JSON circular ref
    // Instead, we'll test by trying to write to a path where parent is a file, not a dir
    const { writeFile } = await import('fs/promises');
    await writeFile(join(tempDir, 'afile'), 'content');

    // Writing to afile/sub/test.json should fail with ENOTDIR, not EACCES
    const filePath = join(tempDir, 'afile', 'sub', 'test.json');
    await expect(writeJsonFile(filePath, { x: 1 })).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
  });

  test('errors thrown as before when no handler is set', async () => {
    // No handler set (default)
    const { mkdir } = await import('fs/promises');
    await mkdir(join(tempDir, 'nohandler'));
    await chmod(join(tempDir, 'nohandler'), 0o444);

    const filePath = join(tempDir, 'nohandler', 'test.txt');
    await expect(writeTextFile(filePath, 'hello')).rejects.toThrow();

    await chmod(join(tempDir, 'nohandler'), 0o755);
  });

  test('works with writeTextFile', async () => {
    const handler = jest.fn().mockImplementation(async () => {
      await chmod(join(tempDir, 'textdir'), 0o755);
      return true;
    });
    setPermissionErrorHandler(handler);

    const { mkdir } = await import('fs/promises');
    await mkdir(join(tempDir, 'textdir'));
    await chmod(join(tempDir, 'textdir'), 0o444);

    const filePath = join(tempDir, 'textdir', 'test.txt');
    await writeTextFile(filePath, 'hello world');

    expect(handler).toHaveBeenCalledTimes(1);

    const { readFile } = await import('fs/promises');
    const content = await readFile(filePath, 'utf-8');
    expect(content).toBe('hello world');
  });
});
