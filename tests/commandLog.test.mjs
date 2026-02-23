import { mkdirSync, rmSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { appendLog, readLog } from '../src/io/commandLog.js';
import { setProjectsDir, getLogPath } from '../src/io/fileSystem.js';

const testDir = join(tmpdir(), 'dcm-log-test-' + Date.now());
const testSlug = 'log-test';

describe('Command Log', () => {
  beforeAll(() => {
    mkdirSync(join(testDir, testSlug), { recursive: true });
    setProjectsDir(testDir);
  });

  afterAll(() => {
    setProjectsDir(null);
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('getLogPath', () => {
    it('returns path to log.jsonl in project directory', () => {
      const logPath = getLogPath(testSlug);
      expect(logPath).toContain(testSlug);
      expect(logPath).toMatch(/log\.jsonl$/);
    });
  });

  describe('appendLog', () => {
    it('creates log file and appends entry', () => {
      appendLog(testSlug, { cli: 'dcm bundle create -p test -e node -l "Page"', success: true });

      const logPath = getLogPath(testSlug);
      expect(existsSync(logPath)).toBe(true);

      const content = readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(1);

      const entry = JSON.parse(lines[0]);
      expect(entry.cli).toBe('dcm bundle create -p test -e node -l "Page"');
      expect(entry.success).toBe(true);
      expect(entry.timestamp).toBeDefined();
    });

    it('appends multiple entries', () => {
      appendLog(testSlug, { cli: 'dcm field create -p test -e node -b page -t string -l "Subtitle"', success: true });
      appendLog(testSlug, { cli: 'dcm field create -p test -e node -b page -t invalid', success: false, error: 'Invalid field type' });

      const logPath = getLogPath(testSlug);
      const content = readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      expect(lines).toHaveLength(3);
    });

    it('includes error field on failure', () => {
      const logPath = getLogPath(testSlug);
      const content = readFileSync(logPath, 'utf-8');
      const lines = content.trim().split('\n');
      const lastEntry = JSON.parse(lines[lines.length - 1]);

      expect(lastEntry.success).toBe(false);
      expect(lastEntry.error).toBe('Invalid field type');
    });
  });

  describe('readLog', () => {
    it('returns entries in reverse chronological order', () => {
      const entries = readLog(testSlug);
      expect(entries.length).toBe(3);
      // Most recent first
      expect(entries[0].success).toBe(false);
      expect(entries[2].cli).toContain('bundle create');
    });

    it('respects limit option', () => {
      const entries = readLog(testSlug, { limit: 2 });
      expect(entries).toHaveLength(2);
    });

    it('returns empty array for non-existent log', () => {
      const entries = readLog('non-existent-project');
      expect(entries).toEqual([]);
    });
  });
});
