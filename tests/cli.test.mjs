import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { setProjectsDir } from '../src/io/fileSystem';
import { createProject } from '../src/commands/project';
import {
  getMainMenuChoices,
  getProjectMenuChoices,
  validateProjectName,
  validateProjectNameUnique,
  validateConfigDirectory,
  validateBaseUrl,
  MAIN_MENU_CHOICES,
  PROJECT_MENU_CHOICES
} from '../src/cli/prompts';
import { generateSlug } from '../src/utils/slug';

describe('CLI Prompts', () => {
  let tempDir;
  let tempConfigDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dcm-test-'));
    tempConfigDir = await mkdtemp(join(tmpdir(), 'dcm-config-'));
    setProjectsDir(tempDir);
  });

  afterEach(async () => {
    setProjectsDir(null);
    await rm(tempDir, { recursive: true, force: true });
    await rm(tempConfigDir, { recursive: true, force: true });
  });

  describe('Menu Generation', () => {
    test('getMainMenuChoices returns correct options', () => {
      const choices = getMainMenuChoices();

      expect(choices).toEqual(MAIN_MENU_CHOICES);
      expect(choices.length).toBe(3);

      const values = choices.map(c => c.value);
      expect(values).toContain('create');
      expect(values).toContain('load');
      expect(values).toContain('exit');
    });

    test('getProjectMenuChoices returns correct options', () => {
      const result = getProjectMenuChoices('My Test Project');

      expect(result.choices).toEqual(PROJECT_MENU_CHOICES);
      expect(result.choices.length).toBe(17);

      const values = result.choices.map(c => c.value);
      expect(values).toContain('sync');
      expect(values).toContain('list-entities');
      expect(values).toContain('list-entity-fields');
      expect(values).toContain('list-bundle-fields');
      expect(values).toContain('create-bundle');
      expect(values).toContain('create-field');
      expect(values).toContain('edit-field');
      expect(values).toContain('edit-form-display');
      expect(values).toContain('edit-project');
      expect(values).toContain('enable-modules');
      expect(values).toContain('admin-links');
      expect(values).toContain('report-entity');
      expect(values).toContain('report-project');
      expect(values).toContain('manage-roles');
      expect(values).toContain('manage-stories');
      expect(values).toContain('drush-sync');
      expect(values).toContain('back');
    });

    test('getProjectMenuChoices includes project name in message', () => {
      const result = getProjectMenuChoices('My Test Project');

      expect(result.message).toContain('My Test Project');
      expect(result.message).toBe('My Test Project - What would you like to do?');
    });
  });

  describe('Validation - Project Name', () => {
    test('validateProjectName rejects empty string', () => {
      const result = validateProjectName('');

      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
    });

    test('validateProjectName rejects whitespace only', () => {
      const result = validateProjectName('   ');

      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
    });

    test('validateProjectName rejects null', () => {
      const result = validateProjectName(null);

      expect(result).not.toBe(true);
    });

    test('validateProjectName rejects undefined', () => {
      const result = validateProjectName(undefined);

      expect(result).not.toBe(true);
    });

    test('validateProjectName accepts valid name', () => {
      const result = validateProjectName('My Project');

      expect(result).toBe(true);
    });

    test('validateProjectName accepts name with special characters', () => {
      const result = validateProjectName('My Project!');

      expect(result).toBe(true);
    });
  });

  describe('Validation - Project Name Unique', () => {
    test('validateProjectNameUnique rejects empty string', () => {
      const result = validateProjectNameUnique('');

      expect(result).not.toBe(true);
    });

    test('validateProjectNameUnique rejects existing project', async () => {
      // Create a config file
      await writeFile(join(tempConfigDir, 'test.yml'), 'test: true');

      // Create a project
      await createProject('Test Project', tempConfigDir);

      // Validate unique
      const result = validateProjectNameUnique('Test Project');

      expect(result).not.toBe(true);
      expect(result).toContain('already exists');
    });

    test('validateProjectNameUnique accepts unique name', () => {
      const result = validateProjectNameUnique('New Unique Project');

      expect(result).toBe(true);
    });
  });

  describe('Validation - Config Directory', () => {
    test('validateConfigDirectory rejects empty string', async () => {
      const result = await validateConfigDirectory('');

      expect(result).not.toBe(true);
      expect(typeof result).toBe('string');
    });

    test('validateConfigDirectory rejects null', async () => {
      const result = await validateConfigDirectory(null);

      expect(result).not.toBe(true);
    });

    test('validateConfigDirectory rejects non-existent path', async () => {
      const result = await validateConfigDirectory('/nonexistent/path');

      expect(result).not.toBe(true);
      expect(result).toContain('does not exist');
    });

    test('validateConfigDirectory rejects empty directory', async () => {
      // tempConfigDir is empty
      const result = await validateConfigDirectory(tempConfigDir);

      expect(result).not.toBe(true);
      expect(result).toContain('yml');
    });

    test('validateConfigDirectory rejects directory with only non-yml files', async () => {
      await writeFile(join(tempConfigDir, 'test.txt'), 'test');
      await writeFile(join(tempConfigDir, 'config.json'), '{}');

      const result = await validateConfigDirectory(tempConfigDir);

      expect(result).not.toBe(true);
      expect(result).toContain('yml');
    });

    test('validateConfigDirectory accepts valid config dir with yml files', async () => {
      await writeFile(join(tempConfigDir, 'node.type.page.yml'), 'name: Page');

      const result = await validateConfigDirectory(tempConfigDir);

      expect(result).toBe(true);
    });

    test('validateConfigDirectory accepts valid config dir with yaml files', async () => {
      await writeFile(join(tempConfigDir, 'config.yaml'), 'name: Config');

      const result = await validateConfigDirectory(tempConfigDir);

      expect(result).toBe(true);
    });
  });

  describe('Slug Generation', () => {
    test('generateSlug converts spaces to hyphens', () => {
      const result = generateSlug('My Project');

      expect(result).toBe('my-project');
    });

    test('generateSlug lowercases', () => {
      const result = generateSlug('MyProject');

      expect(result).toBe('myproject');
    });

    test('generateSlug removes special characters', () => {
      const result = generateSlug('My Project!');

      expect(result).toBe('my-project');
    });

    test('generateSlug handles multiple spaces', () => {
      const result = generateSlug('My   Test   Project');

      expect(result).toBe('my-test-project');
    });

    test('generateSlug trims leading/trailing hyphens', () => {
      const result = generateSlug('  My Project  ');

      expect(result).toBe('my-project');
    });
  });

  describe('Validation - Base URL', () => {
    test('validateBaseUrl accepts empty string', () => {
      const result = validateBaseUrl('');
      expect(result).toBe(true);
    });

    test('validateBaseUrl accepts null', () => {
      const result = validateBaseUrl(null);
      expect(result).toBe(true);
    });

    test('validateBaseUrl accepts valid http URL', () => {
      const result = validateBaseUrl('http://example.com');
      expect(result).toBe(true);
    });

    test('validateBaseUrl accepts valid https URL', () => {
      const result = validateBaseUrl('https://example.com');
      expect(result).toBe(true);
    });

    test('validateBaseUrl accepts URL with path', () => {
      const result = validateBaseUrl('https://example.com/path/to/page');
      expect(result).toBe(true);
    });

    test('validateBaseUrl rejects invalid URL', () => {
      const result = validateBaseUrl('not a url');
      expect(result).not.toBe(true);
      expect(result).toContain('valid URL');
    });

    test('validateBaseUrl rejects URL without protocol', () => {
      const result = validateBaseUrl('example.com');
      expect(result).not.toBe(true);
    });
  });
});
