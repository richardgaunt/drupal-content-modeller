/**
 * Role Commands Tests
 * Tests for pure functions in role.js
 */

import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getRoleChoices,
  getPermissionChoices,
  parseShortPermissions
} from '../src/commands/role.js';
import {
  setProjectsDir,
  writeRegistryStub,
  writeJsonFile,
  getExternalProjectJsonPath
} from '../src/io/fileSystem.js';
import { cmdRoleView } from '../src/cli/commands/roleCmds.js';
import { GLOBAL_BUCKET_KEY } from '../src/constants/permissions.js';

describe('Role Commands', () => {
  describe('getRoleChoices', () => {
    test('returns empty array for no roles', () => {
      expect(getRoleChoices([])).toEqual([]);
    });

    test('transforms roles to choices', () => {
      const roles = [
        { id: 'editor', label: 'Content Editor', isAdmin: false },
        { id: 'admin', label: 'Administrator', isAdmin: true }
      ];

      const result = getRoleChoices(roles);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ value: 'editor', name: 'Content Editor' });
      expect(result[1]).toEqual({ value: 'admin', name: 'Administrator (admin)' });
    });

    test('adds (admin) suffix for admin roles', () => {
      const roles = [{ id: 'super', label: 'Super Admin', isAdmin: true }];

      const result = getRoleChoices(roles);

      expect(result[0].name).toBe('Super Admin (admin)');
    });

    test('does not add suffix for non-admin roles', () => {
      const roles = [{ id: 'user', label: 'Basic User', isAdmin: false }];

      const result = getRoleChoices(roles);

      expect(result[0].name).toBe('Basic User');
    });
  });

  describe('getPermissionChoices', () => {
    test('returns permission choices for node bundle', () => {
      const result = getPermissionChoices('node', 'article', []);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('checked');
    });

    test('marks current permissions as checked', () => {
      const currentPermissions = ['create article content', 'edit own article content'];

      const result = getPermissionChoices('node', 'article', currentPermissions);

      const createPerm = result.find(p => p.value === 'create article content');
      const editOwnPerm = result.find(p => p.value === 'edit own article content');
      const deleteAnyPerm = result.find(p => p.value === 'delete any article content');

      expect(createPerm.checked).toBe(true);
      expect(editOwnPerm.checked).toBe(true);
      expect(deleteAnyPerm.checked).toBe(false);
    });

    test('works with empty current permissions', () => {
      const result = getPermissionChoices('node', 'article');

      expect(result.every(p => p.checked === false)).toBe(true);
    });

    test('returns choices for media bundles', () => {
      const result = getPermissionChoices('media', 'image', []);

      expect(result.length).toBeGreaterThan(0);
      const createPerm = result.find(p => p.value.includes('create'));
      expect(createPerm).toBeDefined();
    });

    test('returns choices for taxonomy bundles', () => {
      const result = getPermissionChoices('taxonomy_term', 'tags', []);

      expect(result.length).toBeGreaterThan(0);
      const createPerm = result.find(p => p.value.includes('create'));
      expect(createPerm).toBeDefined();
    });
  });

  describe('parseShortPermissions', () => {
    test('parses "all" to all bundle permissions', () => {
      const result = parseShortPermissions('node', 'article', ['all']);

      expect(result).toContain('create article content');
      expect(result).toContain('edit own article content');
      expect(result).toContain('edit any article content');
      expect(result).toContain('delete own article content');
      expect(result).toContain('delete any article content');
    });

    test('parses single short name', () => {
      const result = parseShortPermissions('node', 'article', ['create']);

      expect(result).toEqual(['create article content']);
    });

    test('parses multiple short names', () => {
      const result = parseShortPermissions('node', 'article', ['create', 'edit_own', 'delete_own']);

      expect(result).toContain('create article content');
      expect(result).toContain('edit own article content');
      expect(result).toContain('delete own article content');
      expect(result).not.toContain('edit any article content');
    });

    test('ignores invalid short names', () => {
      const result = parseShortPermissions('node', 'article', ['create', 'invalid_perm']);

      expect(result).toEqual(['create article content']);
    });

    test('works with media entity type', () => {
      const result = parseShortPermissions('media', 'image', ['create', 'edit_own']);

      expect(result).toContain('create image media');
      expect(result).toContain('edit own image media');
    });

    test('works with taxonomy_term entity type', () => {
      const result = parseShortPermissions('taxonomy_term', 'tags', ['create', 'edit']);

      expect(result).toContain('create terms in tags');
      expect(result).toContain('edit terms in tags');
    });

    test('returns empty array for empty input', () => {
      const result = parseShortPermissions('node', 'article', []);

      expect(result).toEqual([]);
    });
  });
});

describe('cmdRoleView — global perms', () => {
  let projectsDir;
  let repoDir;
  let logSpy;
  let errSpy;
  let exitSpy;

  beforeEach(async () => {
    projectsDir = await mkdtemp(join(tmpdir(), 'role-view-pdir-'));
    repoDir = await mkdtemp(join(tmpdir(), 'role-view-repo-'));
    setProjectsDir(projectsDir);
    await writeJsonFile(getExternalProjectJsonPath(repoDir), {
      name: 'rv-site', slug: 'rv-site', configDirectory: repoDir, baseDirectory: repoDir,
      baseUrl: '', drupalRoot: '', drushCommand: 'drush',
      theme: null, editableBaseTheme: false, lastSync: null,
      entities: { node: { article: { label: 'Article' } }, media: {}, paragraph: {}, taxonomy_term: {} }
    });
    await writeRegistryStub('rv-site', { slug: 'rv-site', baseDirectory: repoDir, createdAt: new Date().toISOString() });
    await writeFile(join(repoDir, 'user.role.editor.yml'), [
      'id: editor',
      'label: Editor',
      'weight: 0',
      'is_admin: false',
      'permissions:',
      "  - 'create article content'",
      "  - 'edit any article content'",
      "  - 'access content'",
      "  - 'view latest version'",
      "  - 'administer nodes'",
      'dependencies: {}',
      ''
    ].join('\n'));
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

  test('does not render a _global content bucket and keeps global perms under Other', async () => {
    await cmdRoleView({ project: 'rv-site', role: 'editor' });

    expect(errSpy).not.toHaveBeenCalled();
    const out = logSpy.mock.calls.map(c => c.join(' ')).join('\n');

    // Real bundle still shown under Content Permissions
    expect(out).toContain('node > article:');
    // The reserved bucket key must never surface as a content "bundle"
    expect(out).not.toContain(GLOBAL_BUCKET_KEY);
    // Global perms fall through to Other Permissions (consistent with getRoleOtherPermissions)
    const otherIdx = out.indexOf('Other Permissions:');
    expect(otherIdx).toBeGreaterThan(-1);
    const otherSection = out.slice(otherIdx);
    expect(otherSection).toContain('access content');
    expect(otherSection).toContain('view latest version');
    expect(otherSection).toContain('administer nodes');
  });

  test('global-only role: no crash, no empty Content Permissions header', async () => {
    await writeFile(join(repoDir, 'user.role.reader.yml'), [
      'id: reader',
      'label: Reader',
      'weight: 0',
      'is_admin: false',
      'permissions:',
      "  - 'access content'",
      "  - 'view latest version'",
      'dependencies: {}',
      ''
    ].join('\n'));

    await cmdRoleView({ project: 'rv-site', role: 'reader' });

    expect(errSpy).not.toHaveBeenCalled();
    const out = logSpy.mock.calls.map(c => c.join(' ')).join('\n');

    // No bundle perms → the Content Permissions header must not appear at all
    expect(out).not.toContain('Content Permissions:');
    expect(out).not.toContain(GLOBAL_BUCKET_KEY);
    // Globals still surface under Other Permissions
    const otherIdx = out.indexOf('Other Permissions:');
    expect(otherIdx).toBeGreaterThan(-1);
    const otherSection = out.slice(otherIdx);
    expect(otherSection).toContain('access content');
    expect(otherSection).toContain('view latest version');
  });
});

describe('handleRemoveBundlePermissions — global-only role', () => {
  test('reports nothing to remove instead of throwing', async () => {
    const { handleRemoveBundlePermissions } = await import('../src/cli/menus/roleMenus.js');
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    const globalOnlyRole = {
      id: 'reader',
      label: 'Reader',
      isAdmin: false,
      permissions: ['access content', 'view latest version'],
      dependencies: {}
    };

    // project is `{}` because the empty-guard returns before project is used.
    let result;
    await expect(
      (async () => { result = await handleRemoveBundlePermissions({}, globalOnlyRole); })()
    ).resolves.not.toThrow();

    expect(result).toBeNull();
    const out = logSpy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(out).toContain('No bundle permissions to remove.');

    jest.restoreAllMocks();
  });
});
