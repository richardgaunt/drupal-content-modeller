import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

describe('Project Setup', () => {
  describe('package.json structure', () => {
    let packageJson;

    beforeAll(() => {
      const packagePath = join(projectRoot, 'package.json');
      packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    });

    test('has correct project name', () => {
      expect(packageJson.name).toBe('drupal-content-modeller');
    });

    test('has ESM module type enabled', () => {
      expect(packageJson.type).toBe('module');
    });

    test('has start script', () => {
      expect(packageJson.scripts.start).toBeDefined();
      expect(packageJson.scripts.start).toContain('index.mjs');
    });

    test('has test script', () => {
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts.test).toContain('jest');
    });

    test('has required dependencies', () => {
      expect(packageJson.dependencies).toHaveProperty('chalk');
      expect(packageJson.dependencies).toHaveProperty('js-yaml');
      expect(packageJson.dependencies).toHaveProperty('@inquirer/prompts');
    });

    test('has jest as dev dependency', () => {
      expect(packageJson.devDependencies).toHaveProperty('jest');
    });
  });

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

  describe('gitignore', () => {
    let gitignoreContent;

    beforeAll(() => {
      const gitignorePath = join(projectRoot, '.gitignore');
      gitignoreContent = readFileSync(gitignorePath, 'utf-8');
    });

    test('ignores node_modules/', () => {
      expect(gitignoreContent).toContain('node_modules/');
    });

    test('ignores projects/', () => {
      expect(gitignoreContent).toContain('projects/');
    });
  });
});
