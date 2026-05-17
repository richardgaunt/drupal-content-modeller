import { mkdtemp, rm, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

// Import CLI command handlers
import { cmdProjectCreate } from '../src/cli/commands/projectCmds';

// Import pure utility functions
import { generateSlug, isValidProjectName } from '../src/utils/slug';
import { createProjectObject, getProjectSummary, projectMatchesCwd } from '../src/utils/project';

// Import I/O functions - use setProjectsDir for testing
import { setProjectsDir } from '../src/io/fileSystem';

// Import commands
import {
  createProject,
  loadProject,
  saveProject,
  listProjects,
  deleteProject,
  updateProject,
  registerProject
} from '../src/commands/project';

// Import filesystem functions for testing
import {
  getProjectPath,
  getReportsDir,
  getRegistryStubPath,
  getExternalProjectJsonPath
} from '../src/io/fileSystem';

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
        baseDirectory: '',
        baseUrl: '',
        drupalRoot: '',
        drushCommand: 'drush',
        theme: null,
        editableBaseTheme: false,
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

    test('creates project with baseDirectory via options', () => {
      const project = createProjectObject('My Project', 'my-project', '/path/to/config', '', {
        baseDirectory: '/repos/my-project'
      });

      expect(project.baseDirectory).toBe('/repos/my-project');
    });
  });

  describe('projectMatchesCwd', () => {
    test('matches when cwd equals baseDirectory', () => {
      const project = { baseDirectory: '/repos/my-project', configDirectory: '/repos/my-project/config/sync' };
      expect(projectMatchesCwd(project, '/repos/my-project')).toBe(true);
    });

    test('matches when cwd is inside baseDirectory', () => {
      const project = { baseDirectory: '/repos/my-project', configDirectory: '/repos/my-project/config/sync' };
      expect(projectMatchesCwd(project, '/repos/my-project/web/modules/custom')).toBe(true);
    });

    test('does not match a sibling directory with a prefix collision', () => {
      const project = { baseDirectory: '/repos/my-project', configDirectory: '' };
      expect(projectMatchesCwd(project, '/repos/my-project-other')).toBe(false);
    });

    test('falls back to configDirectory when baseDirectory is unset', () => {
      const project = { baseDirectory: '', configDirectory: '/repos/legacy/config/sync' };
      expect(projectMatchesCwd(project, '/repos/legacy/config/sync/sub')).toBe(true);
    });

    test('returns false when both roots are unset', () => {
      const project = { baseDirectory: '', configDirectory: '' };
      expect(projectMatchesCwd(project, '/anywhere')).toBe(false);
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

describe('File System Utilities', () => {
  describe('getReportsDir', () => {
    test('returns reports subdirectory of project path', () => {
      const reportsDir = getReportsDir('my-project');
      const projectPath = getProjectPath('my-project');

      expect(reportsDir).toBe(`${projectPath}/reports`);
    });
  });
});

describe('Project Commands', () => {
  let tempDir;
  let tempConfigDir;
  let tempBaseDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dcm-test-'));
    tempConfigDir = await mkdtemp(join(tmpdir(), 'dcm-config-'));
    tempBaseDir = await mkdtemp(join(tmpdir(), 'dcm-repo-'));
    await writeFile(join(tempConfigDir, 'test.yml'), 'test: true');
    setProjectsDir(tempDir);
  });

  afterEach(async () => {
    setProjectsDir(null);
    await rm(tempDir, { recursive: true, force: true });
    await rm(tempConfigDir, { recursive: true, force: true });
    await rm(tempBaseDir, { recursive: true, force: true });
  });

  describe('createProject', () => {
    test('creates valid project structure', async () => {
      const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });

      expect(project.name).toBe('My Project');
      expect(project.slug).toBe('my-project');
      expect(project.configDirectory).toBe(tempConfigDir);
      expect(project.lastSync).toBeNull();
      expect(project.entities).toHaveProperty('node');
    });

    test('generates correct slug', async () => {
      const project = await createProject('My Test Project', tempConfigDir, '', { baseDirectory: tempBaseDir });
      expect(project.slug).toBe('my-test-project');
    });

    test('rejects empty name', async () => {
      await expect(createProject('', tempConfigDir)).rejects.toThrow('Project name cannot be empty');
    });

    test('rejects whitespace-only name', async () => {
      await expect(createProject('   ', tempConfigDir)).rejects.toThrow('Project name cannot be empty');
    });

    test('rejects duplicate slug', async () => {
      await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });
      const otherBase = await mkdtemp(join(tmpdir(), 'dcm-dup-'));
      try {
        await expect(createProject('My Project', tempConfigDir, '', { baseDirectory: otherBase })).rejects.toThrow('already exists');
      } finally {
        await rm(otherBase, { recursive: true, force: true });
      }
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

    test('rejects when no base directory is given', async () => {
      await expect(createProject('No Base', tempConfigDir)).rejects.toThrow(
        'A save directory is required'
      );
    });
  });

  describe('loadProject', () => {
    test('returns project data', async () => {
      const created = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });
      const loaded = await loadProject('my-project');

      expect(loaded).toEqual(created);
    });

    test('throws actionable error for unregistered project', async () => {
      await expect(loadProject('nonexistent')).rejects.toThrow('not registered');
    });
  });

  describe('saveProject', () => {
    test('writes project.json', async () => {
      const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });
      project.lastSync = '2025-01-15T10:30:00.000Z';

      await saveProject(project);

      const loaded = await loadProject('my-project');
      expect(loaded.lastSync).toBe('2025-01-15T10:30:00.000Z');
    });

    test('preserves all fields', async () => {
      const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });
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
      const baseA = await mkdtemp(join(tmpdir(), 'dcm-repo-a-'));
      const baseB = await mkdtemp(join(tmpdir(), 'dcm-repo-b-'));
      try {
        await createProject('Project One', tempConfigDir, '', { baseDirectory: baseA });
        await createProject('Project Two', tempConfigDir, '', { baseDirectory: baseB });

        const projects = await listProjects();

        expect(projects).toHaveLength(2);
        expect(projects.map(p => p.slug).sort()).toEqual(['project-one', 'project-two']);
      } finally {
        await rm(baseA, { recursive: true, force: true });
        await rm(baseB, { recursive: true, force: true });
      }
    });

    test('returns project summaries', async () => {
      await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });

      const projects = await listProjects();

      expect(projects[0]).toHaveProperty('name');
      expect(projects[0]).toHaveProperty('slug');
      expect(projects[0]).toHaveProperty('lastSync');
      expect(projects[0]).not.toHaveProperty('entities');
    });
  });

  describe('deleteProject', () => {
    test('removes project directory', async () => {
      await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });
      expect(existsSync(join(tempDir, 'my-project'))).toBe(true);

      const result = await deleteProject('my-project');

      expect(result.deleted).toBe(true);
      expect(result.externalConfigPath).toBe(getExternalProjectJsonPath(tempBaseDir));
      expect(existsSync(join(tempDir, 'my-project'))).toBe(false);
    });

    test('returns false for missing project', async () => {
      const result = await deleteProject('nonexistent');
      expect(result.deleted).toBe(false);
    });
  });

  describe('updateProject', () => {
    test('updates project name', async () => {
      const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });

      const updated = await updateProject(project, {
        name: 'Updated Project',
        configDirectory: tempConfigDir,
        baseUrl: ''
      });

      expect(updated.name).toBe('Updated Project');
    });

    test('updates base URL', async () => {
      const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });

      const updated = await updateProject(project, {
        name: 'My Project',
        configDirectory: tempConfigDir,
        baseUrl: 'https://example.com'
      });

      expect(updated.baseUrl).toBe('https://example.com');
    });

    test('updates config directory', async () => {
      const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });
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
      const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });
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
      const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });

      const updated = await updateProject(project, {
        name: 'My  Project',
        configDirectory: tempConfigDir,
        baseUrl: ''
      });

      expect(updated.slug).toBe('my-project');
    });

    test('throws for empty name', async () => {
      const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });

      await expect(updateProject(project, {
        name: '',
        configDirectory: tempConfigDir,
        baseUrl: ''
      })).rejects.toThrow('Project name is required');
    });

    test('throws for non-existent config directory', async () => {
      const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });

      await expect(updateProject(project, {
        name: 'My Project',
        configDirectory: '/nonexistent/path',
        baseUrl: ''
      })).rejects.toThrow('does not exist');
    });

    test('throws for slug conflict', async () => {
      const baseA = await mkdtemp(join(tmpdir(), 'dcm-repo-a-'));
      const baseB = await mkdtemp(join(tmpdir(), 'dcm-repo-b-'));
      try {
        await createProject('First Project', tempConfigDir, '', { baseDirectory: baseA });
        const second = await createProject('Second Project', tempConfigDir, '', { baseDirectory: baseB });

        await expect(updateProject(second, {
          name: 'First Project',
          configDirectory: tempConfigDir,
          baseUrl: ''
        })).rejects.toThrow('already exists');
      } finally {
        await rm(baseA, { recursive: true, force: true });
        await rm(baseB, { recursive: true, force: true });
      }
    });
  });

  describe('externalized projects (.dcm/project.json)', () => {
    test('create writes stub + external config when baseDirectory is set', async () => {
      const project = await createProject('Repo Project', tempConfigDir, '', {
        baseDirectory: tempBaseDir
      });

      expect(project.slug).toBe('repo-project');
      expect(existsSync(getRegistryStubPath('repo-project'))).toBe(true);
      expect(existsSync(getExternalProjectJsonPath(tempBaseDir))).toBe(true);
      // Legacy in-dcm project.json should NOT exist for externalized projects
      expect(existsSync(join(getProjectPath('repo-project'), 'project.json'))).toBe(false);
    });

    test('load resolves externalized project via stub', async () => {
      await createProject('Repo Project', tempConfigDir, '', {
        baseDirectory: tempBaseDir
      });

      const loaded = await loadProject('repo-project');
      expect(loaded.name).toBe('Repo Project');
      expect(loaded.baseDirectory).toBe(tempBaseDir);
    });

    test('loadProject reports missing external config when stub points at a vanished repo', async () => {
      await createProject('Vanish Repo', tempConfigDir, '', { baseDirectory: tempBaseDir });
      // Simulate the repo (and its .dcm/project.json) being deleted while the stub remains
      await rm(getExternalProjectJsonPath(tempBaseDir), { force: true });
      await expect(loadProject('vanish-repo')).rejects.toThrow('missing its config');
    });

    test('save writes back to external config', async () => {
      await createProject('Repo Project', tempConfigDir, '', {
        baseDirectory: tempBaseDir
      });
      const project = await loadProject('repo-project');
      project.lastSync = '2026-04-21T00:00:00.000Z';
      await saveProject(project);

      const reloaded = await loadProject('repo-project');
      expect(reloaded.lastSync).toBe('2026-04-21T00:00:00.000Z');
    });

    test('rejects when external config already exists', async () => {
      await createProject('Repo Project', tempConfigDir, '', {
        baseDirectory: tempBaseDir
      });

      await expect(
        createProject('Other Name', tempConfigDir, '', { baseDirectory: tempBaseDir })
      ).rejects.toThrow('already exists');
    });

    test('rejects when baseDirectory does not exist', async () => {
      await expect(
        createProject('Ghost', tempConfigDir, '', { baseDirectory: '/nonexistent/repo' })
      ).rejects.toThrow('Base directory does not exist');
    });

    test('delete removes stub, leaves external config in place', async () => {
      await createProject('Repo Project', tempConfigDir, '', {
        baseDirectory: tempBaseDir
      });
      const externalPath = getExternalProjectJsonPath(tempBaseDir);
      expect(existsSync(externalPath)).toBe(true);

      const result = await deleteProject('repo-project');

      expect(result.deleted).toBe(true);
      expect(result.externalConfigPath).toBe(externalPath);
      expect(existsSync(getRegistryStubPath('repo-project'))).toBe(false);
      expect(existsSync(externalPath)).toBe(true);
    });

    test('registerProject picks up an existing .dcm/project.json', async () => {
      // Simulate a teammate who cloned the repo: create, then wipe DCM-side stub.
      await createProject('Repo Project', tempConfigDir, '', {
        baseDirectory: tempBaseDir
      });
      await rm(getProjectPath('repo-project'), { recursive: true, force: true });

      const project = await registerProject(tempBaseDir);

      expect(project.slug).toBe('repo-project');
      expect(existsSync(getRegistryStubPath('repo-project'))).toBe(true);

      // And loadProject works after registration
      const loaded = await loadProject('repo-project');
      expect(loaded.name).toBe('Repo Project');
    });

    test('registerProject is idempotent for the same baseDirectory', async () => {
      await createProject('Repo Project', tempConfigDir, '', {
        baseDirectory: tempBaseDir
      });
      const again = await registerProject(tempBaseDir);
      expect(again.slug).toBe('repo-project');
    });

    test('registerProject rejects when no external config exists', async () => {
      await expect(registerProject(tempBaseDir)).rejects.toThrow('No DCM project config');
    });

    test('rename still works for externalized projects', async () => {
      const project = await createProject('Repo Project', tempConfigDir, '', {
        baseDirectory: tempBaseDir
      });

      const updated = await updateProject(project, {
        name: 'Renamed Repo',
        configDirectory: tempConfigDir,
        baseUrl: ''
      });

      expect(updated.slug).toBe('renamed-repo');
      expect(existsSync(getRegistryStubPath('renamed-repo'))).toBe(true);
      expect(existsSync(getRegistryStubPath('repo-project'))).toBe(false);

      const loaded = await loadProject('renamed-repo');
      expect(loaded.name).toBe('Renamed Repo');
    });

    test('update rejects changing baseDirectory on externalized project', async () => {
      const project = await createProject('Repo Project', tempConfigDir, '', {
        baseDirectory: tempBaseDir
      });
      const otherDir = await mkdtemp(join(tmpdir(), 'dcm-other-repo-'));
      try {
        await expect(updateProject(project, {
          name: 'Repo Project',
          configDirectory: tempConfigDir,
          baseUrl: '',
          baseDirectory: otherDir
        })).rejects.toThrow('not supported');
      } finally {
        await rm(otherDir, { recursive: true, force: true });
      }
    });

    test('loadProject rejects an unregistered slug with a clear message', async () => {
      await expect(loadProject('never-registered')).rejects.toThrow('not registered');
    });
  });

  describe('cmdProjectCreate (command path)', () => {
    test('defaults base dir to cwd when --base-dir omitted', async () => {
      const repo = await mkdtemp(join(tmpdir(), 'dcm-cwd-'));
      const realCwd = process.cwd();
      process.chdir(repo);
      try {
        await cmdProjectCreate({
          name: 'Cwd Project',
          configPath: tempConfigDir,
          json: true
        });
        expect(existsSync(getExternalProjectJsonPath(repo))).toBe(true);
        expect(existsSync(getRegistryStubPath('cwd-project'))).toBe(true);
      } finally {
        process.chdir(realCwd);
        await rm(repo, { recursive: true, force: true });
      }
    });
  });
});
