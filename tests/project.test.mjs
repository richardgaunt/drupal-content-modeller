import { mkdtemp, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import pure utility functions
import { generateSlug, isValidProjectName } from '../src/utils/slug';
import { createProjectObject, getProjectSummary } from '../src/utils/project';

// Import I/O functions - use setProjectsDir for testing
import { setProjectsDir } from '../src/io/fileSystem';

// Import commands
import {
  createProject,
  loadProject,
  saveProject,
  listProjects,
  deleteProject,
  updateProject
} from '../src/commands/project';

// Import filesystem functions for testing
import { getProjectPath } from '../src/io/fileSystem';

describe('Slug Utilities (Pure)', () => {
  describe('generateSlug', () => {
    test('converts spaces to hyphens', () => {
      expect(generateSlug('My Project')).toBe('my-project');
    });

    test('lowercases the string', () => {
      expect(generateSlug('MyProject')).toBe('myproject');
    });

    test('removes special characters', () => {
      expect(generateSlug('My Project!')).toBe('my-project');
    });

    test('handles multiple spaces', () => {
      expect(generateSlug('My   Project')).toBe('my-project');
    });

    test('removes leading and trailing hyphens', () => {
      expect(generateSlug('  My Project  ')).toBe('my-project');
    });

    test('returns empty string for null', () => {
      expect(generateSlug(null)).toBe('');
    });

    test('returns empty string for undefined', () => {
      expect(generateSlug(undefined)).toBe('');
    });

    test('returns empty string for empty string', () => {
      expect(generateSlug('')).toBe('');
    });

    test('handles numbers', () => {
      expect(generateSlug('Project 123')).toBe('project-123');
    });
  });

  describe('isValidProjectName', () => {
    test('returns true for valid name', () => {
      expect(isValidProjectName('My Project')).toBe(true);
    });

    test('returns false for empty string', () => {
      expect(isValidProjectName('')).toBe(false);
    });

    test('returns false for whitespace only', () => {
      expect(isValidProjectName('   ')).toBe(false);
    });

    test('returns false for null', () => {
      expect(isValidProjectName(null)).toBe(false);
    });

    test('returns false for undefined', () => {
      expect(isValidProjectName(undefined)).toBe(false);
    });
  });
});

describe('Project Utilities (Pure)', () => {
  describe('createProjectObject', () => {
    test('creates valid project structure', () => {
      const project = createProjectObject('My Project', 'my-project', '/path/to/config');

      expect(project).toEqual({
        name: 'My Project',
        slug: 'my-project',
        configDirectory: '/path/to/config',
        baseUrl: '',
        lastSync: null,
        entities: {
          node: {},
          media: {},
          paragraph: {},
          taxonomy_term: {}
        }
      });
    });

    test('creates project with base URL', () => {
      const project = createProjectObject('My Project', 'my-project', '/path/to/config', 'https://example.com');

      expect(project.baseUrl).toBe('https://example.com');
    });
  });

  describe('getProjectSummary', () => {
    test('extracts summary from project', () => {
      const project = {
        name: 'My Project',
        slug: 'my-project',
        configDirectory: '/path/to/config',
        lastSync: '2025-01-15T10:30:00.000Z',
        entities: { node: { page: {} } }
      };

      const summary = getProjectSummary(project);

      expect(summary).toEqual({
        name: 'My Project',
        slug: 'my-project',
        lastSync: '2025-01-15T10:30:00.000Z'
      });
    });
  });
});

describe('Project Commands', () => {
  let tempDir;
  let tempConfigDir;

  beforeEach(async () => {
    // Create temp directories for testing
    tempDir = await mkdtemp(join(tmpdir(), 'dcm-test-'));
    tempConfigDir = await mkdtemp(join(tmpdir(), 'dcm-config-'));

    // Create a sample .yml file in config dir
    await writeFile(join(tempConfigDir, 'test.yml'), 'test: true');

    // Set projects directory to temp directory
    setProjectsDir(tempDir);
  });

  afterEach(async () => {
    // Reset projects directory
    setProjectsDir(null);

    // Cleanup temp directories
    await rm(tempDir, { recursive: true, force: true });
    await rm(tempConfigDir, { recursive: true, force: true });
  });

  describe('createProject', () => {
    test('creates valid project structure', async () => {
      const project = await createProject('My Project', tempConfigDir);

      expect(project.name).toBe('My Project');
      expect(project.slug).toBe('my-project');
      expect(project.configDirectory).toBe(tempConfigDir);
      expect(project.lastSync).toBeNull();
      expect(project.entities).toHaveProperty('node');
    });

    test('generates correct slug', async () => {
      const project = await createProject('My Test Project', tempConfigDir);
      expect(project.slug).toBe('my-test-project');
    });

    test('rejects empty name', async () => {
      await expect(createProject('', tempConfigDir)).rejects.toThrow('Project name cannot be empty');
    });

    test('rejects whitespace-only name', async () => {
      await expect(createProject('   ', tempConfigDir)).rejects.toThrow('Project name cannot be empty');
    });

    test('rejects duplicate slug', async () => {
      await createProject('My Project', tempConfigDir);
      await expect(createProject('My Project', tempConfigDir)).rejects.toThrow('already exists');
    });

    test('validates config directory exists', async () => {
      await expect(createProject('Test', '/nonexistent/path')).rejects.toThrow('does not exist');
    });

    test('validates config has yml files', async () => {
      const emptyConfigDir = await mkdtemp(join(tmpdir(), 'dcm-empty-'));
      try {
        await expect(createProject('Test', emptyConfigDir)).rejects.toThrow('no .yml files');
      } finally {
        await rm(emptyConfigDir, { recursive: true, force: true });
      }
    });
  });

  describe('loadProject', () => {
    test('returns project data', async () => {
      const created = await createProject('My Project', tempConfigDir);
      const loaded = await loadProject('my-project');

      expect(loaded).toEqual(created);
    });

    test('throws for missing project', async () => {
      await expect(loadProject('nonexistent')).rejects.toThrow('not found');
    });
  });

  describe('saveProject', () => {
    test('writes project.json', async () => {
      const project = await createProject('My Project', tempConfigDir);
      project.lastSync = '2025-01-15T10:30:00.000Z';

      await saveProject(project);

      const loaded = await loadProject('my-project');
      expect(loaded.lastSync).toBe('2025-01-15T10:30:00.000Z');
    });

    test('preserves all fields', async () => {
      const project = await createProject('My Project', tempConfigDir);
      project.entities.node = { page: { id: 'page', label: 'Page' } };
      project.customField = 'custom value';

      await saveProject(project);

      const loaded = await loadProject('my-project');
      expect(loaded.entities.node).toEqual({ page: { id: 'page', label: 'Page' } });
      expect(loaded.customField).toBe('custom value');
    });
  });

  describe('listProjects', () => {
    test('returns empty array when no projects', async () => {
      const projects = await listProjects();
      expect(projects).toEqual([]);
    });

    test('returns all projects', async () => {
      await createProject('Project One', tempConfigDir);
      await createProject('Project Two', tempConfigDir);

      const projects = await listProjects();

      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.slug).sort()).toEqual(['project-one', 'project-two']);
    });

    test('returns project summaries', async () => {
      await createProject('My Project', tempConfigDir);

      const projects = await listProjects();

      expect(projects[0]).toHaveProperty('name');
      expect(projects[0]).toHaveProperty('slug');
      expect(projects[0]).toHaveProperty('lastSync');
      expect(projects[0]).not.toHaveProperty('entities');
    });
  });

  describe('deleteProject', () => {
    test('removes project directory', async () => {
      await createProject('My Project', tempConfigDir);
      expect(existsSync(join(tempDir, 'my-project'))).toBe(true);

      const result = await deleteProject('my-project');

      expect(result).toBe(true);
      expect(existsSync(join(tempDir, 'my-project'))).toBe(false);
    });

    test('returns false for missing project', async () => {
      const result = await deleteProject('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('updateProject', () => {
    test('updates project name', async () => {
      const project = await createProject('My Project', tempConfigDir);

      const updated = await updateProject(project, {
        name: 'Updated Project',
        configDirectory: tempConfigDir,
        baseUrl: ''
      });

      expect(updated.name).toBe('Updated Project');
    });

    test('updates base URL', async () => {
      const project = await createProject('My Project', tempConfigDir);

      const updated = await updateProject(project, {
        name: 'My Project',
        configDirectory: tempConfigDir,
        baseUrl: 'https://example.com'
      });

      expect(updated.baseUrl).toBe('https://example.com');
    });

    test('updates config directory', async () => {
      const project = await createProject('My Project', tempConfigDir);
      const newConfigDir = await mkdtemp(join(tmpdir(), 'dcm-config2-'));
      await writeFile(join(newConfigDir, 'test.yml'), 'test: true');

      try {
        const updated = await updateProject(project, {
          name: 'My Project',
          configDirectory: newConfigDir,
          baseUrl: ''
        });

        expect(updated.configDirectory).toBe(newConfigDir);
      } finally {
        await rm(newConfigDir, { recursive: true, force: true });
      }
    });

    test('renames directory when name changes slug', async () => {
      const project = await createProject('My Project', tempConfigDir);
      expect(existsSync(getProjectPath('my-project'))).toBe(true);

      const updated = await updateProject(project, {
        name: 'New Name',
        configDirectory: tempConfigDir,
        baseUrl: ''
      });

      expect(updated.slug).toBe('new-name');
      expect(existsSync(getProjectPath('new-name'))).toBe(true);
      expect(existsSync(getProjectPath('my-project'))).toBe(false);
    });

    test('preserves slug when name change results in same slug', async () => {
      const project = await createProject('My Project', tempConfigDir);

      const updated = await updateProject(project, {
        name: 'My  Project',
        configDirectory: tempConfigDir,
        baseUrl: ''
      });

      expect(updated.slug).toBe('my-project');
    });

    test('throws for empty name', async () => {
      const project = await createProject('My Project', tempConfigDir);

      await expect(updateProject(project, {
        name: '',
        configDirectory: tempConfigDir,
        baseUrl: ''
      })).rejects.toThrow('Project name is required');
    });

    test('throws for non-existent config directory', async () => {
      const project = await createProject('My Project', tempConfigDir);

      await expect(updateProject(project, {
        name: 'My Project',
        configDirectory: '/nonexistent/path',
        baseUrl: ''
      })).rejects.toThrow('does not exist');
    });

    test('throws for slug conflict', async () => {
      await createProject('First Project', tempConfigDir);
      const second = await createProject('Second Project', tempConfigDir);

      await expect(updateProject(second, {
        name: 'First Project',
        configDirectory: tempConfigDir,
        baseUrl: ''
      })).rejects.toThrow('already exists');
    });
  });
});
