/**
 * Tests for role parser
 */

import {
  getRoleFilename,
  extractRoleIdFromFilename,
  isRoleFile,
  parseRole,
  generateRoleMachineName,
  validateRoleMachineName,
  getRolePermissionsForBundle,
  getRoleContentPermissions,
  getRoleOtherPermissions,
  addPermissionsToRole,
  removePermissionsFromRole,
  setRoleBundlePermissions,
  getRoleSummary
} from '../src/parsers/roleParser.js';

describe('Role Parser - File Functions', () => {
  describe('getRoleFilename', () => {
    it('returns correct filename', () => {
      expect(getRoleFilename('content_editor')).toBe('user.role.content_editor.yml');
    });

    it('handles underscores', () => {
      expect(getRoleFilename('site_admin')).toBe('user.role.site_admin.yml');
    });
  });

  describe('extractRoleIdFromFilename', () => {
    it('extracts role ID', () => {
      expect(extractRoleIdFromFilename('user.role.content_editor.yml')).toBe('content_editor');
    });

    it('returns null for non-role file', () => {
      expect(extractRoleIdFromFilename('node.type.article.yml')).toBeNull();
    });

    it('returns null for invalid format', () => {
      expect(extractRoleIdFromFilename('user.role.yml')).toBeNull();
    });
  });

  describe('isRoleFile', () => {
    it('returns true for role files', () => {
      expect(isRoleFile('user.role.content_editor.yml')).toBe(true);
      expect(isRoleFile('user.role.admin.yml')).toBe(true);
    });

    it('returns false for non-role files', () => {
      expect(isRoleFile('node.type.article.yml')).toBe(false);
      expect(isRoleFile('user.role.yml')).toBe(false);
    });
  });
});

describe('Role Parser - Parse Functions', () => {
  describe('parseRole', () => {
    it('parses valid role config', () => {
      const config = {
        id: 'content_editor',
        label: 'Content Editor',
        weight: 5,
        is_admin: false,
        permissions: ['create article content', 'edit own article content'],
        dependencies: {
          config: ['node.type.article'],
          module: ['node']
        }
      };

      const role = parseRole(config);
      expect(role.id).toBe('content_editor');
      expect(role.label).toBe('Content Editor');
      expect(role.weight).toBe(5);
      expect(role.isAdmin).toBe(false);
      expect(role.permissions).toEqual(['create article content', 'edit own article content']);
      expect(role.dependencies.config).toEqual(['node.type.article']);
    });

    it('handles missing optional fields', () => {
      const config = {
        id: 'basic_role'
      };

      const role = parseRole(config);
      expect(role.id).toBe('basic_role');
      expect(role.label).toBe('basic_role');
      expect(role.weight).toBe(0);
      expect(role.isAdmin).toBe(false);
      expect(role.permissions).toEqual([]);
    });

    it('returns null for null config', () => {
      expect(parseRole(null)).toBeNull();
    });

    it('returns null for config without id', () => {
      expect(parseRole({ label: 'Test' })).toBeNull();
    });

    it('preserves all dependency types including enforced', () => {
      const config = {
        id: 'test_role',
        dependencies: {
          config: ['node.type.article'],
          module: ['node'],
          enforced: {
            module: ['my_custom_module']
          }
        }
      };

      const role = parseRole(config);
      expect(role.dependencies.config).toEqual(['node.type.article']);
      expect(role.dependencies.module).toEqual(['node']);
      expect(role.dependencies.enforced).toEqual({ module: ['my_custom_module'] });
    });
  });

  describe('generateRoleMachineName', () => {
    it('converts label to machine name', () => {
      expect(generateRoleMachineName('Content Editor')).toBe('content_editor');
    });

    it('removes special characters', () => {
      expect(generateRoleMachineName("Site Admin's Role!")).toBe('site_admin_s_role');
    });

    it('handles multiple spaces', () => {
      expect(generateRoleMachineName('My   Special   Role')).toBe('my_special_role');
    });

    it('returns empty for null', () => {
      expect(generateRoleMachineName(null)).toBe('');
    });

    it('truncates to 32 characters', () => {
      const longName = 'This is a very long role name that exceeds the limit';
      expect(generateRoleMachineName(longName).length).toBeLessThanOrEqual(32);
    });
  });

  describe('validateRoleMachineName', () => {
    it('accepts valid name', () => {
      expect(validateRoleMachineName('content_editor', [])).toBe(true);
    });

    it('rejects empty name', () => {
      expect(validateRoleMachineName('', [])).toBe('Role machine name is required');
    });

    it('rejects name starting with number', () => {
      expect(validateRoleMachineName('1role', [])).toContain('must start with a letter');
    });

    it('rejects uppercase', () => {
      expect(validateRoleMachineName('ContentEditor', [])).toContain('lowercase');
    });

    it('rejects duplicate', () => {
      expect(validateRoleMachineName('editor', ['editor'])).toContain('already exists');
    });

    it('rejects reserved names', () => {
      expect(validateRoleMachineName('administrator', [])).toContain('reserved');
      expect(validateRoleMachineName('anonymous', [])).toContain('reserved');
      expect(validateRoleMachineName('authenticated', [])).toContain('reserved');
    });

    it('rejects names over 32 characters', () => {
      const longName = 'this_is_a_very_long_role_machine_name';
      expect(validateRoleMachineName(longName, [])).toContain('32 characters');
    });
  });
});

describe('Role Parser - Permission Functions', () => {
  const testRole = {
    id: 'test_role',
    label: 'Test Role',
    permissions: [
      'create article content',
      'edit own article content',
      'create page content',
      'create image media',
      'access content',
      'view published content'
    ]
  };

  describe('getRolePermissionsForBundle', () => {
    it('returns permissions for bundle', () => {
      const perms = getRolePermissionsForBundle(testRole, 'node', 'article');
      expect(perms).toEqual(['create article content', 'edit own article content']);
    });

    it('returns empty for different bundle', () => {
      const perms = getRolePermissionsForBundle(testRole, 'node', 'news');
      expect(perms).toEqual([]);
    });

    it('returns empty for null role', () => {
      const perms = getRolePermissionsForBundle(null, 'node', 'article');
      expect(perms).toEqual([]);
    });
  });

  describe('getRoleContentPermissions', () => {
    it('groups content permissions', () => {
      const grouped = getRoleContentPermissions(testRole);
      expect(grouped.node).toBeDefined();
      expect(grouped.node.article).toBeDefined();
      expect(grouped.media.image).toBeDefined();
    });
  });

  describe('getRoleOtherPermissions', () => {
    it('returns non-content permissions', () => {
      const other = getRoleOtherPermissions(testRole);
      expect(other).toContain('access content');
      expect(other).toContain('view published content');
      expect(other).not.toContain('create article content');
    });
  });

  describe('addPermissionsToRole', () => {
    it('adds permissions', () => {
      const role = { id: 'test', permissions: ['perm1'] };
      const updated = addPermissionsToRole(role, ['perm2', 'perm3']);
      expect(updated.permissions).toContain('perm1');
      expect(updated.permissions).toContain('perm2');
      expect(updated.permissions).toContain('perm3');
    });

    it('does not duplicate permissions', () => {
      const role = { id: 'test', permissions: ['perm1', 'perm2'] };
      const updated = addPermissionsToRole(role, ['perm1', 'perm3']);
      expect(updated.permissions.filter(p => p === 'perm1').length).toBe(1);
    });

    it('sorts permissions', () => {
      const role = { id: 'test', permissions: [] };
      const updated = addPermissionsToRole(role, ['c', 'a', 'b']);
      expect(updated.permissions).toEqual(['a', 'b', 'c']);
    });
  });

  describe('removePermissionsFromRole', () => {
    it('removes permissions', () => {
      const role = { id: 'test', permissions: ['perm1', 'perm2', 'perm3'] };
      const updated = removePermissionsFromRole(role, ['perm2']);
      expect(updated.permissions).toEqual(['perm1', 'perm3']);
    });

    it('handles non-existent permissions', () => {
      const role = { id: 'test', permissions: ['perm1'] };
      const updated = removePermissionsFromRole(role, ['perm99']);
      expect(updated.permissions).toEqual(['perm1']);
    });
  });

  describe('setRoleBundlePermissions', () => {
    it('replaces bundle permissions', () => {
      const role = {
        id: 'test',
        permissions: [
          'create article content',
          'edit own article content',
          'create page content'
        ]
      };
      const updated = setRoleBundlePermissions(role, 'node', 'article', ['delete any article content']);
      expect(updated.permissions).toContain('delete any article content');
      expect(updated.permissions).not.toContain('create article content');
      expect(updated.permissions).not.toContain('edit own article content');
      expect(updated.permissions).toContain('create page content');
    });
  });

  describe('getRoleSummary', () => {
    it('returns summary', () => {
      const summary = getRoleSummary(testRole);
      expect(summary.id).toBe('test_role');
      expect(summary.label).toBe('Test Role');
      expect(summary.totalPermissions).toBe(6);
      expect(summary.otherPermissions).toBe(2);
    });
  });
});
