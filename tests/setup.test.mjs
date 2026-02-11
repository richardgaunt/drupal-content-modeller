import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

describe('Project Setup', () => {
  describe('directory structure', () => {
    test('src/ directory exists', () => {
      expect(existsSync(join(projectRoot, 'src'))).toBe(true);
    });

    test('projects/ directory exists', () => {
      expect(existsSync(join(projectRoot, 'projects'))).toBe(true);
    });

    test('src/cli/ directory exists', () => {
      expect(existsSync(join(projectRoot, 'src', 'cli'))).toBe(true);
    });

    test('src/commands/ directory exists', () => {
      expect(existsSync(join(projectRoot, 'src', 'commands'))).toBe(true);
    });

    test('src/parsers/ directory exists', () => {
      expect(existsSync(join(projectRoot, 'src', 'parsers'))).toBe(true);
    });

    test('src/generators/ directory exists', () => {
      expect(existsSync(join(projectRoot, 'src', 'generators'))).toBe(true);
    });

    test('src/utils/ directory exists', () => {
      expect(existsSync(join(projectRoot, 'src', 'utils'))).toBe(true);
    });

    test('src/io/ directory exists', () => {
      expect(existsSync(join(projectRoot, 'src', 'io'))).toBe(true);
    });
  });
});
